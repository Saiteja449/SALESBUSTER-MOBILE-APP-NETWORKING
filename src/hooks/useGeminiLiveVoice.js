import { useState, useEffect, useRef, useCallback } from 'react';
import {
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { whatsappSocketService } from '../services/socket/whatsappSocketService';

const { GeminiVoiceAudioModule } = NativeModules;
const voiceEventEmitter = GeminiVoiceAudioModule
  ? new NativeEventEmitter(GeminiVoiceAudioModule)
  : null;

/**
 * Custom React Hook for Gemini Multimodal Live API Real-Time Voice Chat
 * Coordinates bidirectional audio streaming over Socket.IO and native Android AudioRecord / AudioTrack
 */
export function useGeminiLiveVoice(options = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'connecting' | 'listening' | 'tool_running' | 'speaking' | 'error' | 'paused' | 'closing'
  const [activeToolName, setActiveToolName] = useState(null);
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [committedTranscript, setCommittedTranscript] = useState('');
  const [displayTranscript, setDisplayTranscript] = useState('');
  const [turns, setTurns] = useState([]);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [voiceName, setVoiceName] = useState('Aoede');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const socketRef = useRef(null);
  const socketListenersCleanupRef = useRef(null);
  const sessionReadyRef = useRef(null);
  const currentAssistantTurnRef = useRef('');
  const sessionTimeoutRef = useRef(null);
  const isPausedRef = useRef(false);
  const isClosingRef = useRef(false);
  const turnsRef = useRef([]);
  const sessionStartedAtRef = useRef(null);
  const committedTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const pendingAudioChunksRef = useRef([]);
  const currentSessionIdRef = useRef(null);
  const processedCompletionsRef = useRef(new Set());
  const eventCaptureRequestedRef = useRef(false);
  const eventCaptureDisconnectedRef = useRef(false);
  const eventCaptureStartRef = useRef(null);

  // Audio & diagnostics tracking refs
  const chunksSentCountRef = useRef(0);
  const hasExceededVolumeThresholdRef = useRef(false);
  const isBackendListeningReadyRef = useRef(false);
  const recentVolumeSamplesRef = useRef([]);
  const lastServerEventTimeRef = useRef(null);
  const secondPeakVolumeRef = useRef(0);
  const diagIntervalRef = useRef(null);

  const MIN_INPUT_VOLUME_FOR_LISTENING = 0.015;
  const VOLUME_THROTTLE_MS = 80; // ~12.5 fps
  const lastInputVolUpdateRef = useRef(0);
  const lastOutputVolUpdateRef = useRef(0);

  // Sync refs in effects to maintain pure render
  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    sessionStartedAtRef.current = sessionStartedAt;
  }, [sessionStartedAt]);

  // 1. Subscribe to Native Audio Events (Microphone Chunks & Volumes)
  useEffect(() => {
    if (!voiceEventEmitter) return;

    const volumeSub = voiceEventEmitter.addListener('onVolumeChange', data => {
      if (typeof data?.inputVolume === 'number') {
        const vol = data.inputVolume;
        const now = Date.now();
        if (now - lastInputVolUpdateRef.current >= VOLUME_THROTTLE_MS) {
          lastInputVolUpdateRef.current = now;
          setInputVolume(vol);
        }

        if (vol > secondPeakVolumeRef.current) {
          secondPeakVolumeRef.current = vol;
        }

        recentVolumeSamplesRef.current.push({ time: now, volume: vol });
        // Keep only last 3500ms of volume samples for peak tracking
        recentVolumeSamplesRef.current = recentVolumeSamplesRef.current.filter(
          s => now - s.time <= 3500,
        );

        if (vol >= MIN_INPUT_VOLUME_FOR_LISTENING) {
          hasExceededVolumeThresholdRef.current = true;
          // Clear silent mic warning once volume exceeds threshold
          setWarning(prev =>
            prev ===
            'Microphone is silent - check permissions or other apps using the mic.'
              ? null
              : prev,
          );
          if (
            !optionsRef.current?.isEventCapture &&
            isBackendListeningReadyRef.current &&
            chunksSentCountRef.current > 0
          ) {
            setStatus(prev => (prev === 'connecting' ? 'listening' : prev));
          }
        }
      }
    });

    const outputVolumeSub = voiceEventEmitter.addListener(
      'onOutputVolumeChange',
      data => {
        if (typeof data?.outputVolume === 'number') {
          const now = Date.now();
          if (now - lastOutputVolUpdateRef.current >= VOLUME_THROTTLE_MS) {
            lastOutputVolUpdateRef.current = now;
            setOutputVolume(data.outputVolume);
          }
        }
      },
    );

    const audioChunkSub = voiceEventEmitter.addListener(
      'onAudioChunk',
      base64Chunk => {
        if (!base64Chunk || isPausedRef.current) return;
        // Recording-only capture writes audio to the native file and never streams
        // microphone chunks or transcript data to the live backend.
        if (optionsRef.current?.recordingOnly) return;
        const isEvent = Boolean(optionsRef.current?.isEventCapture);
        const audioEvent = isEvent
          ? 'conversation:audio_chunk'
          : 'bi_voice_audio_in';

        if (
          socketRef.current &&
          socketRef.current.connected &&
          (!isEvent || isBackendListeningReadyRef.current)
        ) {
          // Flush any buffered chunks first so no audio is lost during reconnects
          if (pendingAudioChunksRef.current.length > 0) {
            while (pendingAudioChunksRef.current.length > 0) {
              const buffered = pendingAudioChunksRef.current.shift();
              socketRef.current.emit(audioEvent, buffered);
              chunksSentCountRef.current += 1;
            }
          }
          socketRef.current.emit(audioEvent, base64Chunk);
          chunksSentCountRef.current += 1;

          if (
            !isEvent &&
            isBackendListeningReadyRef.current &&
            hasExceededVolumeThresholdRef.current &&
            chunksSentCountRef.current > 0
          ) {
            setStatus(prev => (prev === 'connecting' ? 'listening' : prev));
          }
        } else {
          // Buffer up to 100 chunks (~3.2s) when socket is briefly disconnected
          if (pendingAudioChunksRef.current.length < 100) {
            pendingAudioChunksRef.current.push(base64Chunk);
          }
        }
      },
    );

    const playbackCompleteSub = voiceEventEmitter.addListener(
      'onPlaybackComplete',
      () => {
        setOutputVolume(0);
        isBackendListeningReadyRef.current = true;
        if (
          chunksSentCountRef.current > 0 &&
          hasExceededVolumeThresholdRef.current
        ) {
          setStatus('listening');
        }
      },
    );

    return () => {
      volumeSub?.remove?.();
      outputVolumeSub?.remove?.();
      audioChunkSub?.remove?.();
      playbackCompleteSub?.remove?.();
    };
  }, []);

  // 2. Stop Voice Session (declared first so setupSocketListeners can reference it)
  const stopVoiceSession = useCallback(async () => {
    let audioCaptureInfo = null;
    try {
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
        sessionTimeoutRef.current = null;
      }

      const socket = socketRef.current || whatsappSocketService.getSocket();
      eventCaptureRequestedRef.current = false;
      eventCaptureDisconnectedRef.current = false;
      sessionReadyRef.current?.reject(new Error('Voice session stopped'));
      sessionReadyRef.current = null;
      socketListenersCleanupRef.current?.();
      socketListenersCleanupRef.current = null;
      if (socket && socket.connected && !optionsRef.current?.recordingOnly) {
        if (optionsRef.current?.isEventCapture) {
          socket.emit('conversation:stop', {
            sessionId: currentSessionIdRef.current,
            eventId: optionsRef.current?.eventId,
            liveTranscript: committedTranscriptRef.current,
          });
        } else {
          socket.emit('bi_voice_stop');
        }
      }

      if (GeminiVoiceAudioModule) {
        audioCaptureInfo = await GeminiVoiceAudioModule.stopRecording().catch(() => null);
        GeminiVoiceAudioModule.stopPlayback();
      }
    } catch {
      // Ignore cleanup error
    } finally {
      // Notify onSessionEnd callback additively
      const durationMs = sessionStartedAtRef.current
        ? Math.max(0, Date.now() - sessionStartedAtRef.current)
        : 0;
      const currentTurns = turnsRef.current;
      if (typeof optionsRef.current?.onSessionEnd === 'function') {
        try {
          optionsRef.current.onSessionEnd({ turns: currentTurns, durationMs, audioCaptureInfo });
        } catch (cbErr) {
          console.warn('[Live Voice] onSessionEnd error:', cbErr);
        }
      }

      setIsConnected(false);
      setStatus('idle');
      setInputVolume(0);
      setOutputVolume(0);
      setActiveToolName(null);
      GeminiVoiceAudioModule?.setMuted(false);
      setIsMuted(false);
      setIsClosing(false);
      isClosingRef.current = false;
      setIsPaused(false);
      isPausedRef.current = false;
      setInterimTranscript('');
      setCommittedTranscript('');
      setDisplayTranscript('');
      interimTranscriptRef.current = '';
      committedTranscriptRef.current = '';
      pendingAudioChunksRef.current = [];

      if (diagIntervalRef.current) {
        clearInterval(diagIntervalRef.current);
        diagIntervalRef.current = null;
      }
      chunksSentCountRef.current = 0;
      hasExceededVolumeThresholdRef.current = false;
      isBackendListeningReadyRef.current = false;
      recentVolumeSamplesRef.current = [];
      lastServerEventTimeRef.current = null;
      secondPeakVolumeRef.current = 0;
      setWarning(null);
      eventCaptureStartRef.current = null;
    }
  }, []);

  // 3. Wire Socket.IO Listeners for Gemini Voice Events
  const setupSocketListeners = useCallback(
    (socket, isEventCapture = false) => {
      if (!socket) return;
      socketRef.current = socket;

      const handleReady = data => {
        if (
          isEventCapture &&
          data?.sessionId &&
          data.sessionId !== currentSessionIdRef.current
        ) return;
        lastServerEventTimeRef.current = Date.now();
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
        setIsConnected(true);
        setError(null);
        isBackendListeningReadyRef.current = true;
        setStatus('connected');
        if (isEventCapture) {
          while (pendingAudioChunksRef.current.length > 0 && socket.connected) {
            socket.emit('conversation:audio_chunk', pendingAudioChunksRef.current.shift());
            chunksSentCountRef.current += 1;
          }
        }
        sessionReadyRef.current?.resolve(data);
        sessionReadyRef.current = null;
      };

      const handleConversationConnectionState = data => {
        lastServerEventTimeRef.current = Date.now();
        if (data?.state === 'reconnecting') {
          setIsConnected(false);
          isBackendListeningReadyRef.current = false;
          setWarning('Live connection interrupted. Reconnecting…');
          setStatus('reconnecting');
        } else if (data?.state === 'connected') {
          setIsConnected(true);
          isBackendListeningReadyRef.current = true;
          setWarning(null);
          setError(null);
          setStatus('connected');
        }
      };

      const handleSocketDisconnect = reason => {
        if (!isEventCapture || !eventCaptureRequestedRef.current) return;
        eventCaptureDisconnectedRef.current = true;
        isBackendListeningReadyRef.current = false;
        setIsConnected(false);
        setWarning('Connection interrupted. Reconnecting transcription…');
        setStatus('reconnecting');
        console.warn('[Live Voice] Event capture socket disconnected:', reason);
      };

      const handleSocketConnect = () => {
        if (
          !isEventCapture ||
          !eventCaptureRequestedRef.current ||
          !eventCaptureDisconnectedRef.current
        ) return;
        eventCaptureDisconnectedRef.current = false;
        const capture = eventCaptureStartRef.current || {};
        const sessionId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        currentSessionIdRef.current = sessionId;
        isBackendListeningReadyRef.current = false;
        setIsConnected(false);
        setStatus('connecting');
        setWarning('Reconnecting transcription…');
        socket.emit('conversation:start', { sessionId, ...capture });
      };

      const handleStatus = data => {
        lastServerEventTimeRef.current = Date.now();
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }

        if (data?.state === 'connected') {
          setIsConnected(true);
          isBackendListeningReadyRef.current = true;
          setError(null);
          if (
            chunksSentCountRef.current > 0 &&
            hasExceededVolumeThresholdRef.current
          ) {
            setStatus('listening');
          }
          sessionReadyRef.current?.resolve();
          sessionReadyRef.current = null;
        } else if (data?.state === 'closed') {
          sessionReadyRef.current?.reject(
            new Error('SalesBuster AI session closed before it was ready.'),
          );
          sessionReadyRef.current = null;
          setIsConnected(false);
          setStatus('idle');
        } else if (data?.state === 'processing') {
          setStatus('processing');
        } else if (data?.state === 'tool_running') {
          setStatus('tool_running');
          setActiveToolName(
            data?.friendlyLabel || data?.toolName || 'CRM Database',
          );
        } else if (data?.state === 'tool_complete') {
          setActiveToolName(null);
          setStatus('processing');
        } else if (data?.state === 'speaking') {
          setStatus('speaking');
        } else if (data?.state === 'listening') {
          isBackendListeningReadyRef.current = true;
          if (
            chunksSentCountRef.current > 0 &&
            hasExceededVolumeThresholdRef.current
          ) {
            setStatus('listening');
          }
        }
      };

      const handleAudioOut = data => {
        lastServerEventTimeRef.current = Date.now();
        if (optionsRef.current?.silentMode) return;
        if (data?.data && GeminiVoiceAudioModule) {
          GeminiVoiceAudioModule.enqueueAudioChunk(data.data);
        }
      };

      const handleContactInterim = data => {
        lastServerEventTimeRef.current = Date.now();
        console.log('[Live Voice] Contact interim draft received:', data);
        if (typeof optionsRef.current?.onContactInterim === 'function') {
          optionsRef.current.onContactInterim(data);
        }
      };

      const handleContactTriggered = data => {
        lastServerEventTimeRef.current = Date.now();
        console.log(
          '[Live Voice] Contact triggered from Gemini live conversation:',
          data,
        );
        if (typeof optionsRef.current?.onContactTriggered === 'function') {
          optionsRef.current.onContactTriggered(data);
        }
      };

      const handleTranscriptInterim = data => {
        lastServerEventTimeRef.current = Date.now();
        if (data?.role === 'user' && typeof data.text === 'string') {
          setStatus('listening');
          setWarning(null);
          const interim = data.text;
          setInterimTranscript(interim);
          interimTranscriptRef.current = interim;
          const combined = committedTranscriptRef.current
            ? `${committedTranscriptRef.current} ${interim}`.trim()
            : interim;
          setDisplayTranscript(combined);
          setLiveTranscript('You: ' + combined);

          // Update active user turn in place (do NOT create a new turn object per interim fragment)
          setTurns(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'user' && !last.isFinal) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                text: combined,
              };
              return updated;
            }
            const newTurn = {
              id:
                'turn-u-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2, 6),
              role: 'user',
              text: combined,
              ts: Date.now(),
              isFinal: false,
            };
            return [...prev, newTurn];
          });

          if (
            typeof optionsRef.current?.onUserInterimTranscript === 'function'
          ) {
            optionsRef.current.onUserInterimTranscript(interim, data);
          }
        }
      };

      const handleTranscriptFinal = data => {
        lastServerEventTimeRef.current = Date.now();
        if (data?.role === 'user' && typeof data.text === 'string') {
          setStatus('listening');
          setWarning(null);
          const finalText = data.text;
          setInterimTranscript('');
          interimTranscriptRef.current = '';

          const updatedCommitted = (
            committedTranscriptRef.current
              ? committedTranscriptRef.current + ' ' + finalText.trim()
              : finalText.trim()
          ).trim();
          committedTranscriptRef.current = updatedCommitted;
          setCommittedTranscript(updatedCommitted);
          setDisplayTranscript(updatedCommitted);
          setLiveTranscript('You: ' + updatedCommitted);

          // Finalize active user turn
          setTurns(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'user' && !last.isFinal) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...last,
                text: updatedCommitted,
                isFinal: true,
              };
              return updated;
            }
            const newTurn = {
              id:
                'turn-u-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2, 6),
              role: 'user',
              text: updatedCommitted,
              ts: Date.now(),
              isFinal: true,
            };
            return [...prev, newTurn];
          });

          console.log(
            `[VOICE-DIAG] Mobile onUserTranscript received: "${finalText}"`,
            data,
          );
          if (typeof optionsRef.current?.onUserFinalTranscript === 'function') {
            optionsRef.current.onUserFinalTranscript(
              finalText,
              updatedCommitted,
              data,
            );
          }
          if (typeof optionsRef.current?.onUserTranscript === 'function') {
            try {
              optionsRef.current.onUserTranscript(finalText, {
                ...data,
                isFinal: true,
                fullCommitted: updatedCommitted,
              });
            } catch (cbErr) {
              console.warn(
                '[Live Voice] onUserTranscript callback error:',
                cbErr,
              );
            }
          }

          const EXIT_PHRASES_REGEX =
            /\b(okay\s*bye|ok\s*bye|good\s*bye|bye\s*bye|\bbye\b|exit\s+(?:voice|session)|close\s+(?:voice|session)|stop\s+(?:voice|session))\b/i;
          const isPassiveEventMode = Boolean(
            optionsRef.current?.silentMode ||
              optionsRef.current?.isEventCapture,
          );
          if (
            !isPassiveEventMode &&
            EXIT_PHRASES_REGEX.test(finalText) &&
            !isClosingRef.current
          ) {
            console.log(
              '[Live Voice Mobile] User goodbye recognized:',
              finalText,
            );
            setIsClosing(true);
            isClosingRef.current = true;
            setStatus('closing');
            setTimeout(() => {
              stopVoiceSession();
              optionsRef.current?.onAutoClose?.();
            }, 3000);
          }
        }
      };

      const handleTranscript = data => {
        lastServerEventTimeRef.current = Date.now();
        if (data?.text) {
          if (data.role === 'user') {
            handleTranscriptFinal(data);
          } else {
            currentAssistantTurnRef.current += data.text;
            const currentText = currentAssistantTurnRef.current;
            setLiveTranscript(currentText);

            // Stream assistant turn
            setTurns(prev => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant' && last.isStreaming) {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...last,
                  text: currentText,
                };
                return updated;
              }
              const newTurn = {
                id:
                  'turn-a-' +
                  Date.now() +
                  '-' +
                  Math.random().toString(36).slice(2, 6),
                role: 'assistant',
                text: currentText,
                ts: Date.now(),
                isStreaming: true,
              };
              return [...prev, newTurn];
            });
          }
        }
      };

      const handleCloseRequested = () => {
        lastServerEventTimeRef.current = Date.now();
        console.log('[Live Voice Mobile] bi_voice_close_requested received');
        setIsClosing(true);
        isClosingRef.current = true;
        setStatus('closing');
        setTimeout(() => {
          stopVoiceSession();
          optionsRef.current?.onAutoClose?.();
        }, 2500);
      };

      const handleInterrupted = () => {
        lastServerEventTimeRef.current = Date.now();
        if (GeminiVoiceAudioModule) {
          GeminiVoiceAudioModule.flush();
        }
        setOutputVolume(0);
        setStatus('listening');
      };

      const handleTurnComplete = () => {
        lastServerEventTimeRef.current = Date.now();
        // Finalize streaming flag on active assistant turn
        setTurns(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && last.isStreaming) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...last,
              isStreaming: false,
              text: currentAssistantTurnRef.current || last.text,
            };
            return updated;
          }
          return prev;
        });

        // Keep transcript visible for reading; reset buffer for subsequent turn
        currentAssistantTurnRef.current = '';
        if (
          GeminiVoiceAudioModule &&
          typeof GeminiVoiceAudioModule.notifyPlaybackTurnComplete ===
            'function'
        ) {
          GeminiVoiceAudioModule.notifyPlaybackTurnComplete();
        }
      };

      const handleNoResponse = data => {
        lastServerEventTimeRef.current = Date.now();
        // Event capture is intentionally silent: lack of generated assistant
        // audio is normal and the transport watchdog cannot tell silence from a
        // slow transcription/tool response. The separate mic-level watchdog is
        // the reliable signal for an actually silent microphone.
        if (!optionsRef.current?.isEventCapture) {
          setWarning(
            'Voice service has not returned a transcript yet. Keep speaking or check your connection.',
          );
        }
        // Keep session open!
        if (typeof optionsRef.current?.onNoResponse === 'function') {
          try {
            optionsRef.current.onNoResponse(data);
          } catch (cbErr) {
            console.warn('[Live Voice] onNoResponse callback error:', cbErr);
          }
        }
      };

      const handleError = data => {
        lastServerEventTimeRef.current = Date.now();
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
        const errMsg = data?.message || 'Voice assistant error';
        sessionReadyRef.current?.reject(new Error(errMsg));
        sessionReadyRef.current = null;
        setError(errMsg);
        setStatus('error');
        if (GeminiVoiceAudioModule) {
          GeminiVoiceAudioModule.stopRecording().catch(() => {});
          GeminiVoiceAudioModule.stopPlayback();
        }
      };

      const handleConnectError = data => {
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
        const errMsg = data?.message || 'Live socket connection error';
        sessionReadyRef.current?.reject(new Error(errMsg));
        sessionReadyRef.current = null;
        console.warn('[Live Voice] Socket connect_error:', errMsg);
        setError(errMsg);
        setStatus('error');
      };

      const handleConversationCompleted = data => {
        const sId = data?.sessionId;
        if (sId && processedCompletionsRef.current.has(sId)) {
          console.log(
            '[Live Voice] Deduplicating conversation completion for session:',
            sId,
          );
          return;
        }
        if (sId) processedCompletionsRef.current.add(sId);

        if (typeof optionsRef.current?.onConversationCompleted === 'function') {
          optionsRef.current.onConversationCompleted(data);
        }
      };

      // Subscribe ONLY to the events of the active pipeline. Event/detail capture
      // (conversation:*) and the BI voice analyst (bi_voice_*) are separate pipelines;
      // listening to both (plus legacy event_* aliases) made every transcript chunk be
      // handled twice in event capture.
      const subscriptions = isEventCapture
        ? [
            ['conversation:ready', handleReady],
            ['conversation:connection_state', handleConversationConnectionState],
            ['conversation:error', handleError],
            ['conversation:transcript_interim', handleTranscriptInterim],
            ['conversation:transcript_final', handleTranscriptFinal],
            ['conversation:contact_update', handleContactInterim],
            ['conversation:completed', handleConversationCompleted],
            ['disconnect', handleSocketDisconnect],
            ['connect', handleSocketConnect],
            ['connect_error', handleConnectError],
          ]
        : [
            ['bi_voice_ready', handleReady],
            ['bi_voice_status', handleStatus],
            ['bi_voice_audio_out', handleAudioOut],
            ['bi_voice_transcript_interim', handleTranscriptInterim],
            ['bi_voice_transcript_final', handleTranscriptFinal],
            ['bi_voice_transcript', handleTranscript],
            ['bi_voice_interrupted', handleInterrupted],
            ['bi_voice_turn_complete', handleTurnComplete],
            ['bi_voice_no_response', handleNoResponse],
            ['bi_voice_error', handleError],
            ['bi_voice_close_requested', handleCloseRequested],
            ['connect_error', handleConnectError],
          ];

      subscriptions.forEach(([eventName, handler]) =>
        socket.on(eventName, handler),
      );

      const cleanup = () => {
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
        subscriptions.forEach(([eventName, handler]) =>
          socket.off(eventName, handler),
        );
      };
      socketListenersCleanupRef.current = cleanup;
      return cleanup;
    },
    [stopVoiceSession],
  );

  // 4. Start Voice Session
  const startVoiceSession = useCallback(
    async preferredVoice => {
      try {
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }

        setError(null);
        setStatus('connecting');
        currentAssistantTurnRef.current = '';
        setLiveTranscript('');
        setInterimTranscript('');
        setCommittedTranscript('');
        setDisplayTranscript('');
        interimTranscriptRef.current = '';
        committedTranscriptRef.current = '';
        pendingAudioChunksRef.current = [];

        if (diagIntervalRef.current) {
          clearInterval(diagIntervalRef.current);
          diagIntervalRef.current = null;
        }
        chunksSentCountRef.current = 0;
        hasExceededVolumeThresholdRef.current = false;
        isBackendListeningReadyRef.current = false;
        recentVolumeSamplesRef.current = [];
        lastServerEventTimeRef.current = null;
        secondPeakVolumeRef.current = 0;
        setWarning(null);
        setTurns([]);
        const started = Date.now();
        setSessionStartedAt(started);
        sessionStartedAtRef.current = started;

        // Request Android RECORD_AUDIO permission if needed
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Access for Voice Notes',
              message:
                'SalesBuster needs microphone access to record your voice notes and extract attendee contact details using AI speech analysis. Audio is only recorded while you actively open or use voice capture.',
              buttonPositive: 'Allow',
              buttonNegative: 'Not Now',
            },
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setError(
              'Microphone permission was denied. Please allow microphone access in app settings.',
            );
            setStatus('error');
            return;
          }
        }

        const currentOpts = optionsRef.current || {};
        if (currentOpts.recordingOnly) {
          if (!GeminiVoiceAudioModule) {
            throw new Error('Local audio recording is unavailable on this device.');
          }
          if (typeof GeminiVoiceAudioModule.setCaptureToFile === 'function') {
            GeminiVoiceAudioModule.setCaptureToFile(true);
          }
          if (typeof GeminiVoiceAudioModule.setUseAudioEffects === 'function') {
            try {
              GeminiVoiceAudioModule.setUseAudioEffects(true);
            } catch (fxErr) {
              console.warn('[Live Voice] Failed to configure audio effects:', fxErr);
            }
          }
          if (typeof GeminiVoiceAudioModule.setSpeakerphone === 'function') {
            await GeminiVoiceAudioModule.setSpeakerphone(isSpeakerOn).catch(() => {});
          }
          await GeminiVoiceAudioModule.startRecording();
          setIsConnected(true);
          setStatus('listening');
          return;
        }

        // Ensure socket connection is active and authenticated as the current user
        const activeToken =
          currentOpts.token ||
          currentOpts.user?.token ||
          (await AsyncStorage.getItem('mysalespilot_token')) ||
          (await AsyncStorage.getItem('token'));
        const storedUser =
          currentOpts.user ||
          (await AsyncStorage.getItem('mysalespilot_session_user')) ||
          (await AsyncStorage.getItem('user'));
        let parsedUser = currentOpts.user || null;
        if (!parsedUser && storedUser) {
          try {
            parsedUser =
              typeof storedUser === 'string'
                ? JSON.parse(storedUser)
                : storedUser;
          } catch {
            parsedUser = null;
          }
        }

        let socket = whatsappSocketService.getSocket();
        if (!socket || !socket.connected || (activeToken && whatsappSocketService.token !== activeToken)) {
          whatsappSocketService.connect({
            token: activeToken,
            user: parsedUser,
          });
          socket = whatsappSocketService.getSocket();
        }

        if (!socket) {
          setError(
            'Could not connect to live voice server. Please check your network connection.',
          );
          setStatus('error');
          return;
        }

        const isEventCapture = Boolean(
          optionsRef.current?.isEventCapture ||
            (typeof preferredVoice === 'object' &&
              preferredVoice?.isEventCapture),
        );

        socketListenersCleanupRef.current?.();
        setupSocketListeners(socket, isEventCapture);

        if (!socket.connected) {
          await new Promise(resolve => {
            const timeout = setTimeout(resolve, 5000);
            socket.once('connect', () => {
              clearTimeout(timeout);
              resolve();
            });
            socket.once('connect_error', () => {
              clearTimeout(timeout);
              resolve();
            });
          });
        }

        if (!socket.connected) {
          setError(
            'Could not connect to real-time voice server. Please check your connection and retry.',
          );
          setStatus('error');
          return;
        }

        // Safety timeout: If backend/Gemini hangs in 'connecting' for over 15 seconds, timeout
        sessionTimeoutRef.current = setTimeout(() => {
          setStatus(prev => {
            if (prev === 'connecting') {
              const timeoutError = new Error(
                'Voice assistant connection timed out. Please check your connection and try again.',
              );
              setError(timeoutError.message);
              sessionReadyRef.current?.reject(timeoutError);
              sessionReadyRef.current = null;
              if (GeminiVoiceAudioModule) {
                GeminiVoiceAudioModule.stopRecording().catch(() => {});
                GeminiVoiceAudioModule.stopPlayback();
              }
              return 'error';
            }
            return prev;
          });
        }, 15000);

        // Start session on backend
        const eventId =
          typeof preferredVoice === 'object' ? preferredVoice?.eventId : null;
        const eventName =
          typeof preferredVoice === 'object' ? preferredVoice?.eventName : null;
        const voiceToUse =
          (typeof preferredVoice === 'string'
            ? preferredVoice
            : preferredVoice?.voiceName) ||
          voiceName ||
          'Aoede';

        const sessionReady = new Promise((resolve, reject) => {
          sessionReadyRef.current = { resolve, reject };
        });

        if (isEventCapture) {
          const newSessionId = `conv_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 8)}`;
          currentSessionIdRef.current = newSessionId;
          eventCaptureRequestedRef.current = true;
          eventCaptureDisconnectedRef.current = false;
          eventCaptureStartRef.current = { eventId, eventName, voiceName: voiceToUse };
          socket.emit('conversation:start', {
            sessionId: newSessionId,
            eventId,
            eventName,
            voiceName: voiceToUse,
          });
        } else {
          socket.emit('bi_voice_start', { voiceName: voiceToUse });
        }

        await sessionReady;

        // Start native recording after backend is ready
        if (GeminiVoiceAudioModule) {
          if (typeof GeminiVoiceAudioModule.setCaptureToFile === 'function') {
            GeminiVoiceAudioModule.setCaptureToFile(Boolean(optionsRef.current?.captureAudioFile));
          }
          if (typeof GeminiVoiceAudioModule.setUseAudioEffects === 'function') {
            // Event capture is usually used in noisy rooms; enable platform
            // voice processing so the streamed 16 kHz PCM has noise suppression.
            const useEffects = Boolean(
              isEventCapture || !optionsRef.current?.silentMode,
            );
            try {
              GeminiVoiceAudioModule.setUseAudioEffects(useEffects);
            } catch (fxErr) {
              console.warn(
                '[Live Voice] Failed to configure audio effects:',
                fxErr,
              );
            }
          }
          if (typeof GeminiVoiceAudioModule.setSpeakerphone === 'function') {
            await GeminiVoiceAudioModule.setSpeakerphone(isSpeakerOn).catch(
              () => {},
            );
          }
          await GeminiVoiceAudioModule.startRecording();
        }

        // Start 1-second diagnostic logging interval & mic silence watchdog (mobile only)
        if (diagIntervalRef.current) clearInterval(diagIntervalRef.current);
        diagIntervalRef.current = setInterval(() => {
          const peakVol = secondPeakVolumeRef.current;
          secondPeakVolumeRef.current = 0;
          if (optionsRef.current?.isEventCapture && __DEV__) {
            const chunksEmitted = chunksSentCountRef.current;
            const timeSinceLastEvent = lastServerEventTimeRef.current
              ? `${Date.now() - lastServerEventTimeRef.current}ms`
              : 'none';
            console.log(
              `[VOICE-DIAG] peakVol=${peakVol.toFixed(
                3,
              )}, chunksSent=${chunksEmitted}, timeSinceLastServerEvent=${timeSinceLastEvent}`,
            );
          }

          // Check if mic stays near zero for 3s after start
          if (
            sessionStartedAtRef.current &&
            Date.now() - sessionStartedAtRef.current >= 3000
          ) {
            const now = Date.now();
            const samplesIn3s = recentVolumeSamplesRef.current.filter(
              s => now - s.time <= 3000,
            );
            const peak3s =
              samplesIn3s.length > 0
                ? Math.max(...samplesIn3s.map(s => s.volume))
                : 0;
            if (peak3s < 0.005) {
              setWarning(
                'Microphone is silent - check permissions or other apps using the mic.',
              );
            }
          }
        }, 1000);
      } catch (err) {
        if (sessionTimeoutRef.current) {
          clearTimeout(sessionTimeoutRef.current);
          sessionTimeoutRef.current = null;
        }
        sessionReadyRef.current = null;
        socketListenersCleanupRef.current?.();
        socketListenersCleanupRef.current = null;
        const stoppedByUser = err?.message === 'Voice session stopped';
        if (!stoppedByUser) {
          const socket = socketRef.current;
          if (socket?.connected && !optionsRef.current?.isEventCapture)
            socket.emit('bi_voice_stop');
          setError(
            err?.message || 'Failed to start SalesBuster AI voice session.',
          );
          setStatus('error');
        }
      }
    },
    [voiceName, isSpeakerOn, setupSocketListeners],
  );

  // 5. Toggle Mute
  const setMuted = useCallback(muted => {
    const nextMuted = Boolean(muted);
    setIsMuted(nextMuted);
    if (GeminiVoiceAudioModule) {
      GeminiVoiceAudioModule.setMuted(nextMuted);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(!isMuted);
  }, [isMuted, setMuted]);

  // 5b. Toggle Speaker / Earpiece
  const toggleSpeaker = useCallback(async () => {
    const nextSpeaker = !isSpeakerOn;
    setIsSpeakerOn(nextSpeaker);
    if (
      GeminiVoiceAudioModule &&
      typeof GeminiVoiceAudioModule.setSpeakerphone === 'function'
    ) {
      try {
        await GeminiVoiceAudioModule.setSpeakerphone(nextSpeaker);
      } catch (err) {
        console.warn('[Live Voice] Failed to toggle speaker:', err);
      }
    }
  }, [isSpeakerOn]);

  const setSpeaker = useCallback(async enabled => {
    setIsSpeakerOn(enabled);
    if (
      GeminiVoiceAudioModule &&
      typeof GeminiVoiceAudioModule.setSpeakerphone === 'function'
    ) {
      try {
        await GeminiVoiceAudioModule.setSpeakerphone(enabled);
      } catch (err) {
        console.warn('[Live Voice] Failed to set speaker:', err);
      }
    }
  }, []);

  // 6. Interrupt Assistant (Barge-In)
  const interrupt = useCallback(() => {
    if (GeminiVoiceAudioModule) {
      GeminiVoiceAudioModule.flush();
    }
    setOutputVolume(0);
    setStatus('listening');
  }, []);

  // 7. Pause and Resume Live Voice
  const pauseVoiceSession = useCallback(() => {
    setIsPaused(true);
    isPausedRef.current = true;
    if (GeminiVoiceAudioModule) {
      GeminiVoiceAudioModule.flush();
    }
    setOutputVolume(0);
    setInputVolume(0);
    setStatus('paused');
    // Audio streaming is gated client-side (onAudioChunk returns while paused); no server event needed.
  }, []);

  const resumeVoiceSession = useCallback(async () => {
    if (!isConnected) {
      return startVoiceSession();
    }
    setIsPaused(false);
    isPausedRef.current = false;
    setStatus('listening');
  }, [isConnected, startVoiceSession]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      resumeVoiceSession();
    } else {
      pauseVoiceSession();
    }
  }, [isPaused, resumeVoiceSession, pauseVoiceSession]);

  // 8. Retry helper
  const retry = useCallback(() => {
    return startVoiceSession(voiceName);
  }, [startVoiceSession, voiceName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVoiceSession();
    };
  }, [stopVoiceSession]);

  return {
    isConnected,
    isPaused,
    isClosing,
    status,
    activeToolName,
    inputVolume,
    outputVolume,
    liveTranscript,
    interimTranscript,
    committedTranscript,
    displayTranscript,
    turns,
    sessionStartedAt,
    error,
    warning,
    micWarning: warning,
    voiceName,
    setVoiceName,
    isMuted,
    setMuted,
    isSpeakerOn,
    startVoiceSession,
    stopVoiceSession,
    pauseVoiceSession,
    resumeVoiceSession,
    togglePause,
    toggleMute,
    toggleSpeaker,
    setSpeaker,
    interrupt,
    retry,
  };
}

export default useGeminiLiveVoice;
