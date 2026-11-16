package com.wheelhomes.wheelhomes_mobile

import android.app.Activity
import android.content.Context
import android.content.SharedPreferences
import android.content.pm.PackageManager
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
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.Mac
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec

/**
 * Device-local app lock PIN & encrypted session keeper.
 *
 * - Stores HMAC-SHA256(uid:salt:pin) using an AndroidKeyStore key.
 * - Uses synchronous `.commit()` so closing the app immediately after setting a PIN
 *   never loses the saved PIN.
 * - Also stores AndroidKeyStore AES-GCM encrypted login credentials so that if
 *   Firebase Auth is cold-starting or loses its token while a PIN is active,
 *   unlocking with the PIN/Fingerprint seamlessly restores the session without
 *   ever prompting for email & password unless the user explicitly signs out.
 */
class PinLockHandler(private val activity: Activity, messenger: BinaryMessenger) {
    companion object {
        const val CHANNEL = "com.wheelhomes.app/pinlock"
        private const val PREFS = "wheelhomes_pin_lock"
        private const val KEY_ALIAS = "wheelhomes_pin_hmac_key"
        private const val AES_KEY_ALIAS = "wheelhomes_pin_aes_key"
        private const val K_UID = "pin_uid"
        private const val K_EMAIL = "pin_email"
        private const val K_NAME = "pin_name"
        private const val K_ENC_PASS = "pin_enc_pass"
        private const val K_SALT = "pin_salt"
        private const val K_HASH = "pin_hash"
        private const val K_FAILED = "failed_attempts"
        private const val K_BIOMETRIC = "biometric_enabled"
        const val MAX_ATTEMPTS = 5
    }

    private val prefs: SharedPreferences =
        activity.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val channel = MethodChannel(messenger, CHANNEL)

    init {
        channel.setMethodCallHandler { call, result ->
            try {
                when (call.method) {
                    "getPinMeta" -> {
                        val storedUid = prefs.getString(K_UID, null) ?: ""
                        val storedHash = prefs.getString(K_HASH, null)
                        val hasPin = storedUid.isNotEmpty() && !storedHash.isNullOrEmpty()
                        val canBio = canUseBiometric()
                        val bioEnabled = prefs.getBoolean(K_BIOMETRIC, false) && canBio
                        result.success(
                            mapOf(
                                "hasPin" to hasPin,
                                "uid" to storedUid,
                                "email" to (prefs.getString(K_EMAIL, "") ?: ""),
                                "name" to (prefs.getString(K_NAME, "") ?: ""),
                                "canUseBiometric" to canBio,
                                "biometricEnabled" to bioEnabled
                            )
                        )
                    }
                    "saveCredentials" -> {
                        val uid = (call.argument<String>("uid") ?: "").trim()
                        val email = (call.argument<String>("email") ?: "").trim()
                        val password = call.argument<String>("password") ?: ""
                        val name = (call.argument<String>("name") ?: "").trim()
                        val editor = prefs.edit()
                        if (uid.isNotEmpty()) editor.putString(K_UID, uid)
                        if (email.isNotEmpty()) editor.putString(K_EMAIL, email)
                        if (name.isNotEmpty()) editor.putString(K_NAME, name)
                        if (password.isNotEmpty()) {
                            encryptSecret(password)?.let { editor.putString(K_ENC_PASS, it) }
                        }
                        editor.commit()
                        result.success(true)
                    }
                    "hasPin" -> {
                        val uid = call.argument<String>("uid") ?: ""
                        val storedUid = prefs.getString(K_UID, null) ?: ""
                        val storedHash = prefs.getString(K_HASH, null)
                        result.success(
                            !storedHash.isNullOrEmpty() &&
                                (uid.isEmpty() || storedUid == uid || storedUid.isNotEmpty())
                        )
                    }
                    "setPin" -> {
                        val uid = (call.argument<String>("uid") ?: "").trim()
                        val pin = (call.argument<String>("pin") ?: "").trim()
                        val email = (call.argument<String>("email") ?: "").trim()
                        val name = (call.argument<String>("name") ?: "").trim()
                        val effectiveUid = uid.ifEmpty { prefs.getString(K_UID, "") ?: "" }
                        if (effectiveUid.isEmpty() || pin.length < 4) {
                            result.success(false)
                        } else {
                            val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
                            val saltB64 = Base64.encodeToString(salt, Base64.NO_WRAP)
                            val editor = prefs.edit()
                                .putString(K_UID, effectiveUid)
                                .putString(K_SALT, saltB64)
                                .putString(K_HASH, hashPin(effectiveUid, saltB64, pin))
                                .putInt(K_FAILED, 0)
                            if (email.isNotEmpty()) editor.putString(K_EMAIL, email)
                            if (name.isNotEmpty()) editor.putString(K_NAME, name)
                            editor.commit()
                            result.success(true)
                        }
                    }
                    "verifyPin" -> {
                        val uid = call.argument<String>("uid") ?: ""
                        val pin = call.argument<String>("pin") ?: ""
                        result.success(verifyPin(uid, pin))
                    }
                    "clearPin" -> {
                        prefs.edit().clear().commit()
                        result.success(true)
                    }
                    "canUseBiometric" -> result.success(canUseBiometric())
                    "isBiometricEnabled" -> result.success(prefs.getBoolean(K_BIOMETRIC, false))
                    "setBiometricEnabled" -> {
                        val enabled = call.argument<Boolean>("enabled") ?: false
                        prefs.edit().putBoolean(K_BIOMETRIC, enabled).commit()
                        result.success(true)
                    }
                    "authenticateBiometric" -> authenticateBiometric(result)
                    "getSavedCredentials" -> {
                        val email = prefs.getString(K_EMAIL, "") ?: ""
                        val encPass = prefs.getString(K_ENC_PASS, null)
                        val password = if (encPass != null) decryptSecret(encPass) ?: "" else ""
                        result.success(
                            mapOf(
                                "email" to email,
                                "password" to password,
                                "uid" to (prefs.getString(K_UID, "") ?: "")
                            )
                        )
                    }
                    else -> result.notImplemented()
                }
            } catch (e: Exception) {
                result.error("PIN_LOCK_ERROR", e.message, null)
            }
        }
    }

    private fun verifyPin(uid: String, pin: String): Map<String, Any> {
        val storedUid = prefs.getString(K_UID, null) ?: ""
        val storedHash = prefs.getString(K_HASH, null)
        val salt = prefs.getString(K_SALT, null)
        if (storedUid.isEmpty() || storedHash == null || salt == null) {
            return mapOf("ok" to false, "remaining" to 0)
        }
        val targetUid = storedUid
        val candidate = hashPin(targetUid, salt, pin)
        var ok = MessageDigest.isEqual(
            candidate.toByteArray(Charsets.UTF_8),
            storedHash.toByteArray(Charsets.UTF_8)
        )
        if (!ok && storedHash.startsWith("k1:")) {
            // Fallback check in case Keystore key was rotated by OS
            val fallback = hashPinPbkdf2(targetUid, salt, pin)
            ok = MessageDigest.isEqual(
                fallback.toByteArray(Charsets.UTF_8),
                storedHash.toByteArray(Charsets.UTF_8)
            )
        }
        return if (ok) {
            prefs.edit().putInt(K_FAILED, 0).commit()
            val email = prefs.getString(K_EMAIL, "") ?: ""
            val encPass = prefs.getString(K_ENC_PASS, null)
            val password = if (encPass != null) decryptSecret(encPass) ?: "" else ""
            mapOf(
                "ok" to true,
                "remaining" to MAX_ATTEMPTS,
                "email" to email,
                "password" to password,
                "uid" to storedUid
            )
        } else {
            val failed = prefs.getInt(K_FAILED, 0) + 1
            prefs.edit().putInt(K_FAILED, failed).commit()
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
        return hashPinPbkdf2(uid, salt, pin)
    }

    private fun hashPinPbkdf2(uid: String, salt: String, pin: String): String {
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

    private fun getOrCreateAesKey(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(AES_KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                AES_KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build()
        )
        return generator.generateKey()
    }

    private fun encryptSecret(plain: String): String? {
        return try {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateAesKey())
            val iv = cipher.iv
            val cipherBytes = cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
            Base64.encodeToString(iv, Base64.NO_WRAP) + ":" +
                Base64.encodeToString(cipherBytes, Base64.NO_WRAP)
        } catch (_: Exception) {
            null
        }
    }

    private fun decryptSecret(packed: String): String? {
        return try {
            val parts = packed.split(":")
            if (parts.size != 2) return null
            val iv = Base64.decode(parts[0], Base64.NO_WRAP)
            val cipherBytes = Base64.decode(parts[1], Base64.NO_WRAP)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateAesKey(), GCMParameterSpec(128, iv))
            String(cipher.doFinal(cipherBytes), Charsets.UTF_8)
        } catch (_: Exception) {
            null
        }
    }

    private fun canUseBiometric(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return false
        if (Build.VERSION.SDK_INT == Build.VERSION_CODES.P) {
            return activity.packageManager.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT)
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
                        prefs.edit().putInt(K_FAILED, 0).commit()
                        reply(true)
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence?) {
                        reply(false)
                    }
                }
            )
        } catch (_: Exception) {
            reply(false)
        }
    }
}
