package com.wheelhomes.wheelhomes_mobile

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.media.RingtoneManager
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.provider.Settings
import android.util.Base64
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.concurrent.Executors
import kotlin.concurrent.thread
import kotlin.math.exp
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.PI

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.wheelhomes.app/sound"
    private val NOTIF_CHANNEL_ID = "wheelhomes_alerts_high"
    private var methodChannel: MethodChannel? = null

    @Volatile
    private var isVoiceCallActive = false
    @Volatile
    private var isCallMicMuted = false
    @Volatile
    private var pendingVoiceB64: String? = null
    @Volatile
    private var pendingVoiceRate: Int = 16000
    @Volatile
    private var isPlayerThreadRunning = false
    private var voiceInputRecord: AudioRecord? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        ensureNotificationChannelAndPermission()
        try {
            startService(Intent(this, KeepAliveService::class.java))
        } catch (_: Exception) {}

        val channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
        methodChannel = channel
        channel.setMethodCallHandler { call, result ->
            when (call.method) {
                "playNotificationTune" -> {
                    playWhatsAppChimeAsync()
                    result.success(true)
                }
                "playOutgoingPop" -> {
                    playOutgoingPopAsync()
                    result.success(true)
                }
                "showSystemNotification" -> {
                    val title = call.argument<String>("title") ?: "Wheelhomes Alert"
                    val body = call.argument<String>("body") ?: "You have a new update"
                    val id = call.argument<Int>("id") ?: (System.currentTimeMillis() % 100000).toInt()
                    showAndroidSystemNotification(title, body, id)
                    result.success(true)
                }
                "moveTaskToBack" -> {
                    moveTaskToBack(true)
                    result.success(true)
                }
                "dialPhoneNumber" -> {
                    val phone = (call.argument<String>("phone") ?: "").trim()
                    if (phone.isNotEmpty()) {
                        try {
                            val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
                            startActivity(dialIntent)
                            result.success(true)
                        } catch (_: Exception) {
                            result.success(false)
                        }
                    } else {
                        result.success(false)
                    }
                }
                "setSpeakerOn" -> {
                    val speakerOn = call.argument<Boolean>("speakerOn") ?: false
                    try {
                        val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                        @Suppress("DEPRECATION")
                        am.isSpeakerphoneOn = speakerOn
                        result.success(true)
                    } catch (_: Exception) {
                        result.success(false)
                    }
                }
                "setCallMuted" -> {
                    val muted = call.argument<Boolean>("muted") ?: false
                    isCallMicMuted = muted
                    try {
                        val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
                        am.isMicrophoneMute = muted
                        result.success(true)
                    } catch (_: Exception) {
                        result.success(false)
                    }
                }
                "startVoiceCallAudio" -> {
                    startVoiceCallAudioStream()
                    result.success(true)
                }
                "playVoiceChunk" -> {
                    val b64 = call.argument<String>("b64") ?: ""
                    val rate = call.argument<Int>("rate") ?: 16000
                    if (b64.isNotEmpty()) {
                        playIncomingVoiceChunk(b64, rate)
                    }
                    result.success(true)
                }
                "stopVoiceCallAudio" -> {
                    stopVoiceCallAudioStream()
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun isRunningOnEmulator(): Boolean {
        return (Build.FINGERPRINT.startsWith("generic")
                || Build.FINGERPRINT.lowercase().contains("emulator")
                || Build.MODEL.contains("google_sdk")
                || Build.MODEL.lowercase().contains("gphone")
                || Build.MODEL.contains("Emulator")
                || Build.HARDWARE.contains("goldfish")
                || Build.HARDWARE.contains("ranchu"))
    }

    private fun startVoiceCallAudioStream() {
        stopVoiceCallAudioStream()
        isVoiceCallActive = true
        isCallMicMuted = false
        val sampleRate = 16000

        // Ensure Android media volume is audible
        try {
            val am = getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val maxVol = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            val curVol = am.getStreamVolume(AudioManager.STREAM_MUSIC)
            if (curVol < (maxVol * 0.75).toInt()) {
                am.setStreamVolume(AudioManager.STREAM_MUSIC, (maxVol * 0.9).toInt(), 0)
            }
        } catch (_: Exception) {}

        // Start single real-time playback consumer thread (zero queue backlog)
        if (!isPlayerThreadRunning) {
            isPlayerThreadRunning = true
            thread {
                try {
                    while (isVoiceCallActive) {
                        val b64 = pendingVoiceB64
                        if (b64 == null) {
                            Thread.sleep(20)
                            continue
                        }
                        pendingVoiceB64 = null
                        val rate = pendingVoiceRate
                        playPcmStaticImmediate(b64, rate)
                    }
                } catch (_: Exception) {
                } finally {
                    isPlayerThreadRunning = false
                }
            }
        }

        // On the Android 16KB emulator (gphone16k), opening AudioRecord crashes media.audio_flinger,
        // which kills AudioTrack speaker output. Only open hardware AudioRecord on physical phones.
        if (isRunningOnEmulator()) {
            return
        }

        thread {
            var recorder: AudioRecord? = null
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
                    checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED
                ) {
                    return@thread
                }
                val chunkShorts = 7200 // 450ms at 16000Hz
                val minInBuf = AudioRecord.getMinBufferSize(
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT
                ).coerceAtLeast(chunkShorts * 4)

                recorder = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    sampleRate,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    minInBuf
                )
                if (recorder.state != AudioRecord.STATE_INITIALIZED) {
                    recorder.release()
                    return@thread
                }
                voiceInputRecord = recorder
                recorder.startRecording()

                val shortBuf = ShortArray(chunkShorts)
                val outBytes = ByteArray(chunkShorts * 2)
                while (isVoiceCallActive) {
                    var offset = 0
                    while (offset < chunkShorts && isVoiceCallActive) {
                        val read = recorder.read(shortBuf, offset, chunkShorts - offset)
                        if (read <= 0) break
                        offset += read
                    }
                    if (!isVoiceCallActive || isCallMicMuted || offset < chunkShorts) continue

                    var rawSumSq = 0.0
                    for (i in 0 until offset) {
                        val rawNorm = shortBuf[i].toDouble() / 32768.0
                        rawSumSq += rawNorm * rawNorm
                        val boosted = (shortBuf[i].toInt() * 2).coerceIn(-32767, 32767).toShort()
                        outBytes[i * 2] = (boosted.toInt() and 0xFF).toByte()
                        outBytes[i * 2 + 1] = ((boosted.toInt() shr 8) and 0xFF).toByte()
                    }
                    val rms = sqrt(rawSumSq / offset)
                    if (rms > 0.006) {
                        val b64 = Base64.encodeToString(outBytes, 0, offset * 2, Base64.NO_WRAP)
                        runOnUiThread {
                            if (isVoiceCallActive) {
                                methodChannel?.invokeMethod("onLocalVoiceChunk", b64)
                            }
                        }
                    }
                }
            } catch (_: Exception) {
            } finally {
                try {
                    recorder?.stop()
                } catch (_: Exception) {}
                try {
                    recorder?.release()
                } catch (_: Exception) {}
                if (voiceInputRecord === recorder) {
                    voiceInputRecord = null
                }
            }
        }
    }

    private fun playIncomingVoiceChunk(b64: String, rate: Int = 16000) {
        if (!isVoiceCallActive) {
            startVoiceCallAudioStream()
        }
        pendingVoiceRate = if (rate > 0) rate else 16000
        pendingVoiceB64 = b64
    }

    private fun playPcmStaticImmediate(b64: String, rate: Int) {
        try {
            val pcmBytes = Base64.decode(b64, Base64.DEFAULT)
            val inSamples = pcmBytes.size / 2
            if (inSamples <= 0 || !isVoiceCallActive) return

            val inShorts = ShortArray(inSamples)
            for (i in 0 until inSamples) {
                val lo = pcmBytes[i * 2].toInt() and 0xFF
                val hi = pcmBytes[i * 2 + 1].toInt() shl 8
                inShorts[i] = (hi or lo).toShort()
            }

            val outRate = 22050
            val inRate = rate.toDouble()
            val outSamples = ((inSamples.toDouble() * outRate) / inRate).toInt()
            val outShorts = ShortArray(outSamples)
            val fadeLen = min(80, outSamples / 10).coerceAtLeast(1)

            for (i in 0 until outSamples) {
                val srcPos = (i.toDouble() * inRate) / outRate
                val idx0 = srcPos.toInt().coerceIn(0, inSamples - 1)
                val idx1 = (idx0 + 1).coerceIn(0, inSamples - 1)
                val frac = srcPos - idx0
                val interp = inShorts[idx0] * (1.0 - frac) + inShorts[idx1] * frac

                var env = 2.5
                if (i < fadeLen) {
                    env *= (i.toDouble() / fadeLen)
                } else if (i > outSamples - fadeLen) {
                    env *= ((outSamples - i).toDouble() / fadeLen)
                }

                val amplified = (interp * env).toInt().coerceIn(-32767, 32767)
                outShorts[i] = amplified.toShort()
            }

            val track = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(outRate)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(outShorts.size * 2)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .build()

            track.write(outShorts, 0, outShorts.size)
            track.play()
            val durationMs = ((outSamples * 1000L) / outRate).coerceIn(50L, 1000L)
            Thread.sleep(durationMs)
            track.release()
        } catch (_: Exception) {}
    }

    private fun stopVoiceCallAudioStream() {
        isVoiceCallActive = false
        isCallMicMuted = false
        pendingVoiceB64 = null
        val rec = voiceInputRecord
        voiceInputRecord = null
        if (rec != null) {
            thread {
                try {
                    rec.stop()
                } catch (_: Exception) {}
                try {
                    rec.release()
                } catch (_: Exception) {}
            }
        }
    }

    private fun ensureNotificationChannelAndPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val channel = NotificationChannel(
                    NOTIF_CHANNEL_ID,
                    "Wheelhomes Alerts & Chat",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Real-time chat messages, job status updates, and escrow alerts"
                    enableVibration(true)
                }
                manager.createNotificationChannel(channel)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val needed = mutableListOf<String>()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                    checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                ) {
                    needed.add(Manifest.permission.POST_NOTIFICATIONS)
                }
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    needed.add(Manifest.permission.RECORD_AUDIO)
                }
                if (needed.isNotEmpty()) {
                    requestPermissions(needed.toTypedArray(), 1001)
                }
            }
        } catch (_: Exception) {}
    }

    private fun showAndroidSystemNotification(title: String, body: String, notifId: Int) {
        try {
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val launchIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getActivity(this, notifId, launchIntent, pendingFlags)

            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(this, NOTIF_CHANNEL_ID)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(this).setPriority(Notification.PRIORITY_HIGH)
            }

            val notification = builder
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(Notification.BigTextStyle().bigText(body))
                .setCategory(Notification.CATEGORY_MESSAGE)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()

            manager.notify(notifId, notification)
        } catch (_: Exception) {}
    }

    /**
     * Synthesizes and plays the crisp two-tone WhatsApp-style chime (G5 -> D6)
     * directly over USAGE_MEDIA so it is 100% audible on both emulators and physical phones.
     */
    private fun playWhatsAppChimeAsync() {
        thread {
            try {
                val sampleRate = 22050
                val durationSec = 0.48
                val numSamples = (sampleRate * durationSec).toInt()
                val pcm = ShortArray(numSamples)

                for (i in 0 until numSamples) {
                    val t = i.toDouble() / sampleRate
                    var sample = 0.0

                    // Note 1: G5 (783.99 Hz) from 0.00s to 0.16s
                    if (t < 0.16) {
                        val env1 = sin((min(t, 0.015) / 0.015) * (PI / 2.0)) * exp(-t * 18.0)
                        sample += sin(2.0 * PI * 783.99 * t) * env1 * 0.55
                        sample += sin(2.0 * PI * 1567.98 * t) * env1 * 0.15
                    }

                    // Note 2: D6 (1174.66 Hz) from 0.10s to 0.48s
                    if (t >= 0.10) {
                        val t2 = t - 0.10
                        val env2 = sin((min(t2, 0.015) / 0.015) * (PI / 2.0)) * exp(-t2 * 9.5)
                        sample += sin(2.0 * PI * 1174.66 * t2) * env2 * 0.65
                        sample += sin(2.0 * PI * 2349.32 * t2) * env2 * 0.18
                    }

                    val clamped = sample.coerceIn(-1.0, 1.0)
                    pcm[i] = (clamped * 32767.0).toInt().toShort()
                }

                val track = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(sampleRate)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(pcm.size * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()

                track.write(pcm, 0, pcm.size)
                track.play()
                Thread.sleep(550)
                track.release()
            } catch (_: Exception) {
                try {
                    val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                    val ringtone = RingtoneManager.getRingtone(applicationContext, uri)
                    ringtone?.play()
                } catch (_: Exception) {}
            }
        }
    }

    private fun playOutgoingPopAsync() {
        thread {
            try {
                val sampleRate = 22050
                val durationSec = 0.08
                val numSamples = (sampleRate * durationSec).toInt()
                val pcm = ShortArray(numSamples)

                for (i in 0 until numSamples) {
                    val t = i.toDouble() / sampleRate
                    val freq = 420.0 + (300.0 * (t / durationSec))
                    val env = sin((min(t, 0.012) / 0.012) * (PI / 2.0)) * exp(-t * 38.0)
                    val sample = (sin(2.0 * PI * freq * t) * env * 0.35).coerceIn(-1.0, 1.0)
                    pcm[i] = (sample * 32767.0).toInt().toShort()
                }

                val track = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(sampleRate)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(pcm.size * 2)
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()

                track.write(pcm, 0, pcm.size)
                track.play()
                Thread.sleep(110)
                track.release()
            } catch (_: Exception) {}
        }
    }
}

/**
 * Lightweight background service that keeps the app process and network socket active
 * when the user minimizes the app to the home screen or notification shade.
 */
class KeepAliveService : Service() {
    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null

    override fun onCreate() {
        super.onCreate()
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Wheelhomes::RealtimeAlertLock").apply {
                setReferenceCounted(false)
                acquire()
            }
            val wm = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            @Suppress("DEPRECATION")
            val lockMode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                WifiManager.WIFI_MODE_FULL_LOW_LATENCY
            } else {
                WifiManager.WIFI_MODE_FULL_HIGH_PERF
            }
            wifiLock = wm.createWifiLock(lockMode, "Wheelhomes::RealtimeWifiLock").apply {
                setReferenceCounted(false)
                acquire()
            }
        } catch (_: Exception) {}
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onDestroy() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            if (wifiLock?.isHeld == true) {
                wifiLock?.release()
            }
        } catch (_: Exception) {}
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
