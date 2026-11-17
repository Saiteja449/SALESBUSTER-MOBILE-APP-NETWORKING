import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Defs,
  Mask,
  Rect,
  Path,
  Circle,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../common/AppText';
import { Fonts } from '../../styles/Fonts';

// ---------------------------------------------------------------------------
// Step Configuration (7 Comprehensive Scenarios)
// ---------------------------------------------------------------------------
export const GUIDANCE_STEPS = [
  {
    key: 'events',
    stepNumber: 1,
    badgeText: '1 OF 7 • ACTIVE EVENT',
    title: 'Event Workspace',
    subtitle:
      'Select the active exhibition or conference you are attending, or create a new event. All captured leads stay neatly organized by event.',
    tip: 'Switch active events or add new ones anytime from the top bar.',
    iconType: 'calendar',
    accentColor: '#8B5CF6',
  },
  {
    key: 'audio',
    stepNumber: 2,
    badgeText: '2 OF 7 • VOICE CAPTURE',
    title: 'One-Tap Voice AI',
    subtitle:
      'Tap to speak freely with booth visitors. SalesBuster AI automatically detects visitor names, phone numbers, and notes without manual typing.',
    tip: 'Works even in noisy exhibition halls.',
    iconType: 'microphone',
    accentColor: '#9C40FA',
  },
  {
    key: 'image',
    stepNumber: 3,
    badgeText: '3 OF 7 • CARD SCANNER',
    title: 'Scan Business Cards',
    subtitle:
      'Take a quick photo of physical cards or visitor badges. Instant AI OCR extracts contact details and auto-fills your lead form in seconds.',
    tip: 'Extracts name, company, email & mobile phone.',
    iconType: 'camera',
    accentColor: '#0284C7',
  },
  {
    key: 'form',
    stepNumber: 4,
    badgeText: '4 OF 7 • SMART FORM',
    title: 'Review & Edit Details',
    subtitle:
      'Review auto-filled fields, add key discussion takeaways, or take an optional booth selfie with the visitor before saving.',
    tip: 'You can edit any field manually or let AI complete it.',
    iconType: 'form',
    accentColor: '#F59E0B',
  },
  {
    key: 'save',
    stepNumber: 5,
    badgeText: '5 OF 7 • INSTANT WHATSAPP',
    title: 'Save & Send WhatsApp',
    subtitle:
      'Save the contact to your CRM and instantly send an automated product brochure or thank-you greeting directly to the visitor via WhatsApp.',
    tip: 'Engages leads immediately while the conversation is fresh.',
    iconType: 'whatsapp',
    accentColor: '#10B981',
  },
  {
    key: 'contacts',
    stepNumber: 6,
    badgeText: '6 OF 7 • CONTACTS LIST',
    title: 'Event Contacts Directory',
    subtitle:
      'Access and search all captured leads across all events. Filter by event, export to CSV/Excel, or call leads directly.',
    tip: 'Never lose track of high-value prospects after the expo.',
    iconType: 'users',
    accentColor: '#EC4899',
  },
  {
    key: 'products',
    stepNumber: 7,
    badgeText: '7 OF 7 • OUR PRODUCTS',
    title: 'Product Catalogs & Collaterals',
    subtitle:
      'Quickly showcase your company products, feature brochures, and videos to booth visitors on the spot.',
    tip: 'Share digital product PDFs directly during meetings.',
    iconType: 'grid',
    accentColor: '#6366F1',
  },
];

// ---------------------------------------------------------------------------
// Custom Vector Icons
// ---------------------------------------------------------------------------
const StepIcon = ({ type, size = 18, color = '#FFFFFF' }) => {
  switch (type) {
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect
            x="3"
            y="4"
            width="18"
            height="18"
            rx="3"
            stroke={color}
            strokeWidth={2}
          />
          <Path d="M3 10H21" stroke={color} strokeWidth={2} />
          <Path
            d="M8 2V6M16 2V6"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'microphone':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="8" y="2" width="8" height="12" rx="4" fill={color} />
          <Path
            d="M4 10V11C4 15.4183 7.58172 19 12 19C16.4183 19 20 15.4183 20 11V10"
            stroke={color}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <Path
            d="M12 19V22M8 22H16"
            stroke={color}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        </Svg>
      );
    case 'camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle
            cx="12"
            cy="13"
            r="4"
            stroke={color}
            strokeWidth={2}
          />
        </Svg>
      );
    case 'form':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M14 2V8H20M16 13H8M16 17H8M10 9H8"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'whatsapp':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1033 15.2862C19.5115 16.4505 18.6548 17.4407 17.6119 18.1659C16.569 18.8911 15.3713 19.3292 14.1287 19.4402C12.886 19.5511 11.636 19.3316 10.493 18.801L3 21L5.27 13.738C4.69896 12.5451 4.4699 11.2223 4.60538 9.90163C4.74086 8.58097 5.23594 7.31144 6.04169 6.22014C6.84743 5.12884 7.9338 4.25687 9.19259 3.69176C10.4514 3.12666 11.8367 2.88975 13.208 3.00473C15.2897 3.17865 17.2023 4.14856 18.5714 5.72428C19.9405 7.29999 20.6625 9.36297 21 11.5Z"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'users':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle
            cx="9"
            cy="7"
            r="4"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'grid':
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="3" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
          <Rect x="14" y="3" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
          <Rect x="14" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
          <Rect x="3" y="14" width="7" height="7" rx="1.5" stroke={color} strokeWidth={2} />
        </Svg>
      );
  }
};

const CloseIcon = ({ size = 15, color = '#94A3B8' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ArrowRightIcon = ({ size = 15, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12H19M13 6L19 12L13 18"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CheckIcon = ({ size = 15, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 6L9 17L4 12"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export const GuestActionableGuidance = ({
  visible,
  onClose,
  targets = {},
  onStepChange,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Animated values
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Continuous gentle halo pulse around spotlight
  useEffect(() => {
    let loop;
    if (visible) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
    } else {
      pulseAnim.setValue(0);
    }
    return () => loop?.stop();
  }, [visible, pulseAnim]);

  // Reset to step 0 when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
      cardOpacity.setValue(1);
      cardTranslateY.setValue(0);
      onStepChange?.(0, GUIDANCE_STEPS[0].key);
    }
  }, [visible, cardOpacity, cardTranslateY, onStepChange]);

  const currentStep = GUIDANCE_STEPS[currentStepIndex] || GUIDANCE_STEPS[0];

  // Dynamic / fallback layout calculations for all 7 targets
  const currentTargetLayout = useMemo(() => {
    const raw = targets?.[currentStep.key];
    if (raw && raw.width > 0 && raw.height > 0) {
      return {
        x: Math.max(8, raw.x),
        y: Math.max(insets.top, raw.y),
        width: Math.min(width - 16, raw.width),
        height: raw.height,
      };
    }

    // High-precision layout fallbacks matching GuestHomeScreen layout
    const padding = 16;
    const cardGap = 12;
    const halfCardWidth = (width - padding * 2 - cardGap) / 2;

    switch (currentStep.key) {
      case 'events':
        return {
          x: padding,
          y: insets.top + 54,
          width: width - padding * 2,
          height: 64,
        };
      case 'audio':
        return {
          x: padding,
          y: insets.top + 130,
          width: halfCardWidth,
          height: 104,
        };
      case 'image':
        return {
          x: padding + halfCardWidth + cardGap,
          y: insets.top + 130,
          width: halfCardWidth,
          height: 104,
        };
      case 'form':
        return {
          x: padding,
          y: insets.top + 252,
          width: width - padding * 2,
          height: 240,
        };
      case 'save':
        return {
          x: padding + 85,
          y: insets.top + 510,
          width: width - padding * 2 - 85,
          height: 52,
        };
      case 'contacts':
        return {
          x: width - 180,
          y: insets.top + 10,
          width: 82,
          height: 34,
        };
      case 'products':
        return {
          x: padding,
          y: insets.top + 10,
          width: 120,
          height: 34,
        };
      default:
        return {
          x: padding,
          y: insets.top + 60,
          width: width - padding * 2,
          height: 60,
        };
    }
  }, [targets, currentStep.key, insets.top, width]);

  // Card dimensions & placement (clean simple box)
  const cardWidth = Math.min(width - 32, 380);
  const cardLeft = (width - cardWidth) / 2;
  const estimatedCardHeight = 220;

  const targetBottom = currentTargetLayout.y + currentTargetLayout.height;
  const targetTop = currentTargetLayout.y;

  // Decide if simple box sits above or below target
  const placeAbove = targetBottom + estimatedCardHeight > height - (insets.bottom + 50);

  const cardTopPosition = placeAbove
    ? Math.max(insets.top + 16, targetTop - estimatedCardHeight - 16)
    : targetBottom + 16;

  // Transition to next step with smooth fade & slide
  const handleNext = useCallback(() => {
    if (currentStepIndex < GUIDANCE_STEPS.length - 1) {
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: -8,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        const nextIdx = currentStepIndex + 1;
        setCurrentStepIndex(nextIdx);
        onStepChange?.(nextIdx, GUIDANCE_STEPS[nextIdx].key);
        cardTranslateY.setValue(10);
        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 160,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(cardTranslateY, {
            toValue: 0,
            duration: 160,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      onClose?.();
    }
  }, [currentStepIndex, cardOpacity, cardTranslateY, onStepChange, onClose]);

  // Back step
  const handleBack = useCallback(() => {
    if (currentStepIndex > 0) {
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 8,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(() => {
        const prevIdx = currentStepIndex - 1;
        setCurrentStepIndex(prevIdx);
        onStepChange?.(prevIdx, GUIDANCE_STEPS[prevIdx].key);
        cardTranslateY.setValue(-10);
        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
          Animated.timing(cardTranslateY, {
            toValue: 0,
            duration: 160,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [currentStepIndex, cardOpacity, cardTranslateY, onStepChange]);

  if (!visible) return null;

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  });

  const isLastStep = currentStepIndex === GUIDANCE_STEPS.length - 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* SVG Mask: Full dark backdrop with rounded cutout at target */}
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="actionableSpotlightMask">
              <Rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />
              <Rect
                x={currentTargetLayout.x - 4}
                y={currentTargetLayout.y - 4}
                width={currentTargetLayout.width + 8}
                height={currentTargetLayout.height + 8}
                rx={18}
                ry={18}
                fill="#000000"
              />
            </Mask>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="rgba(4, 5, 15, 0.88)"
            mask="url(#actionableSpotlightMask)"
          />
        </Svg>

        {/* Animated Illuminated Border around Spotlight Target */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.spotlightHalo,
            {
              left: currentTargetLayout.x - 6,
              top: currentTargetLayout.y - 6,
              width: currentTargetLayout.width + 12,
              height: currentTargetLayout.height + 12,
              borderColor: currentStep.accentColor,
              shadowColor: currentStep.accentColor,
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
            },
          ]}
        />

        {/* Dismiss on background tap outside */}
        <TouchableWithoutFeedback onPress={handleNext}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Simple Floating Guidance Box (Clean box with NO outside arrow) */}
        <Animated.View
          style={[
            styles.simpleBox,
            {
              left: cardLeft,
              top: cardTopPosition,
              width: cardWidth,
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          {/* Card Top Row: Step Badge + Skip Button */}
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.stepBadge,
                { backgroundColor: `${currentStep.accentColor}20` },
              ]}
            >
              <View
                style={[
                  styles.stepBadgeDot,
                  { backgroundColor: currentStep.accentColor },
                ]}
              />
              <Text
                style={[
                  styles.stepBadgeText,
                  { color: currentStep.accentColor },
                ]}
              >
                {currentStep.badgeText}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.skipButton}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.skipText}>Skip</Text>
              <CloseIcon size={13} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Title Row with Step Icon */}
          <View style={styles.titleRow}>
            <View
              style={[
                styles.iconBubble,
                { backgroundColor: `${currentStep.accentColor}22` },
              ]}
            >
              <StepIcon
                type={currentStep.iconType}
                size={18}
                color={currentStep.accentColor}
              />
            </View>
            <Text style={styles.cardTitle}>{currentStep.title}</Text>
          </View>

          {/* Actionable Explanation */}
          <Text style={styles.cardSubtitle}>{currentStep.subtitle}</Text>

          {/* Action Tip Pill */}
          {currentStep.tip ? (
            <View style={styles.tipWrap}>
              <View
                style={[
                  styles.tipBulbDot,
                  { backgroundColor: currentStep.accentColor },
                ]}
              />
              <Text style={styles.tipText}>{currentStep.tip}</Text>
            </View>
          ) : null}

          {/* Bottom Controls Row: Dots + Back + Next */}
          <View style={styles.cardFooterRow}>
            {/* Step Indicators (7 Dots) */}
            <View style={styles.dotsRow}>
              {GUIDANCE_STEPS.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    idx === currentStepIndex
                      ? [styles.activeDot, { backgroundColor: currentStep.accentColor }]
                      : styles.inactiveDot,
                  ]}
                />
              ))}
            </View>

            {/* Action Buttons: Back + Next */}
            <View style={styles.buttonGroup}>
              {currentStepIndex > 0 && (
                <TouchableOpacity
                  onPress={handleBack}
                  style={styles.backButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleNext}
                style={[
                  styles.nextButton,
                  {
                    backgroundColor: currentStep.accentColor,
                    shadowColor: currentStep.accentColor,
                  },
                ]}
                activeOpacity={0.85}
              >
                <Text style={styles.nextButtonText}>
                  {isLastStep ? 'Got It!' : 'Next'}
                </Text>
                {isLastStep ? (
                  <CheckIcon size={14} color="#FFFFFF" />
                ) : (
                  <ArrowRightIcon size={14} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Styles (Clean Simple Box - No Arrows)
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  spotlightHalo: {
    position: 'absolute',
    borderRadius: 22,
    borderWidth: 2.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 18,
    elevation: 8,
    backgroundColor: 'transparent',
  },
  simpleBox: {
    position: 'absolute',
    backgroundColor: '#16142A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
  },
  stepBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  stepBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  skipText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    color: '#94A3B8',
    marginRight: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16.5,
    color: '#FFFFFF',
    flex: 1,
  },
  cardSubtitle: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: '#CBD5E1',
    marginBottom: 10,
  },
  tipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 14,
  },
  tipBulbDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  tipText: {
    fontFamily: Fonts.medium,
    fontSize: 11.5,
    color: '#E2E8F0',
    flex: 1,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },
  activeDot: {
    width: 18,
  },
  inactiveDot: {
    width: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButtonText: {
    fontFamily: Fonts.semiBold,
    fontSize: 12.5,
    color: '#CBD5E1',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  nextButtonText: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    color: '#FFFFFF',
    marginRight: 4,
  },
});

export default GuestActionableGuidance;
