import React, { useState, useRef, useEffect } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Path,
  Rect,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import Text from '../common/AppText';
import { Fonts } from '../../styles/Fonts';

// Assets
const STEP_1_HERO = require('../../../assets/images/guide-step-1.png');

// ---------------------------------------------------------------------------
// High-Precision SVG Icons Matching the Reference UI
// ---------------------------------------------------------------------------

const ArrowRightIcon = ({ size = 22, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12H19M13 6L19 12L13 18"
      stroke={color}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CloseIcon = ({ size = 18, color = 'rgba(255, 255, 255, 0.6)' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6L18 18"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MapPinIcon = ({ size = 18, color = '#A855F7' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21C16 17 20 13.4183 20 9.5C20 5.35786 16.4183 2 12 2C7.58172 2 4 5.35786 4 9.5C4 13.4183 8 17 12 21Z"
      fill={color}
    />
    <Circle cx="12" cy="9.5" r="3" fill="#1D1C30" />
  </Svg>
);

const DocumentIcon = ({ size = 18, color = '#A855F7' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
      fill={color}
    />
    <Path d="M14 2V8H20" fill="rgba(0,0,0,0.25)" />
    <Path
      d="M8 12H16M8 16H13"
      stroke="#1D1C30"
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

const ChatBubbleIcon = ({ size = 18, color = '#A855F7' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 11.5C20 16.1944 16.4183 20 12 20C10.4571 20 9.01188 19.5393 7.78184 18.7397L3 20L4.36437 15.698C3.50426 14.464 3 13.0232 3 11.5C3 6.80558 6.58172 3 12 3C17.4183 3 20 6.80558 20 11.5Z"
      fill={color}
    />
    <Circle cx="8" cy="11.5" r="1.3" fill="#1D1C30" />
    <Circle cx="12" cy="11.5" r="1.3" fill="#1D1C30" />
    <Circle cx="16" cy="11.5" r="1.3" fill="#1D1C30" />
  </Svg>
);

const MicrophoneIcon = ({ size = 18, color = '#A855F7' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="8" y="2" width="8" height="12" rx="4" fill={color} />
    <Path
      d="M4 10V11C4 15.4183 7.58172 19 12 19C16.4183 19 20 15.4183 20 11V10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M12 19V22M8 22H16"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const GeminiSparkleIcon = ({ size = 18, color = '#A855F7' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4772 12 22C12 16.4772 16.4772 12 22 12C16.4772 12 12 7.52285 12 2Z"
      fill={color}
    />
    <Circle cx="18" cy="6" r="2" fill={color} />
  </Svg>
);

const CameraIcon = ({ size = 18, color = '#A855F7' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 7H7L9 4H15L17 7H20C21.1046 7 22 7.89543 22 9V19C22 20.1046 21.1046 21 20 21H4C2.89543 21 2 20.1046 2 19V9C2 7.89543 2.89543 7 4 7Z"
      fill={color}
    />
    <Circle cx="12" cy="14" r="3.5" fill="#1D1C30" />
    <Circle cx="12" cy="14" r="1.8" fill={color} />
  </Svg>
);

const HeadsetIcon = ({ size = 18, color = '#A855F7' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 14V11C3 6.02944 7.02944 2 12 2C16.9706 2 21 6.02944 21 11V14"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Rect x="2" y="13" width="4" height="7" rx="2" fill={color} />
    <Rect x="18" y="13" width="4" height="7" rx="2" fill={color} />
    <Path
      d="M20 18V20C20 21.1046 19.1046 22 18 22H14"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const ZapSpeedIcon = ({ size = 18, color = '#A855F7' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
      fill={color}
      stroke={color}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  </Svg>
);

// Tip Icons
const LightbulbIcon = ({ size = 16, color = '#FBBF24' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 21H15M10 24H14M12 2C7.58172 2 4 5.58172 4 10C4 12.8703 5.51865 15.3855 7.78184 16.7818C8.5284 17.2424 9 18.0494 9 18.9288V19H15V18.9288C15 18.0494 15.4716 17.2424 16.2182 16.7818C18.4813 15.3855 20 12.8703 20 10C20 5.58172 16.4183 2 12 2Z"
      fill={color}
    />
  </Svg>
);

const GreenCheckCircleIcon = ({ size = 16, color = '#22C55E' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill={color} />
    <Path
      d="M8 12.5L10.5 15L16 9.5"
      stroke="#1D1C30"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ShieldCheckIcon = ({ size = 16, color = '#38BDF8' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2Z"
      fill={color}
    />
    <Path
      d="M9 11.5L11 13.5L15 9.5"
      stroke="#1D1C30"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ---------------------------------------------------------------------------
// 4-Step Tour Configuration (Matches Uploaded Images 1 & 2)
// ---------------------------------------------------------------------------

const TOUR_STEPS = [
  {
    stepIndex: 0,
    badgeText: 'Step 1: Prepare Your Stage',
    heroType: 'image',
    heroImage: STEP_1_HERO,
    title: 'Create Your Event First',
    subtitle:
      'Group your leads by expo, conference, or roadshow. Pre-load your marketing collateral and welcome messages.',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    features: [
      {
        icon: 'pin',
        title: 'Location & Venue Tagging',
        desc: 'Keep lead by exhibition',
      },
      {
        icon: 'document',
        title: 'Pre-attached Brochures & PDF',
        desc: 'Auto-link your catalogs',
      },
      {
        icon: 'chat',
        title: 'Pre-defined WhatsApp Greeting',
        desc: 'Event welcome message',
      },
    ],
    tipIcon: 'lightbulb',
    tipPrefix: 'Pro-Tip: ',
    tipText: 'Select an active event\nfrom the top bar anytime',
  },
  {
    stepIndex: 1,
    badgeText: 'Step 2: Instant Voice CRM',
    heroType: 'image',
    heroImage: STEP_1_HERO,
    title: 'Speak Naturally, AI Handles the CRM',
    subtitle:
      'Step away from the booth, tap record, and speak freely. SalesBuster extracts names, phone numbers and more.',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    features: [
      {
        icon: 'microphone',
        title: 'One-Tap Audio Capture',
        desc: 'No typing needed',
      },
      {
        icon: 'gemini',
        title: 'Gemini Live Intelligence',
        desc: 'Detects intent & details',
      },
      {
        icon: 'document',
        title: 'Instant Transcription',
        desc: 'Get meeting summary',
      },
    ],
    tipIcon: 'greenCheck',
    tipPrefix: '',
    tipText: 'Works seamlessly even in noisy exhibition halls.',
  },
  {
    stepIndex: 2,
    badgeText: 'Step 3: Business Card Scan',
    heroType: 'image',
    heroImage: STEP_1_HERO,
    title: 'Snap Business Cards\nin Seconds',
    subtitle:
      'Never lose a paper card again. Take a photo or pick from gallery — our AI extracts contact information automatically.',
    cardBorder: '#0284C7', // Vivid blue outline highlighted in reference image 2
    features: [
      {
        icon: 'camera',
        title: 'Instant Camera OCR',
        desc: 'Capture business card details instantly.',
      },
      {
        icon: 'document',
        title: 'Zero Typing Required',
        desc: 'Auto-fill contact information.',
      },
      {
        icon: 'headset',
        title: 'Document Support',
        desc: 'Scan documents easily.',
      },
    ],
    tipIcon: 'shieldCheck',
    tipPrefix: '',
    tipText: 'Stored securely in your event lead list and synced to the cloud.',
  },
  {
    stepIndex: 3,
    badgeText: 'Step 4: Instant Follow-Up',
    heroType: 'image',
    heroImage: STEP_1_HERO,
    title: 'Warm Follow-Up\nBefore They Walk Away',
    subtitle:
      'Send a personalized WhatsApp message with your brochure in a single tap.',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    features: [
      {
        icon: 'pin',
        title: 'Instant Speed-to-Lead',
        desc: 'Follow up while interest is high.',
      },
      {
        icon: 'document',
        title: 'Automatic Catalog Attachment',
        desc: 'Share images with one tap.',
      },
      {
        icon: 'chat',
        title: 'Pre-Populated Contact',
        desc: 'Ready-to-send personalized messages',
      },
    ],
    tipIcon: 'greenCheck',
    tipPrefix: 'Pro-Tip: ',
    tipText: 'Delight leads right before they walk away with 1-tap WhatsApp.',
  },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const GuestTourModal = ({ visible, onClose, onComplete }) => {
  const { width, height } = useWindowDimensions();
  const [currentStep, setCurrentStep] = useState(0);

  // Smooth slide/fade animation between steps
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for next button
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Reset to step 0 whenever modal opens
  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleNext = () => {
    // Button tap bounce
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (currentStep < TOUR_STEPS.length - 1) {
      // Animate out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -12,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentStep(prev => prev + 1);
        slideAnim.setValue(12);
        // Animate in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      // Completed all steps!
      if (typeof onComplete === 'function') {
        onComplete();
      } else {
        onClose?.();
      }
    }
  };

  const handleStepJump = index => {
    if (index === currentStep) return;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      setCurrentStep(index);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }).start();
    });
  };

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const isCompact = height < 700;

  // Render Row Icon
  const renderRowIcon = type => {
    switch (type) {
      case 'pin':
        return <MapPinIcon size={24} color="#A855F7" />;
      case 'document':
        return <DocumentIcon size={24} color="#A855F7" />;
      case 'chat':
        return <ChatBubbleIcon size={24} color="#A855F7" />;
      case 'microphone':
        return <MicrophoneIcon size={24} color="#A855F7" />;
      case 'gemini':
        return <GeminiSparkleIcon size={24} color="#A855F7" />;
      case 'camera':
        return <CameraIcon size={24} color="#38BDF8" />;
      case 'headset':
        return <HeadsetIcon size={24} color="#A855F7" />;
      default:
        return <DocumentIcon size={24} color="#A855F7" />;
    }
  };

  // Render Tip Icon
  const renderTipIcon = type => {
    switch (type) {
      case 'lightbulb':
        return <LightbulbIcon size={24} color="#FBBF24" />;
      case 'greenCheck':
        return <GreenCheckCircleIcon size={24} color="#22C55E" />;
      case 'shieldCheck':
        return <ShieldCheckIcon size={24} color="#38BDF8" />;
      default:
        return <LightbulbIcon size={24} color="#FBBF24" />;
    }
  };

  // Render Themed Hero Card for Steps 1-4
  const renderHero = () => {
    if (step.heroType === 'image') {
      return (
        <View style={styles.heroWrapper}>
          <Image
            source={step.heroImage}
            style={styles.heroImage}
            resizeMode="cover"
          />
          {/* Centered Play Button Emblem */}
          <View style={styles.playButtonCircle}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
              <Path d="M6 4L19 12L6 20V4Z" fill="#7C3AED" />
            </Svg>
          </View>
        </View>
      );
    }

    if (step.heroType === 'voiceCard') {
      return (
        <View style={[styles.heroWrapper, styles.heroVoiceCard]}>
          <View style={styles.voiceAura} />
          <View style={styles.voiceWaveRow}>
            {[8, 18, 32, 48, 28, 44, 20, 12].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.voiceBar,
                  {
                    height: h,
                    backgroundColor: i % 2 === 0 ? '#9C40FA' : '#38BDF8',
                  },
                ]}
              />
            ))}
            <View style={styles.voiceMicCircle}>
              <MicrophoneIcon size={24} color="#FFFFFF" />
            </View>
            {[12, 22, 42, 24, 46, 30, 16, 8].map((h, i) => (
              <View
                key={i}
                style={[
                  styles.voiceBar,
                  {
                    height: h,
                    backgroundColor: i % 2 === 0 ? '#38BDF8' : '#9C40FA',
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.heroVoiceLabel}>Live AI Speech Intelligence</Text>
        </View>
      );
    }

    if (step.heroType === 'ocrCard') {
      return (
        <View style={[styles.heroWrapper, styles.heroOcrCard]}>
          <View style={styles.ocrCardMock}>
            <View style={styles.ocrCardHeader}>
              <View style={styles.ocrCardAvatar} />
              <View style={styles.ocrCardLines}>
                <View style={styles.ocrLine1} />
                <View style={styles.ocrLine2} />
              </View>
            </View>
            <View style={styles.ocrLaserScanLine} />
            <View style={styles.ocrBadge}>
              <Text style={styles.ocrBadgeText}>⚡ OCR Auto-Extracted</Text>
            </View>
          </View>
        </View>
      );
    }

    // Step 4: WhatsApp follow-up preview
    return (
      <View style={[styles.heroWrapper, styles.heroWaCard]}>
        <View style={styles.waBubble}>
          <Text style={styles.waBubbleText}>
            Hi Rahul! Great meeting you at TechSummit 2026. Here is our brochure
            PDF.
          </Text>
          <View style={styles.waPdfAttachment}>
            <DocumentIcon size={14} color="#22C55E" />
            <Text style={styles.waPdfText}>Product-Catalog-2026.pdf</Text>
          </View>
          <Text style={styles.waTimeText}>12:05 PM ✓✓</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.cardContainer}>
              {/* Close Button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <CloseIcon size={18} color="rgba(255, 255, 255, 0.7)" />
              </TouchableOpacity>

              {/* Step Pill Badge */}
              <View style={styles.badgeWrapper}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{step.badgeText}</Text>
                </View>
              </View>

              {/* Animated Content Section */}
              <Animated.View
                style={[
                  styles.animatedContent,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateX: slideAnim }],
                  },
                ]}
              >
                {/* 1. Hero Visual */}
                {renderHero()}

                {/* 2. Title & Subtitle */}
                <Text style={styles.titleText}>{step.title}</Text>
                <Text style={styles.subtitleText}>{step.subtitle}</Text>

                {/* 3. Feature Card (Dark Box with 3 Rows) */}
                <View
                  style={[styles.featureCard, { borderColor: step.cardBorder }]}
                >
                  {step.features.map((feat, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.featureRow,
                        idx < step.features.length - 1 &&
                          styles.featureRowDivider,
                      ]}
                    >
                      <View style={styles.iconContainer}>
                        {renderRowIcon(feat.icon)}
                      </View>
                      <View style={styles.featureTextCol}>
                        <Text style={styles.featureTitle}>{feat.title}</Text>
                        <Text style={styles.featureDesc}>{feat.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* 4. Tip Card */}
                <View style={styles.tipCard}>
                  <View style={styles.tipIconContainer}>
                    {renderTipIcon(step.tipIcon)}
                  </View>
                  <Text style={styles.tipText}>
                    {step.tipPrefix ? (
                      <Text style={styles.tipPrefix}>{step.tipPrefix}</Text>
                    ) : null}
                    {step.tipText}
                  </Text>
                </View>
              </Animated.View>

              {/* 5. Footer: Pagination Dots on Left, Next Button on Right */}
              <View style={styles.footerRow}>
                {/* 4 Pagination Dots */}
                <View style={styles.dotsRow}>
                  {TOUR_STEPS.map((_, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleStepJump(idx)}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <View
                        style={[
                          styles.dot,
                          idx === currentStep
                            ? styles.activeDot
                            : styles.inactiveDot,
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Pill Gradient Next Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={styles.nextButton}
                    onPress={handleNext}
                    activeOpacity={0.85}
                  >
                    <Svg width={68} height={44} viewBox="0 0 68 44">
                      <Defs>
                        <LinearGradient
                          id="btnPillGrad"
                          x1="0"
                          y1="0"
                          x2="68"
                          y2="0"
                          gradientUnits="userSpaceOnUse"
                        >
                          <Stop offset="0" stopColor="#4F12C6" />
                          <Stop offset="1" stopColor="#8935EE" />
                        </LinearGradient>
                      </Defs>
                      <Rect
                        x="0"
                        y="0"
                        width={68}
                        height={44}
                        rx={22}
                        ry={22}
                        fill="url(#btnPillGrad)"
                      />
                    </Svg>
                    <View style={styles.nextIconWrap}>
                      <ArrowRightIcon size={22} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 5, 15, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0B0A1F',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeWrapper: {
    alignItems: 'center',
    marginBottom: 14,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontFamily: Fonts.family.medium,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  animatedContent: {
    width: '100%',
  },
  heroWrapper: {
    width: '100%',
    height: 128,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1E1D36',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  playButtonCircle: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3,
    ...Platform.select({
      android: { elevation: 6 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
    }),
  },
  // Step 2 Hero Card
  heroVoiceCard: {
    backgroundColor: '#181630',
    padding: 12,
    position: 'relative',
  },
  voiceAura: {
    position: 'absolute',
    width: 140,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(156, 64, 250, 0.18)',
  },
  voiceWaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  voiceBar: {
    width: 3.5,
    borderRadius: 2,
  },
  voiceMicCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  heroVoiceLabel: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    fontFamily: Fonts.family.medium,
    marginTop: 10,
    letterSpacing: 0.4,
  },
  // Step 3 Hero Card
  heroOcrCard: {
    backgroundColor: '#121A30',
    padding: 14,
  },
  ocrCardMock: {
    width: 190,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
    padding: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  ocrCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ocrCardAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#38BDF8',
    opacity: 0.8,
    marginRight: 8,
  },
  ocrCardLines: {
    flex: 1,
    gap: 4,
  },
  ocrLine1: {
    width: '70%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  ocrLine2: {
    width: '90%',
    height: 5,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  ocrLaserScanLine: {
    height: 2,
    backgroundColor: '#38BDF8',
    marginVertical: 4,
  },
  ocrBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  ocrBadgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '600',
  },
  // Step 4 Hero Card
  heroWaCard: {
    backgroundColor: '#132328',
    padding: 12,
  },
  waBubble: {
    backgroundColor: '#0F3E37',
    borderRadius: 12,
    padding: 10,
    maxWidth: 220,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  waBubbleText: {
    color: '#F8FAFC',
    fontSize: 10.5,
    lineHeight: 14,
    fontFamily: Fonts.family.regular,
  },
  waPdfAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    gap: 4,
  },
  waPdfText: {
    color: '#A7F3D0',
    fontSize: 9.5,
    fontFamily: Fonts.family.medium,
  },
  waTimeText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    textAlign: 'right',
    marginTop: 4,
  },
  // Typography
  titleText: {
    color: '#FFFFFF',
    fontSize: 18.5,
    fontFamily: Fonts.family.bold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 23,
  },
  subtitleText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11.5,
    fontFamily: Fonts.family.regular,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 6,
    marginBottom: 14,
  },
  // Feature List Card
  featureCard: {
    backgroundColor: '#26253D',
    borderRadius: 16,
    // borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
    fontWeight: '600',
    lineHeight: 17,
  },
  featureDesc: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: Fonts.family.regular,
    marginTop: 1,
  },
  // Tip Card
  tipCard: {
    backgroundColor: '#1F1E33',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  tipIconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 11.5,
    fontFamily: Fonts.family.medium,
    lineHeight: 15.5,
  },
  tipPrefix: {
    color: '#FBBF24',
    fontWeight: '700',
  },
  // Footer
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },
  activeDot: {
    width: 18,
    backgroundColor: '#A855F7',
  },
  inactiveDot: {
    width: 7,
    backgroundColor: '#33314E',
  },
  nextButton: {
    width: 68,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 6 },
      ios: {
        shadowColor: '#8935EE',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 8,
      },
    }),
  },
  nextIconWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GuestTourModal;
