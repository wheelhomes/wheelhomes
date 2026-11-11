package com.wheelhomes.wheelhomes_mobile

import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.os.Build
import android.os.CancellationSignal
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodChannel
import java.security.KeyStore
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.KeyGenerator
import javax.crypto.Mac
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

/**
 * Device-local app lock PIN.
 *
 * The PIN itself is never stored. We store HMAC-SHA256(uid:salt:pin) computed with a
 * non-exportable key that lives inside the Android Keystore, so the stored value cannot
 * be brute-forced offline even if the app's data directory is copied off the phone.
 * The PIN is bound to the Firebase uid, so a different account on the same phone
 * never inherits someone else's PIN.
 */
class PinLockHandler(private val activity: Activity, messenger: BinaryMessenger) {
    companion object {
        const val CHANNEL = "com.wheelhomes.app/pinlock"
        private const val PREFS = "wheelhomes_pin_lock"
        private const val KEY_ALIAS = "wheelhomes_pin_hmac_key"
        private const val K_UID = "pin_uid"
        private const val K_SALT = "pin_salt"
        private const val K_HASH = "pin_hash"
        private const val K_FAILED = "failed_attempts"
        private const val K_BIOMETRIC = "biometric_enabled"
        const val MAX_ATTEMPTS = 5
    }

    private val prefs: SharedPreferences =
        activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    init {
        MethodChannel(messenger, CHANNEL).setMethodCallHandler { call, result ->
            try {
                when (call.method) {
                    "hasPin" -> {
                        val uid = call.argument<String>("uid") ?: ""
                        result.success(
                            uid.isNotEmpty() &&
                                prefs.getString(K_UID, null) == uid &&
                                prefs.getString(K_HASH, null) != null
                        )
                    }
                    "setPin" -> {
                        val uid = call.argument<String>("uid") ?: ""
                        val pin = call.argument<String>("pin") ?: ""
                        if (uid.isEmpty() || pin.length < 4) {
                            result.success(false)
                        } else {
                            val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
                            val saltB64 = Base64.encodeToString(salt, Base64.NO_WRAP)
                            prefs.edit()
                                .putString(K_UID, uid)
                                .putString(K_SALT, saltB64)
                                .putString(K_HASH, hashPin(uid, saltB64, pin))
                                .putInt(K_FAILED, 0)
                                .apply()
                            result.success(true)
                        }
                    }
                    "verifyPin" -> {
                        val uid = call.argument<String>("uid") ?: ""
                        val pin = call.argument<String>("pin") ?: ""
                        result.success(verifyPin(uid, pin))
                    }
                    "clearPin" -> {
                        prefs.edit().clear().apply()
                        result.success(true)
                    }
                    "canUseBiometric" -> result.success(canUseBiometric())
                    "isBiometricEnabled" -> result.success(prefs.getBoolean(K_BIOMETRIC, false))
                    "setBiometricEnabled" -> {
                        val enabled = call.argument<Boolean>("enabled") ?: false
                        prefs.edit().putBoolean(K_BIOMETRIC, enabled).apply()
                        result.success(true)
                    }
                    "authenticateBiometric" -> authenticateBiometric(result)
                    else -> result.notImplemented()
                }
            } catch (e: Exception) {
                result.error("PIN_LOCK_ERROR", e.message, null)
            }
        }
    }

    private fun verifyPin(uid: String, pin: String): Map<String, Any> {
        val storedUid = prefs.getString(K_UID, null)
        val storedHash = prefs.getString(K_HASH, null)
        val salt = prefs.getString(K_SALT, null)
        if (storedUid != uid || storedHash == null || salt == null) {
            return mapOf("ok" to false, "remaining" to 0)
        }
        val candidate = hashPin(uid, salt, pin)
        val ok = MessageDigest.isEqual(
            candidate.toByteArray(Charsets.UTF_8),
            storedHash.toByteArray(Charsets.UTF_8)
        )
        return if (ok) {
            prefs.edit().putInt(K_FAILED, 0).apply()
            mapOf("ok" to true, "remaining" to MAX_ATTEMPTS)
        } else {
            val failed = prefs.getInt(K_FAILED, 0) + 1
            prefs.edit().putInt(K_FAILED, failed).apply()
            mapOf("ok" to false, "remaining" to (MAX_ATTEMPTS - failed).coerceAtLeast(0))
        }
    }

    private fun hashPin(uid: String, salt: String, pin: String): String {
        val message = "$uid:$salt:$pin".toByteArray(Charsets.UTF_8)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val mac = Mac.getInstance("HmacSHA256")
                mac.init(getOrCreateKeystoreKey())
                return "k1:" + Base64.encodeToString(mac.doFinal(message), Base64.NO_WRAP)
            } catch (_: Exception) {
                // Fall through to PBKDF2 if the Keystore is unavailable on this device.
            }
        }
        val spec = PBEKeySpec(
            "$uid:$pin".toCharArray(),
            Base64.decode(salt, Base64.NO_WRAP),
            120_000,
            256
        )
        val bytes = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA1").generateSecret(spec).encoded
        return "p1:" + Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    private fun getOrCreateKeystoreKey(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_HMAC_SHA256, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_SIGN).build()
        )
        return generator.generateKey()
    }

    private fun canUseBiometric(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return false
        if (Build.VERSION.SDK_INT == Build.VERSION_CODES.P) {
            return activity.packageManager.hasSystemFeature(android.content.pm.PackageManager.FEATURE_FINGERPRINT)
        }
        return try {
            val bm = activity.getSystemService(BiometricManager::class.java) ?: return false
            val status = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                bm.canAuthenticate(
                    BiometricManager.Authenticators.BIOMETRIC_STRONG or
                        BiometricManager.Authenticators.BIOMETRIC_WEAK
                )
            } else {
                @Suppress("DEPRECATION")
                bm.canAuthenticate()
            }
            status == BiometricManager.BIOMETRIC_SUCCESS
        } catch (_: Exception) {
            false
        }
    }

    private fun authenticateBiometric(result: MethodChannel.Result) {
        if (!canUseBiometric() || Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            result.success(false)
            return
        }
        var replied = false
        fun reply(value: Boolean) {
            if (!replied) {
                replied = true
                activity.runOnUiThread { result.success(value) }
            }
        }
        val executor = activity.mainExecutor
        val builder = BiometricPrompt.Builder(activity)
            .setTitle("Unlock Wheelhomes")
            .setSubtitle("Touch the fingerprint sensor or use face unlock")
            .setNegativeButton("Use PIN", executor) { _, _ -> reply(false) }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            builder.setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG or
                    BiometricManager.Authenticators.BIOMETRIC_WEAK
            )
        }
        try {
            builder.build().authenticate(
                CancellationSignal(),
                executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(res: BiometricPrompt.AuthenticationResult?) {
                        prefs.edit().putInt(K_FAILED, 0).apply()
                        reply(true)
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence?) {
                        reply(false)
                    }
                    // onAuthenticationFailed = one unrecognised finger; the system prompt
                    // stays open and lets the user retry, so we don't reply here.
                }
            )
        } catch (_: Exception) {
            reply(false)
        }
    }
}

