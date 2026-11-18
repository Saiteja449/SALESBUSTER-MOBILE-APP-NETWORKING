import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
  Platform,
} from 'react-native';
import Text from '../../components/common/AppText';
import { Fonts } from '../../styles/Fonts';
import { SalesBusterLogo } from '../../components/common/BrandLogo';

const SPLASH_BG = require('../../../assets/images/Splash-background.png');
const SPLASH_AI = require('../../../assets/images/Splash-AI.png');

const SplashScreen = ({ onAnimationComplete }) => {
  const { width, height } = useWindowDimensions();
  const isCompact = height < 680 || width < 360;

  // Logo height reveal animation (grows height smoothly from the bottom up)
  const logoProgress = useRef(new Animated.Value(0)).current;

  // Sequential text animations for: 1. "Capture"  2. "• Control"  3. "• Convert"
  const text1Opacity = useRef(new Animated.Value(0)).current;
  const text1TranslateY = useRef(new Animated.Value(6)).current;

  const text2Opacity = useRef(new Animated.Value(0)).current;
  const text2TranslateY = useRef(new Animated.Value(6)).current;

  const text3Opacity = useRef(new Animated.Value(0)).current;
  const text3TranslateY = useRef(new Animated.Value(6)).current;

  // Pixel-perfect sizing matching reference
  const chipWidth = isCompact ? 116 : Math.min(136, Math.round(width * 0.36));
  const chipHeight = Math.round((chipWidth * 126) / 140);

  const logoWidth = isCompact ? 190 : Math.min(226, Math.round(width * 0.58));
  const logoHeight = Math.round((logoWidth * 53) / 250);

  // Exact vertical anchor coordinates (AI image lowered by 8% of screen height)
  const chipTop = Math.round(height * 0.435 - chipHeight / 2);
  const logoTop = Math.max(
    Math.round(height * 0.55 - logoHeight / 2),
    chipTop + chipHeight + (isCompact ? 14 : 20),
  );
  const taglineTop = Math.round(logoTop + logoHeight + (isCompact ? 10 : 14));

  useEffect(() => {
    let isCancelled = false;

    // Sequential choreography:
    // 1. Steady display of AI microchip, small pause before logo reveal
    // 2. Logo increases height smoothly from the bottom
    // 3. "Capture" appears
    // 4. "• Control" appears
    // 5. "• Convert" appears
    // 6. Rest pause so the complete screen is readable
    // 7. Trigger onAnimationComplete
    const masterSequence = Animated.sequence([
      // Steady display of chip, brief pause before logo entrance
      Animated.delay(200),

      // 2. Logo increases height smoothly from the bottom up
      Animated.timing(logoProgress, {
        toValue: 1,
        duration: 750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),

      Animated.delay(100),

      // 3. Text 1: "Capture" appears
      Animated.parallel([
        Animated.timing(text1Opacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(text1TranslateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(120),

      // 4. Text 2: "• Control" appears
      Animated.parallel([
        Animated.timing(text2Opacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(text2TranslateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(120),

      // 5. Text 3: "• Convert" appears
      Animated.parallel([
        Animated.timing(text3Opacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(text3TranslateY, {
          toValue: 0,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // 6. Rest pause for comfortable reading before navigation
      Animated.delay(650),
    ]);

    masterSequence.start(({ finished }) => {
      if (finished && !isCancelled) {
        onAnimationComplete?.();
      }
    });

    return () => {
      isCancelled = true;
      masterSequence.stop();
    };
  }, [
    logoProgress,
    text1Opacity,
    text1TranslateY,
    text2Opacity,
    text2TranslateY,
    text3Opacity,
    text3TranslateY,
    onAnimationComplete,
  ]);

  // Increasing height from the bottom:
  // scaleY goes from 0.01 to 1, while translateY moves from logoHeight/2 to 0.
  // Because default transform origin is the center (0.5, 0.5), this anchors the bottom baseline fixed
  // at `logoTop + logoHeight` while the top edge expands upwards smoothly to full height.
  const logoScaleY = logoProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.01, 1],
  });
  const logoTranslateY = logoProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [logoHeight / 2, 0],
  });
  const logoOpacity = logoProgress.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0, 1, 1],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#070719"
        translucent={Platform.OS === 'android'}
      />

      {/* 1. Fullscreen Circuit Board Background */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image
          source={SPLASH_BG}
          style={styles.bgImage}
          resizeMode="cover"
        />
      </View>

      {/* 2. Absolute Foreground Elements */}
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {/* AI Microchip - 0.7 opacity, no blinking */}
        <View
          style={[
            styles.chipWrapper,
            {
              top: chipTop,
            },
          ]}
        >
          <Image
            source={SPLASH_AI}
            style={[
              styles.chipImage,
              { width: chipWidth, height: chipHeight },
            ]}
            resizeMode="contain"
          />
        </View>

        {/* SalesBuster Wordmark Logo - Smooth height increase from bottom */}
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              top: logoTop,
              opacity: logoOpacity,
              transform: [
                { translateY: logoTranslateY },
                { scaleY: logoScaleY },
              ],
            },
          ]}
        >
          <SalesBusterLogo
            width={logoWidth}
            height={logoHeight}
            color1="#9C40FA"
            color2="#5013C7"
          />
        </Animated.View>

        {/* Tagline: Capture • Control • Convert appearing sequentially one by one */}
        <View style={[styles.taglineWrapper, { top: taglineTop }]}>
          <View style={styles.taglineRow}>
            {/* 1. Capture */}
            <Animated.View
              style={[
                styles.wordWrapper,
                {
                  opacity: text1Opacity,
                  transform: [{ translateY: text1TranslateY }],
                },
              ]}
            >
              <Text style={[styles.taglineWord, isCompact && styles.taglineWordCompact]}>
                Capture
              </Text>
            </Animated.View>

            {/* Bullet Dot 1 */}
            <Animated.View
              style={[
                styles.dotWrapper,
                {
                  opacity: text2Opacity,
                  transform: [{ translateY: text2TranslateY }],
                },
              ]}
            >
              <Text style={[styles.taglineDot, isCompact && styles.taglineDotCompact]}>
                •
              </Text>
            </Animated.View>

            {/* 2. Control */}
            <Animated.View
              style={[
                styles.wordWrapper,
                {
                  opacity: text2Opacity,
                  transform: [{ translateY: text2TranslateY }],
                },
              ]}
            >
              <Text style={[styles.taglineWord, isCompact && styles.taglineWordCompact]}>
                Control
              </Text>
            </Animated.View>

            {/* Bullet Dot 2 */}
            <Animated.View
              style={[
                styles.dotWrapper,
                {
                  opacity: text3Opacity,
                  transform: [{ translateY: text3TranslateY }],
                },
              ]}
            >
              <Text style={[styles.taglineDot, isCompact && styles.taglineDotCompact]}>
                •
              </Text>
            </Animated.View>

            {/* 3. Convert */}
            <Animated.View
              style={[
                styles.wordWrapper,
                {
                  opacity: text3Opacity,
                  transform: [{ translateY: text3TranslateY }],
                },
              ]}
            >
              <Text style={[styles.taglineWord, isCompact && styles.taglineWordCompact]}>
                Convert
              </Text>
            </Animated.View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070719',
  },
  bgImage: {
    width: '100%',
    height: '100%',
  },
  chipWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipImage: {
    opacity:0.3,
  },
  logoWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  taglineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  taglineWord: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: Fonts.family.medium,
    fontWeight: '500',
    letterSpacing: 0.8,
    opacity: 0.95,
  },
  taglineWordCompact: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  taglineDot: {
    color: '#FFFFFF',
    fontSize: 12.5,
    opacity: 0.75,
  },
  taglineDotCompact: {
    fontSize: 10,
  },
});

export default SplashScreen;
