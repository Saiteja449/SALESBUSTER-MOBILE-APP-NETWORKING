package com.salesbusterai

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioDeviceInfo
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.media.audiofx.AcousticEchoCanceler
import android.media.audiofx.NoiseSuppressor
import android.os.Build
import android.os.Process
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import kotlin.concurrent.thread
import kotlin.math.sqrt

/**
 * Native Android Audio Streaming Bridge for Gemini Multimodal Live API:
 * 1. Captures 16,000 Hz 16-bit Mono PCM from microphone with hardware AEC/noise cancellation
 * 2. Emits Base64 chunks and input volume (0.0 to 1.0) to React Native
 * 3. Receives 24,000 Hz 16-bit Mono PCM chunks from Gemini and plays via AudioTrack with instant flush
 * 4. Routes playback to Loudspeaker (Speaker) by default via USAGE_MEDIA with optional earpiece switching
 */
class GeminiVoiceAudioModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val MODULE_NAME = "GeminiVoiceAudioModule"
        private const val INPUT_SAMPLE_RATE = 16000
        private const val OUTPUT_SAMPLE_RATE = 24000
        // Buffer ~450ms initially and ~180ms on mid-stream underrun so network/bridge
        // jitter does not cause AudioTrack clicks or stuttering.
        private const val PLAYBACK_PREBUFFER_BYTES = OUTPUT_SAMPLE_RATE * 2 * 450 / 1000
        private const val PLAYBACK_REBUFFER_BYTES = OUTPUT_SAMPLE_RATE * 2 * 180 / 1000
    }

    override fun getName(): String = MODULE_NAME

    // Recording State
    private var audioRecord: AudioRecord? = null
    private var acousticEchoCanceler: AcousticEchoCanceler? = null
    private var noiseSuppressor: NoiseSuppressor? = null
    private var isRecording = false
    private var isMuted = false
    private var useAudioEffects = true
    private var recordingThread: Thread? = null
    @Volatile private var captureToFile = false
    private var capturedPcmFile: java.io.File? = null
    private var capturedPcmStream: java.io.RandomAccessFile? = null
    private var capturedPcmBytes = 0L
    private var capturedPcmStartTime = 0L

    // Playback State
    private var audioTrack: AudioTrack? = null
    private var isPlaying = false
    private var isSpeakerOn = true
    private val playbackQueue = LinkedBlockingQueue<ByteArray>()
    private val queuedBytesCount = AtomicInteger(0)
    private var audioFocusRequest: AudioFocusRequest? = null
    private var lastVolumeEmitTime = 0L
    @Volatile private var hasPlayedInCurrentTurn = false
    @Volatile private var turnCompleteRequested = false
    @Volatile private var playbackGeneration = 0
    private var playbackThread: Thread? = null

    private fun sendEvent(eventName: String, params: Any?) {
        if (!reactContext.hasActiveReactInstance()) return
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            // Ignore if context deallocated
        }
    }

    private fun applyAudioRouting() {
        if (!useAudioEffects) {
            // In event-capture / silent sessions, do not force MODE_IN_COMMUNICATION.
            // Leave mode as MODE_NORMAL so input recording is unaffected by VoIP DSP.
            return
        }
        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
            if (isSpeakerOn) {
                audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val speaker = audioManager.availableCommunicationDevices.firstOrNull {
                        it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
                    }
                    val routed = speaker != null && audioManager.setCommunicationDevice(speaker)
                    if (!routed) {
                        @Suppress("DEPRECATION")
                        audioManager.isSpeakerphoneOn = true
                    }
                } else {
                    @Suppress("DEPRECATION")
                    audioManager.isSpeakerphoneOn = true
                }
            } else {
                audioManager.mode = AudioManager.MODE_IN_COMMUNICATION
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val earpiece = audioManager.availableCommunicationDevices.firstOrNull {
                        it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE
                    }
                    if (earpiece != null) {
                        audioManager.setCommunicationDevice(earpiece)
                    }
                } else {
                    @Suppress("DEPRECATION")
                    audioManager.isSpeakerphoneOn = false
                }
            }
        } catch (e: Exception) {
            // Log or ignore routing error
        }
    }

    @ReactMethod
    fun setSpeakerphone(enabled: Boolean, promise: Promise) {
        try {
            if (isSpeakerOn == enabled) {
                promise.resolve(isSpeakerOn)
                return
            }

            isSpeakerOn = enabled

            // If active AudioTrack exists, recreate it with new usage attributes
            val existing = audioTrack
            if (existing != null) {
                try {
                    if (existing.state == AudioTrack.STATE_INITIALIZED) {
                        existing.pause()
                        existing.flush()
                        existing.stop()
                    }
                    existing.release()
                } catch (e: Exception) {}
                audioTrack = null
                ensureAudioTrackInitialized()
            } else {
                applyAudioRouting()
            }

            promise.resolve(isSpeakerOn)
        } catch (e: Exception) {
            promise.reject("SET_SPEAKER_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isSpeakerphoneOn(promise: Promise) {
        promise.resolve(isSpeakerOn)
    }

    @ReactMethod
    fun setUseAudioEffects(enabled: Boolean) {
        useAudioEffects = enabled
    }

    @ReactMethod
    fun setCaptureToFile(enabled: Boolean) {
        captureToFile = enabled
    }

    @ReactMethod
    fun deleteCapturedAudioFile(filePath: String, promise: Promise) {
        try {
            val cacheRoot = reactContext.cacheDir.canonicalPath + java.io.File.separator
            val target = java.io.File(filePath).canonicalFile
            if (!target.path.startsWith(cacheRoot)) {
                promise.reject("INVALID_CAPTURE_PATH", "Captured audio path is outside app cache")
                return
            }
            promise.resolve(!target.exists() || target.delete())
        } catch (e: Exception) {
            promise.reject("DELETE_CAPTURE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun startRecording(promise: Promise) {
        if (isRecording) {
            promise.resolve(true)
            return
        }

        try {
            val minBufferSize = AudioRecord.getMinBufferSize(
                INPUT_SAMPLE_RATE,
                AudioFormat.CHANNEL_IN_MONO,
                AudioFormat.ENCODING_PCM_16BIT
            )
            val bufferSize = maxOf(minBufferSize, 4096)

            // For interactive BI voice (useAudioEffects=true), prefer VOICE_COMMUNICATION so
            // hardware AEC cancels loudspeaker echo and avoids false VAD barge-in / DSP ducking.
            // For event capture (useAudioEffects=false), keep VOICE_RECOGNITION first.
            val preferredSources = if (useAudioEffects) {
                intArrayOf(
                    MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                    MediaRecorder.AudioSource.VOICE_RECOGNITION,
                    MediaRecorder.AudioSource.MIC
                )
            } else {
                intArrayOf(
                    MediaRecorder.AudioSource.VOICE_RECOGNITION,
                    MediaRecorder.AudioSource.VOICE_COMMUNICATION,
                    MediaRecorder.AudioSource.MIC
                )
            }

            var record: AudioRecord? = null
            for (source in preferredSources) {
                try {
                    val candidate = AudioRecord(
                        source,
                        INPUT_SAMPLE_RATE,
                        AudioFormat.CHANNEL_IN_MONO,
                        AudioFormat.ENCODING_PCM_16BIT,
                        bufferSize
                    )
                    if (candidate.state == AudioRecord.STATE_INITIALIZED) {
                        record = candidate
                        break
                    } else {
                        candidate.release()
                    }
                } catch (e: Exception) {
                    // Try next audio source
                }
            }

            if (record == null || record.state != AudioRecord.STATE_INITIALIZED) {
                promise.reject("INIT_FAILED", "Failed to initialize native AudioRecord")
                return
            }

            audioRecord = record
            if (useAudioEffects) {
                if (AcousticEchoCanceler.isAvailable()) {
                    try {
                        acousticEchoCanceler = AcousticEchoCanceler.create(record.audioSessionId)?.apply {
                            enabled = true
                        }
                    } catch (e: Exception) {
                        acousticEchoCanceler = null
                    }
                }
                if (NoiseSuppressor.isAvailable()) {
                    try {
                        noiseSuppressor = NoiseSuppressor.create(record.audioSessionId)?.apply {
                            enabled = true
                        }
                    } catch (e: Exception) {
                        noiseSuppressor = null
                    }
                }
            } else {
                acousticEchoCanceler = null
                noiseSuppressor = null
            }
            applyAudioRouting()
            record.startRecording()
            isRecording = true
            isMuted = false
            if (captureToFile) {
                capturedPcmFile = java.io.File(reactContext.cacheDir, "guest_voice_${System.currentTimeMillis()}.wav")
                capturedPcmStream = java.io.RandomAccessFile(capturedPcmFile, "rw").apply {
                    setLength(0)
                    write(ByteArray(44))
                }
                capturedPcmBytes = 0L
                capturedPcmStartTime = System.currentTimeMillis()
            }

            val sourceName = when (record.audioSource) {
                MediaRecorder.AudioSource.VOICE_RECOGNITION -> "VOICE_RECOGNITION"
                MediaRecorder.AudioSource.VOICE_COMMUNICATION -> "VOICE_COMMUNICATION"
                MediaRecorder.AudioSource.MIC -> "MIC"
                else -> "SOURCE_${record.audioSource}"
            }
            val chunkSizeMs = 2048 / (2 * 16)
            android.util.Log.d(
                MODULE_NAME,
                "[VOICE-DIAG] AudioRecord source chosen: $sourceName (${record.audioSource}), effects=$useAudioEffects, sampleRate=${record.sampleRate}, bufferSize=$bufferSize, chunkSize=2048 bytes ($chunkSizeMs ms)"
            )

            recordingThread = thread(start = true, name = "GeminiLiveVoiceRecorder") {
                try {
                    Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
                } catch (_: Exception) {}
                // Buffer of 2048 bytes (1024 samples = 64ms at 16kHz) halves bridge traffic
                val buffer = ByteArray(2048)
                var lastInputVolEmitTime = 0L
                var lastPeakLogTime = System.currentTimeMillis()
                var currentSecondPeakAmplitude = 0

                while (isRecording) {
                    val bytesRead = audioRecord?.read(buffer, 0, buffer.size) ?: -1
                    if (bytesRead > 0) {
                        val numSamples = bytesRead / 2
                        if (captureToFile) {
                            try {
                                capturedPcmStream?.write(buffer, 0, bytesRead)
                                capturedPcmBytes += bytesRead
                            } catch (e: Exception) {
                                android.util.Log.e(MODULE_NAME, "Failed writing guest voice capture", e)
                            }
                        }

                        // Track peak 16-bit PCM amplitude for per-second Log.d
                        for (i in 0 until numSamples) {
                            val sample = ((buffer[i * 2 + 1].toInt() shl 8) or (buffer[i * 2].toInt() and 0xFF)).toShort().toInt()
                            val absVal = kotlin.math.abs(sample)
                            if (absVal > currentSecondPeakAmplitude) {
                                currentSecondPeakAmplitude = absVal
                            }
                        }

                        val now = System.currentTimeMillis()
                        if (now - lastPeakLogTime >= 1000) {
                            android.util.Log.d(
                                MODULE_NAME,
                                "[VOICE-DIAG] AudioRecord peak amplitude (1s): $currentSecondPeakAmplitude (source=$sourceName, effects=$useAudioEffects)"
                            )
                            lastPeakLogTime = now
                            currentSecondPeakAmplitude = 0
                        }

                        // Throttle input volume emission to at most once per 100ms (prevents JS bridge congestion)
                        if (now - lastInputVolEmitTime > 100) {
                            lastInputVolEmitTime = now
                            var sum = 0.0
                            for (i in 0 until numSamples) {
                                val sample = ((buffer[i * 2 + 1].toInt() shl 8) or (buffer[i * 2].toInt() and 0xFF)).toShort().toDouble()
                                sum += sample * sample
                            }
                            val rms = sqrt(sum / numSamples) / 32768.0
                            val volume = (rms * 3.5).coerceIn(0.0, 1.0)

                            val volumeMap = Arguments.createMap().apply {
                                putDouble("inputVolume", volume)
                            }
                            sendEvent("onVolumeChange", volumeMap)
                        }

                        // Emit audio chunk immediately without bridge delay
                        if (!isMuted) {
                            val base64Chunk = Base64.encodeToString(buffer, 0, bytesRead, Base64.NO_WRAP)
                            sendEvent("onAudioChunk", base64Chunk)
                        }
                    }
                }
            }

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("RECORD_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        try {
            isRecording = false
            val activeRecordingThread = recordingThread
            recordingThread = null

            acousticEchoCanceler?.apply {
                try {
                    enabled = false
                    release()
                } catch (e: Exception) {}
            }
            acousticEchoCanceler = null

            noiseSuppressor?.apply {
                try {
                    enabled = false
                    release()
                } catch (e: Exception) {}
            }
            noiseSuppressor = null

            audioRecord?.apply {
                if (state == AudioRecord.STATE_INITIALIZED) {
                    stop()
                }
                release()
            }
            audioRecord = null
            activeRecordingThread?.join(500)

            val captureFile = capturedPcmFile
            val captureBytes = capturedPcmBytes
            val captureDuration = if (capturedPcmStartTime > 0) System.currentTimeMillis() - capturedPcmStartTime else 0L
            capturedPcmStream?.let { stream ->
                try {
                    stream.seek(0)
                    stream.writeBytes("RIFF")
                    writeLittleEndianInt(stream, (36 + captureBytes).toInt())
                    stream.writeBytes("WAVE")
                    stream.writeBytes("fmt ")
                    writeLittleEndianInt(stream, 16)
                    writeLittleEndianShort(stream, 1)
                    writeLittleEndianShort(stream, 1)
                    writeLittleEndianInt(stream, INPUT_SAMPLE_RATE)
                    writeLittleEndianInt(stream, INPUT_SAMPLE_RATE * 2)
                    writeLittleEndianShort(stream, 2)
                    writeLittleEndianShort(stream, 16)
                    stream.writeBytes("data")
                    writeLittleEndianInt(stream, captureBytes.toInt())
                } finally {
                    stream.close()
                }
            }
            capturedPcmStream = null
            captureToFile = false
            capturedPcmFile = null
            capturedPcmBytes = 0L
            capturedPcmStartTime = 0L
            if (captureFile != null && captureFile.exists() && captureBytes > 0) {
                promise.resolve(Arguments.createMap().apply {
                    putString("filePath", captureFile.absolutePath)
                    putDouble("durationMs", captureDuration.toDouble())
                    putDouble("sizeBytes", captureFile.length().toDouble())
                })
            } else {
                captureFile?.delete()
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    private fun writeLittleEndianInt(file: java.io.RandomAccessFile, value: Int) {
        file.write(value and 0xFF)
        file.write((value shr 8) and 0xFF)
        file.write((value shr 16) and 0xFF)
        file.write((value shr 24) and 0xFF)
    }

    private fun writeLittleEndianShort(file: java.io.RandomAccessFile, value: Int) {
        file.write(value and 0xFF)
        file.write((value shr 8) and 0xFF)
    }

    @ReactMethod
    fun setMuted(muted: Boolean) {
        isMuted = muted
    }

    private fun requestAudioFocus(attributes: AudioAttributes) {
        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (audioFocusRequest == null) {
                    val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                        .setAudioAttributes(attributes)
                        .setAcceptsDelayedFocusGain(false)
                        .build()
                    audioFocusRequest = req
                    audioManager.requestAudioFocus(req)
                }
            } else {
                @Suppress("DEPRECATION")
                audioManager.requestAudioFocus(
                    null,
                    AudioManager.STREAM_VOICE_CALL,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
                )
            }
        } catch (_: Exception) {}
    }

    private fun abandonAudioFocus() {
        try {
            val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
                audioFocusRequest = null
            } else {
                @Suppress("DEPRECATION")
                audioManager.abandonAudioFocus(null)
            }
        } catch (_: Exception) {}
    }

    private fun ensureAudioTrackInitialized(): AudioTrack {
        val existing = audioTrack
        if (existing != null && existing.state == AudioTrack.STATE_INITIALIZED) {
            return existing
        }

        val minBufferSize = AudioTrack.getMinBufferSize(
            OUTPUT_SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT
        )
        val bufferSize = maxOf(minBufferSize * 6, 49152)

        val attributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()

        val format = AudioFormat.Builder()
            .setSampleRate(OUTPUT_SAMPLE_RATE)
            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .build()

        val track = AudioTrack(
            attributes,
            format,
            bufferSize,
            AudioTrack.MODE_STREAM,
            AudioManager.AUDIO_SESSION_ID_GENERATE
        )

        requestAudioFocus(attributes)
        applyAudioRouting()
        track.play()
        audioTrack = track
        startPlaybackWorker()
        return track
    }

    private fun startPlaybackWorker() {
        if (isPlaying) return
        isPlaying = true

        playbackThread = thread(start = true, name = "GeminiLiveVoicePlayer") {
            try {
                Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
            } catch (_: Exception) {}
            var isBuffering = true
            var requiredBufferBytes = PLAYBACK_PREBUFFER_BYTES
            var emptyPolls = 0
            var turnStartPlaybackHead = 0
            var framesWrittenThisTurn = 0L
            var workerGeneration = playbackGeneration
            while (isPlaying) {
                if (workerGeneration != playbackGeneration) {
                    workerGeneration = playbackGeneration
                    isBuffering = true
                    requiredBufferBytes = PLAYBACK_PREBUFFER_BYTES
                    emptyPolls = 0
                    turnStartPlaybackHead = 0
                    framesWrittenThisTurn = 0L
                }

                // Accumulate jitter buffer before starting (or after a mid-stream underrun).
                // For short/completed turns, turnCompleteRequested lets us drain immediately.
                if (isBuffering) {
                    val queuedBytes = queuedBytesCount.get()
                    if (queuedBytes == 0 || (queuedBytes < requiredBufferBytes && !turnCompleteRequested)) {
                        try {
                            Thread.sleep(10)
                        } catch (e: InterruptedException) {
                            break
                        }
                        continue
                    }
                    val track = audioTrack
                    if (turnStartPlaybackHead == 0 && framesWrittenThisTurn == 0L) {
                        turnStartPlaybackHead = track?.playbackHeadPosition ?: 0
                    }
                    emptyPolls = 0
                    isBuffering = false
                }

                val chunk = try {
                    playbackQueue.poll(60, TimeUnit.MILLISECONDS)
                } catch (e: InterruptedException) {
                    break
                }

                if (chunk != null && chunk.isNotEmpty()) {
                    queuedBytesCount.addAndGet(-chunk.size)
                    emptyPolls = 0
                    hasPlayedInCurrentTurn = true
                    val track = audioTrack
                    if (track != null && track.state == AudioTrack.STATE_INITIALIZED) {
                        // A blocking write may be partial; keep writing the remainder
                        // so a short native write cannot truncate the PCM stream.
                        var offset = 0
                        while (offset < chunk.size && isPlaying) {
                            val written = track.write(chunk, offset, chunk.size - offset)
                            if (written <= 0) {
                                android.util.Log.w(MODULE_NAME, "AudioTrack.write returned $written")
                                break
                            }
                            offset += written
                            framesWrittenThisTurn += written / 2
                        }

                        // Throttle UI volume animation events to once per 80ms (avoid bridge choking)
                        val now = System.currentTimeMillis()
                        if (now - lastVolumeEmitTime > 80) {
                            lastVolumeEmitTime = now
                            var sum = 0.0
                            val numSamples = chunk.size / 2
                            for (i in 0 until numSamples) {
                                val sample = (chunk[i * 2 + 1].toInt() shl 8) or (chunk[i * 2].toInt() and 0xFF)
                                sum += sample * sample
                            }
                            val rms = sqrt(sum / numSamples) / 32768.0
                            val vol = (rms * 3.0).coerceIn(0.0, 1.0)

                            val map = Arguments.createMap().apply {
                                putDouble("outputVolume", vol)
                            }
                            sendEvent("onOutputVolumeChange", map)
                        }
                    }
                } else if (turnCompleteRequested && hasPlayedInCurrentTurn && playbackQueue.isEmpty()) {
                    // Queue gaps are normal during streaming. Only complete the turn
                    // after the backend signals completion and AudioTrack played its tail.
                    val track = audioTrack
                    val playedFrames = track?.let {
                        (it.playbackHeadPosition - turnStartPlaybackHead).toLong() and 0xFFFFFFFFL
                    } ?: framesWrittenThisTurn
                    if (playedFrames >= framesWrittenThisTurn) {
                        hasPlayedInCurrentTurn = false
                        turnCompleteRequested = false
                        isBuffering = true
                        requiredBufferBytes = PLAYBACK_PREBUFFER_BYTES
                        emptyPolls = 0
                        framesWrittenThisTurn = 0L
                        val map = Arguments.createMap().apply {
                            putDouble("outputVolume", 0.0)
                        }
                        sendEvent("onOutputVolumeChange", map)
                        sendEvent("onPlaybackComplete", null)
                    }
                } else if (!turnCompleteRequested && hasPlayedInCurrentTurn && playbackQueue.isEmpty()) {
                    // If network jitter starves the queue mid-turn (>120ms), briefly re-buffer
                    // instead of stuttering chunk-by-chunk for the rest of the response.
                    emptyPolls++
                    if (emptyPolls >= 2) {
                        isBuffering = true
                        requiredBufferBytes = PLAYBACK_REBUFFER_BYTES
                    }
                }
            }
        }
    }

    @ReactMethod
    fun enqueueAudioChunk(base64Chunk: String) {
        if (base64Chunk.isBlank()) return
        try {
            val audioBytes = Base64.decode(base64Chunk, Base64.NO_WRAP)
            ensureAudioTrackInitialized()
            if (playbackQueue.offer(audioBytes)) {
                queuedBytesCount.addAndGet(audioBytes.size)
            }
        } catch (e: Exception) {
            // Log or ignore corrupted chunk
        }
    }

    @ReactMethod
    fun notifyPlaybackTurnComplete() {
        turnCompleteRequested = true
    }

    @ReactMethod
    fun flush() {
        try {
            playbackGeneration++
            playbackQueue.clear()
            queuedBytesCount.set(0)
            hasPlayedInCurrentTurn = false
            turnCompleteRequested = false
            audioTrack?.apply {
                if (state == AudioTrack.STATE_INITIALIZED) {
                    pause()
                    flush()
                    play()
                }
            }
            val map = Arguments.createMap().apply {
                putDouble("outputVolume", 0.0)
            }
            sendEvent("onOutputVolumeChange", map)
            sendEvent("onPlaybackComplete", null)
        } catch (e: Exception) {
            // Ignore
        }
    }

    @ReactMethod
    fun stopPlayback() {
        try {
            isPlaying = false
            playbackGeneration++
            playbackThread?.interrupt()
            playbackThread = null
            playbackQueue.clear()
            queuedBytesCount.set(0)
            turnCompleteRequested = false
            hasPlayedInCurrentTurn = false

            audioTrack?.apply {
                if (state == AudioTrack.STATE_INITIALIZED) {
                    stop()
                }
                release()
            }
            audioTrack = null
            abandonAudioFocus()

            // Restore normal audio routing
            try {
                val audioManager = reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                if (audioManager?.mode != AudioManager.MODE_NORMAL) {
                    audioManager?.mode = AudioManager.MODE_NORMAL
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    audioManager?.clearCommunicationDevice()
                } else {
                    @Suppress("DEPRECATION")
                    audioManager?.isSpeakerphoneOn = false
                }
            } catch (e: Exception) {}
        } catch (e: Exception) {
            // Ignore
        }
    }

    // Native File-based Live Voice Recording using standard Android MediaRecorder (AAC/M4A)
    private var liveMediaRecorder: MediaRecorder? = null
    private var voiceOutputFile: java.io.File? = null
    private var recordStartTime: Long = 0L

    @ReactMethod
    fun startLiveVoiceRecord(promise: Promise) {
        try {
            stopLiveVoiceRecordInternal()

            val cacheDir = reactContext.cacheDir
            val timestamp = System.currentTimeMillis()
            voiceOutputFile = java.io.File(cacheDir, "live_voice_$timestamp.m4a")

            val recorder = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                MediaRecorder(reactContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            recorder.setAudioSource(MediaRecorder.AudioSource.MIC)
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            recorder.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            recorder.setAudioEncodingBitRate(128000)
            recorder.setAudioSamplingRate(44100)
            recorder.setOutputFile(voiceOutputFile?.absolutePath)

            recorder.prepare()
            recorder.start()

            liveMediaRecorder = recorder
            recordStartTime = System.currentTimeMillis()

            promise.resolve(voiceOutputFile?.absolutePath)
        } catch (e: Exception) {
            liveMediaRecorder = null
            promise.reject("RECORD_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopLiveVoiceRecord(promise: Promise) {
        try {
            val file = voiceOutputFile
            val duration = if (recordStartTime > 0) System.currentTimeMillis() - recordStartTime else 0L

            stopLiveVoiceRecordInternal()

            if (file != null && file.exists()) {
                val map = Arguments.createMap().apply {
                    putString("filePath", file.absolutePath)
                    putString("fileUri", "file://${file.absolutePath}")
                    putDouble("durationMs", duration.toDouble())
                    putDouble("durationSeconds", (duration / 1000.0))
                }
                promise.resolve(map)
            } else {
                promise.reject("FILE_NOT_FOUND", "Recorded voice file does not exist")
            }
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    private fun stopLiveVoiceRecordInternal() {
        try {
            liveMediaRecorder?.apply {
                try {
                    stop()
                } catch (e: Exception) {}
                release()
            }
        } catch (e: Exception) {}
        liveMediaRecorder = null
    }

    // Required for React Native modules
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
