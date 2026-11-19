import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Alert,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import {
  PlayIcon,
  PauseIcon,
  VolumeIcon,
  RefreshIcon,
  FullscreenIcon,
  ExitFullscreenIcon,
} from '../../icons/Icons';
import { Fonts } from '../../styles/Fonts';

// Dynamically resolve react-native-video so the app remains safe
let NativeVideo = null;
try {
  const RNVideo = require('react-native-video');
  NativeVideo = RNVideo?.default || RNVideo;
} catch {
  NativeVideo = null;
}

const formatTime = seconds => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const InlineVideoPlayer = ({
  videoUrl,
  posterUrl,
  fallbackBg = '#0F0E1E',
  containerStyle,
  title = '',
  resizeMode = 'contain',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [progress, setProgress] = useState({ currentTime: 0, duration: 0 });
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef(null);
  const fullscreenVideoRef = useRef(null);
  const currentPositionRef = useRef(0);
  const controlsTimeoutRef = useRef(null);
  const progressTrackRef = useRef(null);
  const fullscreenProgressTrackRef = useRef(null);

  // Clear autohide timer
  const clearControlsTimer = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
  }, []);

  // Auto-hide controls after 3.5 seconds of active playback
  const triggerControlsAutoHide = useCallback(() => {
    clearControlsTimer();
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  }, [clearControlsTimer]);

  useEffect(() => {
    return () => clearControlsTimer();
  }, [clearControlsTimer]);

  // Reset when videoUrl changes
  useEffect(() => {
    setIsPlaying(false);
    setIsPaused(false);
    setIsEnded(false);
    setIsLoading(false);
    currentPositionRef.current = 0;
    setProgress({ currentTime: 0, duration: 0 });
    clearControlsTimer();
  }, [videoUrl, clearControlsTimer]);

  const handleStartPlay = useCallback(() => {
    if (!videoUrl) return;

    if (!NativeVideo) {
      Linking.openURL(videoUrl).catch(err => {
        Alert.alert('Cannot open video', err.message);
      });
      return;
    }

    setIsPlaying(true);
    setIsPaused(false);
    setIsLoading(true);
    setIsEnded(false);
    triggerControlsAutoHide();
  }, [videoUrl, triggerControlsAutoHide]);

  const handleReplay = useCallback(
    e => {
      e?.stopPropagation?.();
      setIsEnded(false);
      setIsPaused(false);
      setProgress(prev => ({ ...prev, currentTime: 0 }));
      currentPositionRef.current = 0;

      const activeRef = isFullscreen ? fullscreenVideoRef : videoRef;
      if (activeRef.current?.seek) {
        activeRef.current.seek(0);
      }

      setTimeout(() => {
        if (activeRef.current?.seek) {
          activeRef.current.seek(0);
        }
        if (activeRef.current?.resume) {
          try {
            activeRef.current.resume();
          } catch (_) {}
        }
      }, 60);

      triggerControlsAutoHide();
    },
    [isFullscreen, triggerControlsAutoHide],
  );

  const handleTogglePlayPause = useCallback(
    e => {
      e?.stopPropagation?.();
      if (!isPlaying) {
        handleStartPlay();
        return;
      }
      if (isEnded) {
        handleReplay(e);
        return;
      }

      setIsPaused(prev => {
        const nextPaused = !prev;
        if (nextPaused) {
          clearControlsTimer();
          setShowControls(true);
        } else {
          triggerControlsAutoHide();
        }
        return nextPaused;
      });
    },
    [
      isPlaying,
      isEnded,
      handleStartPlay,
      handleReplay,
      clearControlsTimer,
      triggerControlsAutoHide,
    ],
  );

  const handleToggleControls = useCallback(() => {
    if (isPaused || isEnded) {
      setShowControls(true);
      return;
    }
    if (showControls) {
      clearControlsTimer();
      setShowControls(false);
    } else {
      triggerControlsAutoHide();
    }
  }, [
    isPaused,
    isEnded,
    showControls,
    clearControlsTimer,
    triggerControlsAutoHide,
  ]);

  const handleToggleMute = useCallback(
    e => {
      e?.stopPropagation?.();
      setIsMuted(prev => !prev);
      if (!isPaused && !isEnded) {
        triggerControlsAutoHide();
      }
    },
    [isPaused, isEnded, triggerControlsAutoHide],
  );

  const handleOpenFullscreen = useCallback(
    e => {
      e?.stopPropagation?.();
      if (!isPlaying) {
        handleStartPlay();
      }
      clearControlsTimer();
      setShowControls(true);
      setIsFullscreen(true);
    },
    [isPlaying, handleStartPlay, clearControlsTimer],
  );

  const handleExitFullscreen = useCallback(
    e => {
      e?.stopPropagation?.();
      setIsFullscreen(false);
      clearControlsTimer();
      setShowControls(true);
      setTimeout(() => {
        if (videoRef.current?.seek && currentPositionRef.current > 0) {
          videoRef.current.seek(currentPositionRef.current);
        }
        if (!isPaused && !isEnded) {
          triggerControlsAutoHide();
        }
      }, 80);
    },
    [clearControlsTimer, isPaused, isEnded, triggerControlsAutoHide],
  );

  const handleProgress = useCallback(data => {
    currentPositionRef.current = data.currentTime;
    setProgress(prev => ({
      currentTime: data.currentTime,
      duration: data.seekableDuration || data.duration || prev.duration,
    }));
  }, []);

  const handleLoad = useCallback(
    data => {
      setIsLoading(false);
      setProgress(prev => ({
        ...prev,
        duration: data.duration || prev.duration,
      }));
      if (currentPositionRef.current > 0) {
        const activeRef = isFullscreen ? fullscreenVideoRef : videoRef;
        activeRef.current?.seek?.(currentPositionRef.current);
      }
    },
    [isFullscreen],
  );

  const handleEnd = useCallback(() => {
    setIsEnded(true);
    setIsPaused(true);
    setShowControls(true);
    clearControlsTimer();
  }, [clearControlsTimer]);

  const handleSeekTouch = useCallback(
    (event, isFullscreenTrack = false) => {
      const trackRef = isFullscreenTrack
        ? fullscreenProgressTrackRef
        : progressTrackRef;
      trackRef.current?.measureInWindow((x, _y, width) => {
        if (!width || progress.duration <= 0) return;
        const touchX = event.nativeEvent.pageX - x;
        const fraction = Math.max(0, Math.min(1, touchX / width));
        const targetTime = fraction * progress.duration;
        currentPositionRef.current = targetTime;
        setProgress(prev => ({ ...prev, currentTime: targetTime }));
        const activeRef = isFullscreen ? fullscreenVideoRef : videoRef;
        activeRef.current?.seek?.(targetTime);
        if (!isPaused && !isEnded) {
          triggerControlsAutoHide();
        }
      });
    },
    [
      progress.duration,
      isFullscreen,
      isPaused,
      isEnded,
      triggerControlsAutoHide,
    ],
  );

  const progressPercent =
    progress.duration > 0
      ? Math.min(
          100,
          Math.max(0, (progress.currentTime / progress.duration) * 100),
        )
      : 0;

  // Whether controls should be visible right now
  const areControlsVisible = showControls || isPaused || isEnded;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* 1. Underlying Banner Image Layer (Cover Poster) */}
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={styles.posterImage}
          resizeMode={resizeMode}
        />
      ) : (
        <View style={[styles.posterImage, { backgroundColor: fallbackBg }]} />
      )}

      {/* 2. Video Player Engine (when activated) */}
      {isPlaying && NativeVideo ? (
        <View style={styles.playerWrapper}>
          <NativeVideo
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode={resizeMode}
            paused={isPaused || isFullscreen}
            muted={isMuted}
            useTextureView={Platform.OS === 'android'}
            progressUpdateInterval={400}
            onLoad={handleLoad}
            onProgress={handleProgress}
            onEnd={handleEnd}
            onError={() => {
              setIsLoading(false);
              setIsPlaying(false);
              Alert.alert('Video Error', 'Unable to play this video stream.');
            }}
          />

          {/* Transparent Backdrop to Toggle Controls On Tap */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleToggleControls}
          />

          {/* Buffering Spinner */}
          {isLoading && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#A78BFA" />
            </View>
          )}

          {/* Controls Overlay - Fills 100% of container with Top, Center & Bottom distribution */}
          {areControlsVisible && (
            <View style={styles.controlsOverlay} pointerEvents="box-none">
              {/* Top Bar: Title, Mute/Unmute & Fullscreen Toggle */}
              <View style={styles.topControlsRow} pointerEvents="box-none">
                <Text style={styles.videoTitleText} numberOfLines={1}>
                  {title}
                </Text>
                <View style={styles.topActionsGroup} pointerEvents="box-none">
                  {/* Mute / Unmute Button */}
                  <TouchableOpacity
                    style={[
                      styles.controlIconBtn,
                      isMuted && styles.controlIconBtnActive,
                    ]}
                    onPress={handleToggleMute}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <VolumeIcon size={14} color="#FFFFFF" />
                    {isMuted && <View style={styles.muteSlash} />}
                  </TouchableOpacity>

                  {/* Fullscreen Button */}
                  <TouchableOpacity
                    style={styles.controlIconBtn}
                    onPress={handleOpenFullscreen}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <FullscreenIcon size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Center Play / Pause / Replay Button - Vertically centered with flex: 1 */}
              <View style={styles.centerOverlay} pointerEvents="box-none">
                {isEnded ? (
                  <View style={styles.centerActionWrapper}>
                    <TouchableOpacity
                      style={styles.centerActionCircle}
                      onPress={handleReplay}
                      activeOpacity={0.8}
                      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    >
                      <RefreshIcon size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.replayLabelText}>Replay</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.centerActionCircle,
                      isPaused && styles.centerActionCirclePaused,
                    ]}
                    onPress={handleTogglePlayPause}
                    activeOpacity={0.8}
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  >
                    {isPaused ? (
                      <PlayIcon size={20} color="#FFFFFF" />
                    ) : (
                      <PauseIcon size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Bottom Row: Pinned to bottom of video container */}
              <View style={styles.bottomControlsCol} pointerEvents="box-none">
                <View
                  ref={progressTrackRef}
                  style={styles.progressTouchArea}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={e => handleSeekTouch(e, false)}
                  onResponderMove={e => handleSeekTouch(e, false)}
                >
                  <View style={styles.progressBarTrack} pointerEvents="none">
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progressPercent}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      ) : (
        /* 3. Idle Poster Overlay with Center Alignment */
        <TouchableOpacity
          style={styles.idleTouchable}
          activeOpacity={0.88}
          onPress={handleStartPlay}
        >
          {/* Top Preview Bar with Title & Fullscreen option even before playing */}
          <View style={styles.idleTopRow} pointerEvents="box-none">
            {title ? (
              <Text style={styles.videoTitleText} numberOfLines={1}>
                {title}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <TouchableOpacity
              style={styles.controlIconBtn}
              onPress={handleOpenFullscreen}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FullscreenIcon size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Centered Play Button & Label */}
          <View style={styles.idleCenterContent} pointerEvents="none">
            <View style={styles.playCircle}>
              <PlayIcon size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.playText}>Watch Video</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* 4. Fullscreen Modal */}
      <Modal
        visible={isFullscreen}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={handleExitFullscreen}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#000000"
          translucent
        />
        <View style={styles.fullscreenContainer}>
          {NativeVideo && (
            <NativeVideo
              ref={fullscreenVideoRef}
              source={{ uri: videoUrl }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
              paused={isPaused}
              muted={isMuted}
              useTextureView={Platform.OS === 'android'}
              progressUpdateInterval={400}
              onLoad={data => {
                if (currentPositionRef.current > 0) {
                  fullscreenVideoRef.current?.seek?.(
                    currentPositionRef.current,
                  );
                }
                handleLoad(data);
              }}
              onProgress={handleProgress}
              onEnd={handleEnd}
              onError={() => {
                setIsFullscreen(false);
                Alert.alert(
                  'Video Error',
                  'Unable to play this video in full screen.',
                );
              }}
            />
          )}

          {/* Transparent Backdrop to Toggle Fullscreen Controls */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleToggleControls}
          />

          {/* Fullscreen Buffering Spinner */}
          {isLoading && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#A78BFA" />
            </View>
          )}

          {/* Fullscreen Controls Overlay */}
          {areControlsVisible && (
            <View
              style={styles.fullscreenControlsOverlay}
              pointerEvents="box-none"
            >
              {/* Top Row: Title, Mute & Exit Fullscreen */}
              <View style={styles.fullscreenTopRow} pointerEvents="box-none">
                <Text style={styles.fullscreenTitleText} numberOfLines={1}>
                  {title}
                </Text>
                <View style={styles.topActionsGroup} pointerEvents="box-none">
                  {/* Mute / Unmute Button */}
                  <TouchableOpacity
                    style={[
                      styles.controlIconBtn,
                      isMuted && styles.controlIconBtnActive,
                    ]}
                    onPress={handleToggleMute}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <VolumeIcon size={16} color="#FFFFFF" />
                    {isMuted && <View style={styles.muteSlash} />}
                  </TouchableOpacity>

                  {/* Exit Fullscreen Button */}
                  <TouchableOpacity
                    style={styles.exitFullscreenBtn}
                    onPress={handleExitFullscreen}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <ExitFullscreenIcon size={16} color="#FFFFFF" />
                    <Text style={styles.exitFullscreenText}>Exit</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fullscreen Center Play / Pause / Replay Button */}
              <View
                style={styles.fullscreenCenterOverlay}
                pointerEvents="box-none"
              >
                {isEnded ? (
                  <View style={styles.centerActionWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.centerActionCircle,
                        styles.fullscreenCenterCircle,
                      ]}
                      onPress={handleReplay}
                      activeOpacity={0.8}
                      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    >
                      <RefreshIcon size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.replayLabelText}>Replay</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.centerActionCircle,
                      styles.fullscreenCenterCircle,
                      isPaused && styles.centerActionCirclePaused,
                    ]}
                    onPress={handleTogglePlayPause}
                    activeOpacity={0.8}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  >
                    {isPaused ? (
                      <PlayIcon size={26} color="#FFFFFF" />
                    ) : (
                      <PauseIcon size={26} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Fullscreen Bottom Row: Time & Interactive Seek Bar */}
              <View style={styles.fullscreenBottomCol} pointerEvents="box-none">
                <View style={styles.bottomMetaRow} pointerEvents="box-none">
                  <Text style={styles.fullscreenTimeText}>
                    {formatTime(progress.currentTime)} /{' '}
                    {formatTime(progress.duration)}
                  </Text>
                  <TouchableOpacity
                    style={styles.fullscreenExitSmallBtn}
                    onPress={handleExitFullscreen}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <ExitFullscreenIcon size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Fullscreen Interactive Seek Bar */}
                <View
                  ref={fullscreenProgressTrackRef}
                  style={styles.progressTouchArea}
                  onStartShouldSetResponder={() => true}
                  onMoveShouldSetResponder={() => true}
                  onResponderGrant={e => handleSeekTouch(e, true)}
                  onResponderMove={e => handleSeekTouch(e, true)}
                >
                  <View style={styles.progressBarTrack} pointerEvents="none">
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${progressPercent}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F0E1E',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    marginTop: 12,
    marginBottom: 12,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  playerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  idleTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  idleTopRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  idleCenterContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3, // Optical compensation for triangular play icon centroid
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  playText: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.family.bold,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    zIndex: 2,
    elevation: 2,
  },
  topControlsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoTitleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.family.medium,
    flex: 1,
    marginRight: 8,
  },
  controlIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  controlIconBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    borderColor: 'rgba(239, 68, 68, 1)',
  },
  muteSlash: {
    position: 'absolute',
    width: 18,
    height: 1.5,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  centerOverlay: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerActionWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  centerActionCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(124, 58, 237, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  centerActionCirclePaused: {
    paddingLeft: 3, // Optical centering for play triangle
  },
  replayLabelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Fonts.family.semiBold,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomControlsCol: {
    width: '100%',
    paddingBottom: 2,
  },
  bottomMetaRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  timeText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontFamily: Fonts.family.medium,
  },
  fullscreenTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  fullscreenLabel: {
    color: '#CBD5E1',
    fontSize: 10,
    fontFamily: Fonts.family.medium,
  },
  progressTouchArea: {
    width: '100%',
    height: 16,
    justifyContent: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#A78BFA',
  },

  /* Fullscreen Modal Styles */
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
  },
  fullscreenControlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
    zIndex: 2,
  },
  fullscreenTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullscreenTitleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.family.semiBold,
    flex: 1,
    marginRight: 16,
  },
  exitFullscreenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  exitFullscreenText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.family.medium,
  },
  fullscreenCenterOverlay: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenCenterCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  fullscreenBottomCol: {
    width: '100%',
  },
  fullscreenTimeText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontFamily: Fonts.family.medium,
  },
  fullscreenExitSmallBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
});

export default InlineVideoPlayer;
