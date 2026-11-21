import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';

let Video = null;
try {
  const RNVideo = require('react-native-video');
  Video = RNVideo?.default || RNVideo;
} catch {
  Video = null;
}

const CountdownBeepPlayer = ({ onFinished }) => {
  const finishedRef = useRef(false);

  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinished?.();
  }, [onFinished]);

  useEffect(() => {
    // Prevent a failed native player from leaving microphone input muted.
    const timeout = setTimeout(finishOnce, 4000);
    return () => clearTimeout(timeout);
  }, [finishOnce]);

  if (!Video) {
    return null;
  }

  return (
    <Video
      source={require('../../../assets/audio/voice-countdown-beep-loud.wav')}
      paused={false}
      repeat={false}
      volume={1}
      ignoreSilentSwitch="ignore"
      mixWithOthers="duck"
      playInBackground={false}
      onEnd={finishOnce}
      onError={finishOnce}
      style={styles.audioOnlySurface}
    />
  );
};

const styles = StyleSheet.create({
  audioOnlySurface: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export default CountdownBeepPlayer;
