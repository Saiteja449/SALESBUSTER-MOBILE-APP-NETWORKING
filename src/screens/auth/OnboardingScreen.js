import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient,
  Rect,
  Stop,
  Path,
} from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Text from '../../components/common/AppText';
import { Fonts } from '../../styles/Fonts';

export const APP_ONBOARDING_KEY = '@has_seen_app_onboarding_v1';

const BG_COLOR = '#080619';

const ONBOARDING_PAGES = [
  {
    id: 'onboarding-1',
    image: require('../../../assets/images/onboarding-1.png'),
    titleLine1: 'Network Smarter',
    titleLine2: 'Grow Bigger',
    subtitle: 'No Business Cards. No Manual Entry.\nJust Talk & Let AI do the Rest.',
  },
  {
    id: 'onboarding-2',
    image: require('../../../assets/images/onboarding-2.png'),
    titleLine1: 'Voice & Vision',
    titleLine2: 'Zero Typing',
    subtitle: 'Speak naturally or snap a business card for\ninstant auto-fill',
  },
  {
    id: 'onboarding-3',
    image: require('../../../assets/images/onboarding-3.png'),
    titleLine1: 'Instant Follow-Up',
    titleLine2: 'Zero Delay',
    subtitle: 'Delight leads right before they walk away',
  },
];

const ArrowRight = ({ size = 15, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12h14M13 6l6 6-6 6"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const OnboardingScreen = ({ navigation, onComplete }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  // Exact proportion from required UI mockup: Hero occupies top ~68%
  const heroHeight = Math.round(height * 0.68);
  const nextBtnWidth = 118;
  const nextBtnHeight = 44;
  const continueBtnWidth = width - 48;
  const continueBtnHeight = 50;

  const handleFinish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(APP_ONBOARDING_KEY, 'true');
    } catch (e) {
      console.warn('Error saving onboarding state:', e);
    }
    if (onComplete) {
      onComplete();
    } else if (navigation) {
      navigation.replace('Login');
    }
  }, [navigation, onComplete]);

  const handleNext = useCallback(() => {
    if (activeIndex < ONBOARDING_PAGES.length - 1) {
      const nextIndex = activeIndex + 1;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setActiveIndex(nextIndex);
    } else {
      handleFinish();
    }
  }, [activeIndex, handleFinish]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const renderItem = ({ item }) => {
    return (
      <View style={[styles.slideContainer, { width, height }]}>
        {/* Top Hero Graphic */}
        <View style={[styles.heroWrapper, { height: heroHeight, width }]}>
          <Image
            source={item.image}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* Seamless gradient fade from lower torso into dark background */}
          <Svg
            style={styles.fadeOverlay}
            width={width}
            height={90}
          >
            <Defs>
              <LinearGradient id={`fade_${item.id}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={BG_COLOR} stopOpacity="0" />
                <Stop offset="0.65" stopColor={BG_COLOR} stopOpacity="0.8" />
                <Stop offset="1" stopColor={BG_COLOR} stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={width} height={90} fill={`url(#fade_${item.id})`} />
          </Svg>
        </View>

        {/* Text Section (starts at ~70% of screen height) */}
        <View style={styles.textSection}>
          <Text style={styles.titleLine1}>{item.titleLine1}</Text>
          <Text style={styles.titleLine2}>{item.titleLine2}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
      </View>
    );
  };

  const isLastScreen = activeIndex === ONBOARDING_PAGES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={BG_COLOR}
        translucent={Platform.OS === 'android'}
      />

      {/* Top Header with Skip on right */}
      <View
        style={[
          styles.headerOverlay,
          {
            top: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 6 : insets.top + 6,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleFinish}
          activeOpacity={0.7}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Paging Carousel */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_PAGES}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
      />

      {/* Bottom Controls Area (90%-92% of screen height) */}
      <View
        style={[
          styles.bottomControls,
          {
            paddingBottom: Math.max(insets.bottom + 16, 28),
          },
        ]}
      >
        {!isLastScreen ? (
          <View style={styles.bottomRow}>
            {/* Pagination Indicators: 3 circular dots */}
            <View style={styles.paginationContainer}>
              {ONBOARDING_PAGES.map((_, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <TouchableOpacity
                    key={`dot-${idx}`}
                    onPress={() => {
                      flatListRef.current?.scrollToIndex({ index: idx, animated: true });
                      setActiveIndex(idx);
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  >
                    <View
                      style={[
                        styles.dot,
                        isActive ? styles.dotActive : styles.dotInactive,
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Next Button with exact pill dimensions & horizontal gradient */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleNext}
              style={[styles.nextBtn, { width: nextBtnWidth, height: nextBtnHeight }]}
            >
              <Svg
                width={nextBtnWidth}
                height={nextBtnHeight}
                viewBox={`0 0 ${nextBtnWidth} ${nextBtnHeight}`}
                style={StyleSheet.absoluteFill}
              >
                <Defs>
                  <LinearGradient id="next_pill_grad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#5013C7" />
                    <Stop offset="1" stopColor="#9C40FA" />
                  </LinearGradient>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width={nextBtnWidth}
                  height={nextBtnHeight}
                  rx={nextBtnHeight / 2}
                  ry={nextBtnHeight / 2}
                  fill="url(#next_pill_grad)"
                />
              </Svg>
              <View style={styles.btnInnerRow}>
                <Text style={styles.nextBtnText}>Next</Text>
                <ArrowRight size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.finalActionWrapper}>
            {/* Screen 3: Full Width Continue Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleFinish}
              style={[
                styles.continueBtn,
                { width: continueBtnWidth, height: continueBtnHeight },
              ]}
            >
              <Svg
                width={continueBtnWidth}
                height={continueBtnHeight}
                viewBox={`0 0 ${continueBtnWidth} ${continueBtnHeight}`}
                style={StyleSheet.absoluteFill}
              >
                <Defs>
                  <LinearGradient id="cont_pill_grad" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#5013C7" />
                    <Stop offset="1" stopColor="#9C40FA" />
                  </LinearGradient>
                </Defs>
                <Rect
                  x="0"
                  y="0"
                  width={continueBtnWidth}
                  height={continueBtnHeight}
                  rx={continueBtnHeight / 2}
                  ry={continueBtnHeight / 2}
                  fill="url(#cont_pill_grad)"
                />
              </Svg>
              <View style={styles.btnInnerRow}>
                <Text style={styles.continueBtnText}>Continue to SalesBuster</Text>
                <ArrowRight size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  headerOverlay: {
    position: 'absolute',
    right: 20,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  skipButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: Fonts.family.medium,
    opacity: 0.85,
    letterSpacing: 0.2,
  },
  slideContainer: {
    flex: 1,
    backgroundColor: BG_COLOR,
  },
  heroWrapper: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: BG_COLOR,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  fadeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  textSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 8,
  },
  titleLine1: {
    color: '#FFFFFF',
    fontSize: 23,
    fontFamily: Fonts.family.bold,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  titleLine2: {
    color: '#8B5CF6',
    fontSize: 23,
    fontFamily: Fonts.family.bold,
    textAlign: 'center',
    letterSpacing: -0.2,
    marginTop: 3,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: Fonts.family.regular,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 10,
    maxWidth: 300,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    zIndex: 25,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    backgroundColor: '#8B5CF6',
  },
  dotInactive: {
    backgroundColor: 'rgba(139, 92, 246, 0.28)',
  },
  nextBtn: {
    borderRadius: 22,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: Fonts.family.semiBold,
    letterSpacing: 0.1,
  },
  finalActionWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  continueBtn: {
    borderRadius: 25,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontFamily: Fonts.family.bold,
    letterSpacing: 0.2,
  },
});

export default OnboardingScreen;
