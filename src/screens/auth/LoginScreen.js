import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Text from '../../components/common/AppText';
import TextInput from '../../components/common/AppTextInput';
import KeyboardAwareScrollView from '../../components/common/KeyboardAwareScrollView';
import { useAuth } from '../../context/AuthContext';
import {
  AlertCircleIcon,
  CheckIcon,
  PhoneIcon,
  SparklesIcon,
} from '../../icons/Icons';
import { Fonts } from '../../styles/Fonts';
import { Spacing } from '../../styles/Spacing';
import { SalesBusterLogo } from '../../components/common/BrandLogo';
import SpeechRegistrationModal from '../../components/auth/SpeechRegistrationModal';

const PALETTE = {
  bgDeep: 'rgba(4, 5, 15)',
  bgStatusBar: '#04050F',
  cardBg: '#17162A',
  cardBorder: '#363252',
  inputBg: '#1B1C2E',
  inputBgFocused: '#1B1C2E',
  inputBorder: 'rgba(255, 255, 255, 0.08)',
  inputBorderFocused: '#8B5CF6',
  inputBorderError: '#F87171',
  electricBlue: '#7C3AED',
  electricBlueBright: '#A78BFA',
  purpleAccent: '#A855F7',
  purpleSoft: '#C4B5FD',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  errorText: '#FCA5A5',
  errorBg: 'rgba(239, 68, 68, 0.14)',
  errorBorder: 'rgba(248, 113, 113, 0.4)',
  successText: '#6EE7B7',
  successBg: 'rgba(16, 185, 129, 0.14)',
};

const EditIcon = ({ size = 15, color = PALETTE.purpleAccent }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default function LoginScreen({ navigation }) {
  const { sendOtp, verifyOtp } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = height < 700 || width < 360;

  // Step 1: 'phone' | Step 2: 'otp'
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Speech Profile Registration Modal state
  const [showSpeechModal, setShowSpeechModal] = useState(false);

  // Refs for 4-digit OTP text inputs
  const otpInputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // Animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(12)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 440,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 440,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [formOpacity, formTranslateY, headerOpacity, headerTranslateY]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => interval && clearInterval(interval);
  }, [resendCooldown]);

  const handlePhoneChange = text => {
    // Only accept numeric digits, up to 10 characters
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setPhone(cleaned);
    if (phoneError) setPhoneError('');
    if (serverError) setServerError('');
  };

  const handleSendOtp = async () => {
    if (isLoading) return;
    Keyboard.dismiss();

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setPhoneError('');
    setServerError('');
    setIsLoading(true);

    try {
      const result = await sendOtp(cleanPhone);
      if (result.success) {
        setStep('otp');
        setOtp(['', '', '', '']);
        setResendCooldown(45);
        setTimeout(() => {
          otpInputRefs[0].current?.focus();
        }, 150);
      } else {
        setServerError(result.message || 'Failed to send OTP. Please try again.');
      }
    } catch (_err) {
      setServerError('Network error connecting to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const updatedOtp = [...otp];
    updatedOtp[index] = digit;
    setOtp(updatedOtp);
    if (otpError) setOtpError('');
    if (serverError) setServerError('');

    // Auto-advance to next input
    if (digit && index < 3) {
      otpInputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (digit && index === 3 && updatedOtp.every(d => d.length === 1)) {
      handleVerifyOtp(updatedOtp.join(''));
    }
  };

  const handleOtpKeyPress = (index, e) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async (codeToVerify) => {
    if (isLoading) return;
    Keyboard.dismiss();

    const fullOtp = codeToVerify || otp.join('');
    if (fullOtp.length !== 4) {
      setOtpError('Please enter the 4-digit code.');
      return;
    }

    setOtpError('');
    setServerError('');
    setIsLoading(true);

    try {
      const result = await verifyOtp(phone, fullOtp);
      if (result.success) {
        if (!result.isProfileComplete) {
          // New user or incomplete profile: Show Speech AI Modal
          setShowSpeechModal(true);
        }
        // If profile was already complete, AuthContext automatically authenticated the user
        // and GuestAppNavigator routes directly to 'Main' — speech modal never shows!
      } else {
        setServerError(result.message || 'Incorrect verification code.');
      }
    } catch (_err) {
      setServerError('Network error verifying code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeechRegistrationComplete = () => {
    setShowSpeechModal(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PALETTE.bgStatusBar}
        translucent={false}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + (isCompact ? 16 : 28), 24),
            paddingBottom: Math.max(insets.bottom + 24, 32),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Brand Header */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <View style={styles.logoRow}>
            <SalesBusterLogo size={isCompact ? 36 : 42} />
          </View>
          <View style={styles.pillBadge}>
            <SparklesIcon size={13} color="#C084FC" />
            <Text style={styles.pillBadgeText}>AI VOICE CRM</Text>
          </View>

          <Text style={styles.title}>
            {step === 'phone' ? 'Instant Sign In' : 'Verification Code'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'phone'
              ? 'Enter your mobile number to receive a 4-digit verification code.'
              : `Enter the 4-digit code sent to +91 ${phone}`}
          </Text>
        </Animated.View>

        {/* Main Card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }],
            },
          ]}
        >
          {step === 'phone' ? (
            /* ================= Step 1: Phone Number Input ================= */
            <View>
              <Text style={styles.fieldLabel}>Mobile Number</Text>
              <View
                style={[
                  styles.phoneInputContainer,
                  phoneError ? styles.inputErrorBorder : null,
                ]}
              >
                {/* +91 Country Badge */}
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.flagText}>🇮🇳</Text>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>

                {/* Phone Input */}
                <TextInput
                  value={phone}
                  onChangeText={handlePhoneChange}
                  placeholder="98765 43210"
                  placeholderTextColor={PALETTE.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={styles.phoneTextInput}
                  autoFocus
                />
              </View>

              {phoneError ? (
                <View style={styles.errorRow}>
                  <AlertCircleIcon size={14} color={PALETTE.errorText} />
                  <Text style={styles.errorLabel}>{phoneError}</Text>
                </View>
              ) : null}

              {serverError ? (
                <View style={styles.serverErrorBox}>
                  <AlertCircleIcon size={16} color={PALETTE.errorText} />
                  <Text style={styles.serverErrorText}>{serverError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (isLoading || phone.length < 10) && styles.buttonDisabled,
                ]}
                onPress={handleSendOtp}
                disabled={isLoading || phone.length < 10}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send OTP Code</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* ================= Step 2: 4-digit OTP Input ================= */
            <View>
              <View style={styles.otpHeaderRow}>
                <Text style={styles.fieldLabel}>4-Digit OTP</Text>
                <TouchableOpacity
                  style={styles.changePhoneButton}
                  onPress={() => {
                    setStep('phone');
                    setOtp(['', '', '', '']);
                    setServerError('');
                  }}
                >
                  <EditIcon size={13} color={PALETTE.purpleAccent} />
                  <Text style={styles.changePhoneText}>Change Number</Text>
                </TouchableOpacity>
              </View>

              {/* 4 Discrete Boxes */}
              <View style={styles.otpBoxesRow}>
                {otp.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={otpInputRefs[idx]}
                    value={digit}
                    onChangeText={val => handleOtpDigitChange(idx, val)}
                    onKeyPress={e => handleOtpKeyPress(idx, e)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    style={[
                      styles.otpBox,
                      digit ? styles.otpBoxFilled : null,
                      otpError ? styles.inputErrorBorder : null,
                    ]}
                  />
                ))}
              </View>

              {otpError ? (
                <View style={styles.errorRow}>
                  <AlertCircleIcon size={14} color={PALETTE.errorText} />
                  <Text style={styles.errorLabel}>{otpError}</Text>
                </View>
              ) : null}

              {serverError ? (
                <View style={styles.serverErrorBox}>
                  <AlertCircleIcon size={16} color={PALETTE.errorText} />
                  <Text style={styles.serverErrorText}>{serverError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (isLoading || otp.some(d => !d)) && styles.buttonDisabled,
                ]}
                onPress={() => handleVerifyOtp()}
                disabled={isLoading || otp.some(d => !d)}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify & Proceed</Text>
                )}
              </TouchableOpacity>

              {/* Resend OTP Row */}
              <View style={styles.resendRow}>
                {resendCooldown > 0 ? (
                  <Text style={styles.cooldownText}>
                    Resend code in{' '}
                    <Text style={styles.cooldownSeconds}>{resendCooldown}s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity
                    onPress={handleSendOtp}
                    disabled={isLoading}
                  >
                    <Text style={styles.resendActionText}>Resend Code</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Security / Compliance footer */}
        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Protected by Fast2SMS DLT encryption & SalesBuster Tenant Isolation
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.bgDeep,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  appName: {
    color: PALETTE.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    marginBottom: 16,
  },
  pillBadgeText: {
    color: '#C084FC',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    color: PALETTE.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: PALETTE.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  fieldLabel: {
    color: PALETTE.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.inputBg,
    borderWidth: 1,
    borderColor: PALETTE.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 52,
  },
  countryCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  flagText: {
    fontSize: 18,
  },
  countryCodeText: {
    color: PALETTE.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  phoneTextInput: {
    flex: 1,
    paddingLeft: 12,
    color: PALETTE.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  changePhoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changePhoneText: {
    color: PALETTE.purpleAccent,
    fontSize: 12,
    fontWeight: '600',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  otpBox: {
    flex: 1,
    height: 60,
    backgroundColor: PALETTE.inputBg,
    borderWidth: 1,
    borderColor: PALETTE.inputBorder,
    borderRadius: 14,
    color: PALETTE.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: PALETTE.inputBorderFocused,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  inputErrorBorder: {
    borderColor: PALETTE.inputBorderError,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  errorLabel: {
    color: PALETTE.errorText,
    fontSize: 12,
  },
  serverErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PALETTE.errorBg,
    borderWidth: 1,
    borderColor: PALETTE.errorBorder,
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  serverErrorText: {
    color: PALETTE.errorText,
    fontSize: 13,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: PALETTE.electricBlue,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: PALETTE.electricBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  cooldownText: {
    color: PALETTE.textMuted,
    fontSize: 13,
  },
  cooldownSeconds: {
    color: PALETTE.purpleAccent,
    fontWeight: '700',
  },
  resendActionText: {
    color: PALETTE.purpleAccent,
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  footerNoteText: {
    color: PALETTE.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
