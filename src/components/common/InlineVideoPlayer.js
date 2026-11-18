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

const formatTime = (seconds) => {
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

  // Auto-hide controls after 3.5 seconds of playback
  const triggerControlsAutoHide = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const handleStartPlay = useCallback(() => {
    if (!videoUrl) return;

    if (!NativeVideo) {
      // Fallback if native package is not yet built/installed
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

  const handleReplay = useCallback((e) => {
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
  }, [isFullscreen, triggerControlsAutoHide]);

  const handleTogglePlayPause = useCallback(() => {
    if (!isPlaying) {
      handleStartPlay();
      return;
    }
    if (isEnded) {
      handleReplay();
      return;
    }
    setIsPaused(prev => !prev);
    triggerControlsAutoHide();
  }, [isPlaying, isEnded, handleStartPlay, handleReplay, triggerControlsAutoHide]);

  const handleToggleMute = useCallback((e) => {
    e?.stopPropagation?.();
    setIsMuted(prev => !prev);
    triggerControlsAutoHide();
  }, [triggerControlsAutoHide]);

  const handleOpenFullscreen = useCallback((e) => {
    e?.stopPropagation?.();
    if (!isPlaying) {
      handleStartPlay();
    }
    setIsFullscreen(true);
    triggerControlsAutoHide();
  }, [isPlaying, handleStartPlay, triggerControlsAutoHide]);

  const handleExitFullscreen = useCallback((e) => {
    e?.stopPropagation?.();
    setIsFullscreen(false);
    setTimeout(() => {
      if (videoRef.current?.seek && currentPositionRef.current > 0) {
        videoRef.current.seek(currentPositionRef.current);
      }
    }, 100);
    triggerControlsAutoHide();
  }, [triggerControlsAutoHide]);

  const handleProgress = useCallback((data) => {
    currentPositionRef.current = data.currentTime;
    setProgress(prev => ({
      currentTime: data.currentTime,
      duration: data.seekableDuration || data.duration || prev.duration,
    }));
  }, []);

  const handleLoad = useCallback((data) => {
    setIsLoading(false);
    setProgress(prev => ({
      ...prev,
      duration: data.duration || prev.duration,
    }));
  }, []);

  const handleEnd = useCallback(() => {
    setIsEnded(true);
    setIsPaused(true);
    setShowControls(true);
  }, []);

  const progressPercent =
    progress.duration > 0
      ? Math.min(100, Math.max(0, (progress.currentTime / progress.duration) * 100))
      : 0;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* 1. Underlying Banner Image Layer (Cover Poster) */}
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={styles.posterImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.posterImage, { backgroundColor: fallbackBg }]} />
      )}

      {/* 2. Video Player Engine (when activated) */}
      {isPlaying && NativeVideo ? (
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={handleTogglePlayPause}
        >
          <NativeVideo
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            paused={isPaused || isFullscreen}
            muted={isMuted}
            onLoad={handleLoad}
            onProgress={handleProgress}
            onEnd={handleEnd}
            onError={() => {
              setIsLoading(false);
              setIsPlaying(false);
              Alert.alert('Video Error', 'Unable to play this video stream.');
            }}
          />

          {/* Buffering Spinner */}
          {isLoading && (
            <View style={styles.centerOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#A78BFA" />
            </View>
          )}

          {/* Controls Overlay */}
          {(showControls || isPaused || isEnded) && (
            <View style={styles.controlsOverlay} pointerEvents="box-none">
              {/* Top Bar: Title, Mute & Fullscreen Toggle */}
              <View style={styles.topControlsRow} pointerEvents="box-none">
                <Text style={styles.videoTitleText} numberOfLines={1}>
                  {title}
                </Text>
                <View style={styles.topActionsGroup} pointerEvents="box-none">
                  <TouchableOpacity
                    style={[styles.controlIconBtn, isMuted && styles.controlIconBtnActive]}
                    onPress={handleToggleMute}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <VolumeIcon size={15} color="#FFFFFF" />
                    {isMuted && <View style={styles.muteSlash} />}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.controlIconBtn}
                    onPress={handleOpenFullscreen}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <FullscreenIcon size={15} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Center Play / Pause / Replay Button */}
              <View style={styles.centerOverlay} pointerEvents="box-none">
                {isEnded ? (
                  <View style={styles.centerActionWrapper}>
                    <TouchableOpacity
                      style={styles.centerActionCircle}
                      onPress={handleReplay}
                      activeOpacity={0.8}
                      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    >
                      <RefreshIcon size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.replayLabelText}>Replay</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.centerActionCircle}
                    onPress={handleTogglePlayPause}
                    activeOpacity={0.8}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  >
                    {isPaused ? (
                      <PlayIcon size={22} color="#FFFFFF" />
                    ) : (
                      <PauseIcon size={22} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Bottom Row: Time & Progress Track */}
              <View style={styles.bottomControlsCol} pointerEvents="box-none">
                <View style={styles.bottomMetaRow} pointerEvents="box-none">
                  <Text style={styles.timeText}>
                    {formatTime(progress.currentTime)} / {formatTime(progress.duration)}
                  </Text>
                  <TouchableOpacity
                    style={styles.fullscreenTextBtn}
                    onPress={handleOpenFullscreen}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <FullscreenIcon size={13} color="#CBD5E1" />
                    <Text style={styles.fullscreenLabel}>Fullscreen</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.progressBarTrack} pointerEvents="none">
                  <View
                    style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                  />
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        /* 3. Idle Poster Overlay with Play Circle (Initial State) */
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={0.88}
          onPress={handleStartPlay}
        >
          {/* Dark Overlay with Center Play Circle */}
          <View style={styles.idleOverlay}>
            <View style={styles.playCircle}>
              <PlayIcon size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.playText}>Watch Video Preview</Text>
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
        <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={handleTogglePlayPause}
          >
            {NativeVideo && (
              <NativeVideo
                ref={fullscreenVideoRef}
                source={{
                  uri: videoUrl,
                  startPosition: Math.floor((currentPositionRef.current || 0) * 1000),
                }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
                paused={isPaused}
                muted={isMuted}
                onLoad={(data) => {
                  if (currentPositionRef.current > 0) {
                    fullscreenVideoRef.current?.seek?.(currentPositionRef.current);
                  }
                  handleLoad(data);
                }}
                onProgress={handleProgress}
                onEnd={handleEnd}
                onError={() => {
                  setIsFullscreen(false);
                  Alert.alert('Video Error', 'Unable to play this video stream in full screen.');
                }}
              />
            )}

            {/* Fullscreen Buffering Spinner */}
            {isLoading && (
              <View style={styles.centerOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color="#A78BFA" />
              </View>
            )}

            {/* Fullscreen Controls Overlay */}
            {(showControls || isPaused || isEnded) && (
              <View style={styles.fullscreenControlsOverlay} pointerEvents="box-none">
                {/* Top Row: Title, Mute & Exit Fullscreen */}
                <View style={styles.fullscreenTopRow} pointerEvents="box-none">
                  <Text style={styles.fullscreenTitleText} numberOfLines={1}>
                    {title}
                  </Text>
                  <View style={styles.topActionsGroup} pointerEvents="box-none">
                    <TouchableOpacity
                      style={[styles.controlIconBtn, isMuted && styles.controlIconBtnActive]}
                      onPress={handleToggleMute}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <VolumeIcon size={18} color="#FFFFFF" />
                      {isMuted && <View style={styles.muteSlash} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.exitFullscreenBtn}
                      onPress={handleExitFullscreen}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <ExitFullscreenIcon size={18} color="#FFFFFF" />
                      <Text style={styles.exitFullscreenText}>Exit</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Center Play / Pause / Replay Button */}
                <View style={styles.centerOverlay} pointerEvents="box-none">
                  {isEnded ? (
                    <View style={styles.centerActionWrapper}>
                      <TouchableOpacity
                        style={[styles.centerActionCircle, styles.fullscreenCenterCircle]}
                        onPress={handleReplay}
                        activeOpacity={0.8}
                        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                      >
                        <RefreshIcon size={28} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={styles.replayLabelText}>Replay Video</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.centerActionCircle, styles.fullscreenCenterCircle]}
                      onPress={handleTogglePlayPause}
                      activeOpacity={0.8}
                      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    >
                      {isPaused ? (
                        <PlayIcon size={28} color="#FFFFFF" />
                      ) : (
                        <PauseIcon size={28} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Bottom Row: Fullscreen Time & Progress Track */}
                <View style={styles.fullscreenBottomCol} pointerEvents="box-none">
                  <View style={styles.bottomMetaRow} pointerEvents="box-none">
                    <Text style={styles.fullscreenTimeText}>
                      {formatTime(progress.currentTime)} / {formatTime(progress.duration)}
                    </Text>
                    <TouchableOpacity
                      style={styles.fullscreenTextBtn}
                      onPress={handleExitFullscreen}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <ExitFullscreenIcon size={15} color="#CBD5E1" />
                      <Text style={styles.fullscreenLabel}>Exit Fullscreen</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.progressBarTrack} pointerEvents="none">
                    <View
                      style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                    />
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 260,
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
  idleOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  playText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.family.bold,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  muteSlash: {
    position: 'absolute',
    width: 18,
    height: 1.5,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerActionWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  centerActionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(124, 58, 237, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  replayLabelText: {
    color: '#FFFFFF',
    fontSize: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  timeText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontFamily: Fonts.family.medium,
  },
  fullscreenTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  fullscreenLabel: {
    color: '#CBD5E1',
    fontSize: 11,
    fontFamily: Fonts.family.medium,
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
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  fullscreenTopRow: {
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
