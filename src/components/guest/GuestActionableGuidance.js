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
// Step Configuration (6 Clear, 2-Line Actionable Steps)
// ---------------------------------------------------------------------------
export const GUIDANCE_STEPS = [
  {
    key: 'events',
    stepNumber: 1,
    badgeText: 'Step 1 of 6',
    title: 'Select or Create Event',
    line1: 'Choose the event or expo you are attending.',
    line2: 'All captured contacts are saved here automatically.',
    iconType: 'calendar',
    accentColor: '#8B5CF6',
  },
  {
    key: 'audio',
    stepNumber: 2,
    badgeText: 'Step 2 of 6',
    title: 'One-Tap Voice AI',
    line1: 'Tap the mic and speak naturally with your visitor.',
    line2: 'AI instantly extracts their name, phone, and notes.',
    iconType: 'microphone',
    accentColor: '#9C40FA',
  },
  {
    key: 'image',
    stepNumber: 3,
    badgeText: 'Step 3 of 6',
    title: 'Scan Business Cards',
    line1: 'Snap a photo of any business card or visitor badge.',
    line2: 'Details are extracted and filled into the form in seconds.',
    iconType: 'camera',
    accentColor: '#0284C7',
  },
  {
    key: 'form',
    stepNumber: 4,
    badgeText: 'Step 4 of 6',
    title: 'Review Lead Details',
    line1: 'Review or edit the auto-filled contact information.',
    line2: 'Add extra notes or take a booth selfie with the visitor.',
    iconType: 'form',
    accentColor: '#F59E0B',
  },
  {
    key: 'save',
    stepNumber: 5,
    badgeText: 'Step 5 of 6',
    title: 'Save & Send WhatsApp',
    line1: 'Save the contact to your CRM with a single tap.',
    line2: 'Instantly send your catalog or greeting on WhatsApp.',
    iconType: 'whatsapp',
    accentColor: '#10B981',
  },
  {
    key: 'contacts',
    stepNumber: 6,
    badgeText: 'Step 6 of 6',
    title: 'All Event Contacts',
    line1: 'View, search, and manage all your captured leads.',
    line2: 'Easily call prospects or export them anytime.',
    iconType: 'users',
    accentColor: '#EC4899',
  },
];

// ---------------------------------------------------------------------------
// Clean Vector Icons
// ---------------------------------------------------------------------------
const StepIcon = ({ type, size = 16, color = '#FFFFFF' }) => {
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
    default:
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
  }
};

const CloseIcon = ({ size = 13, color = '#94A3B8' }) => (
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

const ArrowRightIcon = ({ size = 13, color = '#FFFFFF' }) => (
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

const CheckIcon = ({ size = 13, color = '#FFFFFF' }) => (
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
  targetRefs = {},
  onStepChange,
  onRequestRemeasure,
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Measured popup card dimensions from onLayout
  const [cardLayoutSize, setCardLayoutSize] = useState({ width: 0, height: 0 });

  // Real-time direct measurement of the active step target ref
  const [directLayout, setDirectLayout] = useState(null);

  // Animated values for card step transition
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  // Reset to step 0 when modal opens
  useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
      cardOpacity.setValue(1);
      cardTranslateY.setValue(0);
      setDirectLayout(null);
      onStepChange?.(0, GUIDANCE_STEPS[0].key);
      onRequestRemeasure?.();
    }
  }, [visible, cardOpacity, cardTranslateY, onStepChange, onRequestRemeasure]);

  const currentStep = GUIDANCE_STEPS[currentStepIndex] || GUIDANCE_STEPS[0];

  // Directly measure active target component ref whenever current step changes
  const measureActiveRef = useCallback(() => {
    if (!visible) return;
    const ref = targetRefs?.[currentStep.key];
    if (ref?.current?.measureInWindow) {
      try {
        ref.current.measureInWindow((x, y, w, h) => {
          if (w > 0 && h > 0) {
            setDirectLayout({ x, y, width: w, height: h });
          }
        });
      } catch {
        // Safe fallback
      }
    }
  }, [visible, currentStep.key, targetRefs]);

  useEffect(() => {
    measureActiveRef();
    // Schedule a post-frame measurement for settling
    const frameId = requestAnimationFrame(measureActiveRef);
    return () => cancelAnimationFrame(frameId);
  }, [measureActiveRef, currentStepIndex]);

  // Dynamic / fallback layout calculations for all 6 targets
  const currentTargetLayout = useMemo(() => {
    const raw = directLayout || targets?.[currentStep.key];
    if (raw && raw.width > 0 && raw.height > 0) {
      // Clamp form height to avoid an overly huge spotlight that blocks the screen
      const clampedHeight =
        currentStep.key === 'form' ? Math.min(raw.height, 130) : raw.height;
      return {
        x: Math.max(8, raw.x),
        y: Math.max(insets.top, raw.y),
        width: Math.min(width - 16, raw.width),
        height: clampedHeight,
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
          height: 60,
        };
      case 'audio':
        return {
          x: padding,
          y: insets.top + 128,
          width: halfCardWidth,
          height: 100,
        };
      case 'image':
        return {
          x: padding + halfCardWidth + cardGap,
          y: insets.top + 128,
          width: halfCardWidth,
          height: 100,
        };
      case 'form':
        return {
          x: padding,
          y: insets.top + 248,
          width: width - padding * 2,
          height: 125,
        };
      case 'save':
        return {
          x: padding + 85,
          y: Math.max(insets.top + 480, height - insets.bottom - 90),
          width: width - padding * 2 - 85,
          height: 52,
        };
      case 'contacts':
        return {
          x: width - 150,
          y: insets.top + 8,
          width: 80,
          height: 32,
        };
      default:
        return {
          x: padding,
          y: insets.top + 60,
          width: width - padding * 2,
          height: 60,
        };
    }
  }, [directLayout, targets, currentStep.key, insets.top, insets.bottom, width, height]);

  // Card dimensions: responsive width clamped with 16px screen margins
  const cardWidth = Math.min(width - 32, 360);
  const effectiveCardHeight = cardLayoutSize.height > 0 ? cardLayoutSize.height : 130;

  const targetBottom = currentTargetLayout.y + currentTargetLayout.height;
  const targetTop = currentTargetLayout.y;
  const targetCenterX = currentTargetLayout.x + currentTargetLayout.width / 2;

  // Horizontal positioning: center on target, clamped within screen margins
  const idealLeft = targetCenterX - cardWidth / 2;
  const minLeft = 16;
  const maxLeft = Math.max(minLeft, width - cardWidth - 16);
  const popupLeft = Math.max(minLeft, Math.min(maxLeft, idealLeft));

  // Arrow X offset relative to card, clamped so it never leaves card bounds
  const rawArrowX = targetCenterX - popupLeft - 7;
  const clampedArrowLeft = Math.max(16, Math.min(cardWidth - 30, rawArrowX));

  // Vertical positioning: dynamically choose top or bottom to guarantee zero overlap
  const SPACING = 12; // Gap between spotlight halo and popup card
  const spaceBelow = height - insets.bottom - targetBottom;
  const spaceAbove = targetTop - insets.top;
  const requiredVerticalSpace = effectiveCardHeight + SPACING + 16;

  let placement = 'bottom';
  let popupTop = 0;

  if (spaceBelow >= requiredVerticalSpace) {
    placement = 'bottom';
    popupTop = targetBottom + SPACING;
  } else if (spaceAbove >= requiredVerticalSpace) {
    placement = 'top';
    popupTop = targetTop - effectiveCardHeight - SPACING;
  } else {
    // Edge case on very small screens: choose side with more room and clamp outside target
    if (spaceBelow >= spaceAbove) {
      placement = 'bottom';
      popupTop = Math.min(
        targetBottom + 8,
        height - insets.bottom - effectiveCardHeight - 8
      );
    } else {
      placement = 'top';
      popupTop = Math.max(insets.top + 8, targetTop - effectiveCardHeight - 8);
    }
  }

  // Handle onLayout for exact popup card dimensions
  const handleCardLayout = useCallback((e) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0 && h > 0) {
      setCardLayoutSize((prev) => {
        if (Math.abs(prev.height - h) > 2 || Math.abs(prev.width - w) > 2) {
          return { width: w, height: h };
        }
        return prev;
      });
    }
  }, []);

  // Transition to next step with smooth fade & slide
  const handleNext = useCallback(() => {
    if (currentStepIndex < GUIDANCE_STEPS.length - 1) {
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: -6,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setDirectLayout(null);
        const nextIdx = currentStepIndex + 1;
        setCurrentStepIndex(nextIdx);
        onStepChange?.(nextIdx, GUIDANCE_STEPS[nextIdx].key);
        cardTranslateY.setValue(8);
        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 150,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(cardTranslateY, {
            toValue: 0,
            duration: 150,
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
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 6,
          duration: 110,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setDirectLayout(null);
        const prevIdx = currentStepIndex - 1;
        setCurrentStepIndex(prevIdx);
        onStepChange?.(prevIdx, GUIDANCE_STEPS[prevIdx].key);
        cardTranslateY.setValue(-8);
        Animated.parallel([
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(cardTranslateY, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [currentStepIndex, cardOpacity, cardTranslateY, onStepChange]);

  if (!visible) return null;

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
                rx={14}
                ry={14}
                fill="#000000"
              />
            </Mask>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="rgba(4, 5, 15, 0.82)"
            mask="url(#actionableSpotlightMask)"
          />
        </Svg>

        {/* Solid Illuminated Border around Spotlight Target (Calm & Non-Blinking) */}
        <View
          pointerEvents="none"
          style={[
            styles.spotlightHalo,
            {
              left: currentTargetLayout.x - 4,
              top: currentTargetLayout.y - 4,
              width: currentTargetLayout.width + 8,
              height: currentTargetLayout.height + 8,
              borderColor: currentStep.accentColor,
            },
          ]}
        />

        {/* Dismiss on background tap outside */}
        <TouchableWithoutFeedback onPress={handleNext}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Modern Floating Guidance Card with Accurate Arrow */}
        <Animated.View
          onLayout={handleCardLayout}
          style={[
            styles.guidanceCard,
            {
              left: popupLeft,
              top: popupTop,
              width: cardWidth,
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
        >
          {/* Arrow pointing at target */}
          {placement === 'bottom' ? (
            <View style={[styles.arrowUp, { left: clampedArrowLeft }]}>
              <Svg width={14} height={7} viewBox="0 0 14 7">
                <Path
                  d="M0 7L7 0L14 7"
                  fill="#15132B"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth={1}
                />
              </Svg>
            </View>
          ) : (
            <View style={[styles.arrowDown, { left: clampedArrowLeft }]}>
              <Svg width={14} height={7} viewBox="0 0 14 7">
                <Path
                  d="M0 0L7 7L14 0"
                  fill="#15132B"
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth={1}
                />
              </Svg>
            </View>
          )}

          {/* Header Row: Step Pill + Skip Button */}
          <View style={styles.cardHeaderRow}>
            <View
              style={[
                styles.stepPill,
                {
                  backgroundColor: `${currentStep.accentColor}18`,
                  borderColor: `${currentStep.accentColor}40`,
                },
              ]}
            >
              <View
                style={[
                  styles.stepPillDot,
                  { backgroundColor: currentStep.accentColor },
                ]}
              />
              <Text
                style={[
                  styles.stepPillText,
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
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.skipText}>Skip</Text>
              <CloseIcon size={12} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Title Row with Step Icon */}
          <View style={styles.titleRow}>
            <View
              style={[
                styles.iconBubble,
                { backgroundColor: `${currentStep.accentColor}20` },
              ]}
            >
              <StepIcon
                type={currentStep.iconType}
                size={15}
                color={currentStep.accentColor}
              />
            </View>
            <Text style={styles.cardTitle}>{currentStep.title}</Text>
          </View>

          {/* Instructional 2-Line Description */}
          <View style={styles.textContainer}>
            <Text style={styles.descLine} numberOfLines={1}>
              {currentStep.line1}
            </Text>
            <Text style={styles.descLine} numberOfLines={1}>
              {currentStep.line2}
            </Text>
          </View>

          {/* Footer Controls: Dots + Back & Next Buttons */}
          <View style={styles.cardFooterRow}>
            {/* Step Indicators */}
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
                  { backgroundColor: currentStep.accentColor },
                ]}
                activeOpacity={0.85}
              >
                <Text style={styles.nextButtonText}>
                  {isLastStep ? 'Got It' : 'Next'}
                </Text>
                {isLastStep ? (
                  <CheckIcon size={12} color="#FFFFFF" />
                ) : (
                  <ArrowRightIcon size={12} color="#FFFFFF" />
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
// Modern Styles (Dark Navy, Rounded Corners, Subtle Shadows)
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  spotlightHalo: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  guidanceCard: {
    position: 'absolute',
    backgroundColor: '#15132B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  arrowUp: {
    position: 'absolute',
    top: -6.5,
    zIndex: 20,
  },
  arrowDown: {
    position: 'absolute',
    bottom: -6.5,
    zIndex: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  stepPillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },
  stepPillText: {
    fontFamily: Fonts.family.bold,
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  skipText: {
    fontFamily: Fonts.family.medium,
    fontSize: 11.5,
    color: '#94A3B8',
    marginRight: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cardTitle: {
    fontFamily: Fonts.family.bold,
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
  },
  textContainer: {
    marginBottom: 10,
  },
  descLine: {
    fontFamily: Fonts.family.regular,
    fontSize: 12,
    lineHeight: 17,
    color: '#CBD5E1',
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    height: 4,
    borderRadius: 2,
    marginRight: 4,
  },
  activeDot: {
    width: 14,
  },
  inactiveDot: {
    width: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButtonText: {
    fontFamily: Fonts.family.medium,
    fontSize: 11.5,
    color: '#CBD5E1',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 8,
  },
  nextButtonText: {
    fontFamily: Fonts.family.bold,
    fontSize: 11.5,
    color: '#FFFFFF',
    marginRight: 3,
  },
});

export default GuestActionableGuidance;
