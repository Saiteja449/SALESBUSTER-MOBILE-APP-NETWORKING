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
} from 'react-native';
import { PlayIcon, PauseIcon, VolumeIcon, RefreshIcon } from '../../icons/Icons';
import { Fonts } from '../../styles/Fonts';

// Dynamically resolve react-native-video so the app remains safe
let NativeVideo = null;
try {
  const RNVideo = require('react-native-video');
  NativeVideo = RNVideo?.default || RNVideo;
} catch {
  NativeVideo = null;
}

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

  const videoRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // Auto-hide controls after 3 seconds of playback
  const triggerControlsAutoHide = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  const handleStartPlay = () => {
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
  };

  const handleTogglePlayPause = () => {
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
  };

  const handleToggleMute = (e) => {
    e?.stopPropagation?.();
    setIsMuted(prev => !prev);
    triggerControlsAutoHide();
  };

  const handleReplay = (e) => {
    e?.stopPropagation?.();
    if (videoRef.current?.seek) {
      videoRef.current.seek(0);
    }
    setIsEnded(false);
    setIsPaused(false);
    triggerControlsAutoHide();
  };

  const handleProgress = (data) => {
    setProgress({
      currentTime: data.currentTime,
      duration: data.seekableDuration || data.duration || progress.duration,
    });
  };

  const handleLoad = (data) => {
    setIsLoading(false);
    setProgress(prev => ({
      ...prev,
      duration: data.duration || prev.duration,
    }));
  };

  const handleEnd = () => {
    setIsEnded(true);
    setIsPaused(true);
    setShowControls(true);
  };

  const progressPercent =
    progress.duration > 0
      ? Math.min(100, Math.max(0, (progress.currentTime / progress.duration) * 100))
      : 0;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* 1. Video Player Engine (when activated) */}
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
            paused={isPaused}
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
              {/* Top Bar: Title & Mute Toggle */}
              <View style={styles.topControlsRow} pointerEvents="box-none">
                <Text style={styles.videoTitleText} numberOfLines={1}>
                  {title}
                </Text>
                <TouchableOpacity
                  style={[styles.muteBtn, isMuted && styles.muteBtnActive]}
                  onPress={handleToggleMute}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <VolumeIcon size={16} color="#FFFFFF" />
                  {isMuted && <View style={styles.muteSlash} />}
                </TouchableOpacity>
              </View>

              {/* Center Play / Pause / Replay Button */}
              <View style={styles.centerOverlay} pointerEvents="none">
                {isEnded ? (
                  <TouchableOpacity
                    style={styles.centerActionCircle}
                    onPress={handleReplay}
                    activeOpacity={0.8}
                  >
                    <RefreshIcon size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.centerActionCircle}>
                    {isPaused ? (
                      <PlayIcon size={22} color="#FFFFFF" />
                    ) : (
                      <PauseIcon size={22} color="#FFFFFF" />
                    )}
                  </View>
                )}
              </View>

              {/* Bottom Progress Bar */}
              <View style={styles.progressBarTrack} pointerEvents="none">
                <View
                  style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
                />
              </View>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        /* 2. Poster / Thumbnail Banner (Initial Idle State) */
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={0.88}
          onPress={handleStartPlay}
        >
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={styles.posterImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.posterImage, { backgroundColor: fallbackBg }]} />
          )}

          {/* Dark Overlay with Center Play Circle */}
          <View style={styles.idleOverlay}>
            <View style={styles.playCircle}>
              <PlayIcon size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.playText}>Watch Video Preview</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 160,
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  topControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoTitleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.family.medium,
    flex: 1,
    marginRight: 8,
  },
  muteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  muteBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.7)',
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
  centerActionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(124, 58, 237, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  progressBarTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#A78BFA',
  },
});

export default InlineVideoPlayer;
