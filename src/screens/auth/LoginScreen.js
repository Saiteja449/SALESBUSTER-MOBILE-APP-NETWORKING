import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '../../components/common/AppText';
import TextInput from '../../components/common/AppTextInput';
import KeyboardAwareScrollView from '../../components/common/KeyboardAwareScrollView';
import { useAuth } from '../../context/AuthContext';
import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  EditIcon,
  PhoneIcon,
} from '../../icons/Icons';
import { Fonts } from '../../styles/Fonts';
import { SalesBusterIcon } from '../../components/common/BrandLogo';
import BrandGradientBackground from '../../components/common/BrandGradientBackground';
import AuthFlowProgress from '../../components/auth/AuthFlowProgress';
import SpeechRegistrationScreen from './SpeechRegistrationScreen';

const PALETTE = {
  bgDeep: '#0B0A1F',
  bgStatusBar: '#0A0D14',
  inputBg: '#141A29',
  inputBgFocused: '#161F36',
  inputBorder: 'rgba(255, 255, 255, 0.08)',
  inputBorderFocused: '#8B5CF6',
  inputBorderError: '#EF4444',
  purpleBright: '#A78BFA',
  purpleSoft: '#C4B5FD',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textPlaceholder: '#475569',
  errorText: '#F87171',
  errorBg: 'rgba(239, 68, 68, 0.12)',
  errorBorder: 'rgba(239, 68, 68, 0.28)',
  emerald: '#10B981',
  emeraldBg: 'rgba(16, 185, 129, 0.12)',
  emeraldBorder: 'rgba(16, 185, 129, 0.3)',
};

export default function LoginScreen() {
  const { sendOtp, verifyOtp, logout, user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = height < 700 || width < 360;

  // Onboarding steps: 'phone' | 'otp' | 'profile'
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [focusedOtpIndex, setFocusedOtpIndex] = useState(null);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Refs for 4-digit OTP text inputs
  const otpInputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // Animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(10)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    headerOpacity.setValue(0);
    headerTranslateY.setValue(10);
    formOpacity.setValue(0);
    formTranslateY.setValue(14);

    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [step, formOpacity, formTranslateY, headerOpacity, headerTranslateY]);

  // Resend Countdown Timer (45 seconds)
  useEffect(() => {
    let interval = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => interval && clearInterval(interval);
  }, [resendCooldown]);

  const formatMaskedPhone = rawPhone => {
    if (!rawPhone) return '+91 ••••• •••••';
    const clean = rawPhone.replace(/\D/g, '').slice(-10);
    if (clean.length < 10) return `+91 ${clean}`;
    return `+91 ${clean.slice(0, 2)}••• •••${clean.slice(-2)}`;
  };

  const handlePhoneChange = text => {
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
        setFocusedOtpIndex(0);
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
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const updatedOtp = [...otp];
      updatedOtp[index] = '';
      setOtp(updatedOtp);
      if (otpError) setOtpError('');
      if (serverError) setServerError('');
      return;
    }

    // Support 4-digit paste
    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, 4).split('');
      const updatedOtp = [...otp];
      digits.forEach((d, i) => {
        if (i < 4) updatedOtp[i] = d;
      });
      setOtp(updatedOtp);
      if (otpError) setOtpError('');
      if (serverError) setServerError('');

      if (digits.length === 4) {
        otpInputRefs[3].current?.focus();
        handleVerifyOtp(digits.join(''));
      } else {
        otpInputRefs[Math.min(digits.length, 3)].current?.focus();
      }
      return;
    }

    // Single digit input
    const digit = cleaned.slice(-1);
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

  const handleVerifyOtp = async codeToVerify => {
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
      if (!result.success) {
        setServerError(result.message || 'Incorrect verification code.');
      } else if (!result.isProfileComplete) {
        setStep('profile');
        setServerError('');
      }
    } catch (_err) {
      setServerError('Network error verifying code.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeStep = step === 'phone' ? 1 : step === 'otp' ? 2 : 3;
  const handleBackToPhone = () => {
    if (user && !isAuthenticated && user.isProfileComplete !== true) {
      logout().catch(() => {});
    }
    setStep('phone');
    setOtp(['', '', '', '']);
    setOtpError('');
    setServerError('');
    setFocusedOtpIndex(null);
  };

  if (step === 'profile') {
    return (
      <SpeechRegistrationScreen
        embeddedFlow
        onBack={handleBackToPhone}
      />
    );
  }

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
            paddingTop: Math.max(insets.top + (isCompact ? 8 : 12), 12),
            paddingBottom: Math.max(insets.bottom + 20, 28),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthFlowProgress
          activeStep={activeStep}
          onBack={step === 'otp' ? handleBackToPhone : undefined}
        />

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
          <View style={styles.brandMark} accessible accessibilityRole="image" accessibilityLabel="SalesBuster logo">
            <SalesBusterIcon size={60} borderRadius={12} />
          </View>
          <Text style={styles.title}>
            {step === 'phone' ? 'Welcome to SalesBuster' : 'Enter your code'}
          </Text>
          <Text style={styles.subtitle}>
            {step === 'phone'
              ? 'Use your mobile number to securely access your account.'
              : `We sent a 4-digit SMS code to ${formatMaskedPhone(phone)}.`}
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
            /* ================= Step 1: Login / Mobile Number Screen ================= */
            <View>
              {/* Country Code + Mobile Number Input */}
              <View
                style={[
                  styles.phoneInputContainer,
                  isPhoneFocused && styles.phoneInputContainerFocused,
                  phoneError ? styles.phoneInputContainerError : null,
                ]}
              >
                {/* Country Code Selector (Default India +91) */}
                <View style={styles.countryCodePill}>
                  <Text style={styles.countryFlag}>🇮🇳</Text>
                  <Text style={styles.countryCodeText}>+91</Text>
                  <ChevronDownIcon size={12} color={PALETTE.textMuted} />
                </View>

                <View style={styles.phoneDivider} />

                <TextInput
                  value={phone}
                  onChangeText={handlePhoneChange}
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={() => setIsPhoneFocused(false)}
                  placeholder="Enter mobile number"
                  placeholderTextColor={PALETTE.textPlaceholder}
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={styles.phoneTextInput}
                  autoFocus={step === 'phone'}
                />

                {phone.length === 10 && (
                  <View style={styles.phoneVerifiedBadge}>
                    <CheckIcon size={12} color={PALETTE.emerald} />
                  </View>
                )}
              </View>

              {/* 10-digit Guidance & Counter */}
              <View style={styles.guidanceRow}>
                <Text style={styles.guidanceText}>
                  {phone.length === 0
                    ? '10-digit mobile number'
                    : phone.length < 10
                    ? `Enter 10 digits (${10 - phone.length} remaining)`
                    : 'Valid 10-digit mobile number'}
                </Text>
                <Text
                  style={[
                    styles.counterText,
                    phone.length === 10 && styles.counterComplete,
                  ]}
                >
                  {phone.length}/10
                </Text>
              </View>

              {/* Inline Validation Error */}
              {phoneError ? (
                <View style={styles.inlineErrorRow}>
                  <AlertCircleIcon size={14} color={PALETTE.errorText} />
                  <Text style={styles.inlineErrorText}>{phoneError}</Text>
                </View>
              ) : null}

              {/* Server Error Banner */}
              {serverError ? (
                <View style={styles.serverErrorBox}>
                  <AlertCircleIcon size={15} color={PALETTE.errorText} />
                  <Text style={styles.serverErrorText}>{serverError}</Text>
                </View>
              ) : null}

              {/* Primary CTA: Continue */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (isLoading || phone.length < 10) && styles.buttonDisabled,
                ]}
                onPress={handleSendOtp}
                disabled={isLoading || phone.length < 10}
                activeOpacity={0.85}
              >
                <BrandGradientBackground id="login_continue_grad" borderRadius={16} />
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.phonePrivacyNote}>
                We’ll use this number to verify and protect your account.
              </Text>
            </View>
          ) : (
            /* ================= Step 2: OTP Verification Screen ================= */
            <View>
              {/* Masked Mobile Number & Change Number Action */}
              <View style={styles.otpMetaCard}>
                <View style={styles.maskedNumberWrapper}>
                  <PhoneIcon size={14} color={PALETTE.purpleBright} />
                  <Text style={styles.maskedNumberText}>
                    {formatMaskedPhone(phone)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.changeNumberButton}
                  onPress={handleBackToPhone}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <EditIcon size={13} color={PALETTE.purpleBright} />
                  <Text style={styles.changeNumberText}>Change number</Text>
                </TouchableOpacity>
              </View>

              {/* Four Modern OTP Input Boxes */}
              <View style={styles.otpBoxesRow}>
                {otp.map((digit, idx) => {
                  const isFocused = focusedOtpIndex === idx;
                  const isFilled = Boolean(digit);
                  const hasError = Boolean(otpError);

                  return (
                    <TextInput
                      key={idx}
                      ref={otpInputRefs[idx]}
                      value={digit}
                      onChangeText={val => handleOtpDigitChange(idx, val)}
                      onKeyPress={e => handleOtpKeyPress(idx, e)}
                      onFocus={() => setFocusedOtpIndex(idx)}
                      onBlur={() =>
                        setFocusedOtpIndex(prev => (prev === idx ? null : prev))
                      }
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      textAlign="center"
                      style={[
                        styles.otpBox,
                        isFilled && styles.otpBoxFilled,
                        isFocused && styles.otpBoxFocused,
                        hasError && styles.otpBoxError,
                      ]}
                    />
                  );
                })}
              </View>

              {/* Friendly Inline Validation Error */}
              {otpError ? (
                <View style={styles.inlineErrorRow}>
                  <AlertCircleIcon size={14} color={PALETTE.errorText} />
                  <Text style={styles.inlineErrorText}>{otpError}</Text>
                </View>
              ) : null}

              {/* Server Error Banner */}
              {serverError ? (
                <View style={styles.serverErrorBox}>
                  <AlertCircleIcon size={15} color={PALETTE.errorText} />
                  <Text style={styles.serverErrorText}>{serverError}</Text>
                </View>
              ) : null}

              {/* Prominent Verify Button */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (isLoading || otp.some(d => !d)) && styles.buttonDisabled,
                ]}
                onPress={() => handleVerifyOtp()}
                disabled={isLoading || otp.some(d => !d)}
                activeOpacity={0.85}
              >
                <BrandGradientBackground id="verify_otp_grad" borderRadius={16} />
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify</Text>
                )}
              </TouchableOpacity>

              {/* Resend OTP Action with Visible Countdown */}
              <View style={styles.resendRow}>
                {resendCooldown > 0 ? (
                  <Text style={styles.cooldownText}>
                    Resend code in{' '}
                    <Text style={styles.cooldownHighlight}>
                      {resendCooldown}s
                    </Text>
                  </Text>
                ) : (
                  <View style={styles.resendActionContainer}>
                    <Text style={styles.resendPromptText}>
                      Didn't receive code?{' '}
                    </Text>
                    <TouchableOpacity
                      onPress={handleSendOtp}
                      disabled={isLoading}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.resendActionText}>Resend code</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </Animated.View>
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
    paddingTop: 8,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 22,
  },
  brandMark: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    color: PALETTE.textPrimary,
    fontSize: 26,
    fontFamily: Fonts.family.bold,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 7,
    letterSpacing: -0.55,
  },
  subtitle: {
    color: PALETTE.textSecondary,
    fontSize: 13.5,
    fontFamily: Fonts.family.regular,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#101827',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C1422',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: PALETTE.inputBorder,
    paddingHorizontal: 14,
    height: 51,
  },
  phoneInputContainerFocused: {
    borderColor: PALETTE.inputBorderFocused,
    backgroundColor: PALETTE.inputBgFocused,
  },
  phoneInputContainerError: {
    borderColor: PALETTE.inputBorderError,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  countryCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countryFlag: {
    fontSize: 18,
  },
  countryCodeText: {
    color: PALETTE.textPrimary,
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
  },
  phoneDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 12,
  },
  phoneTextInput: {
    flex: 1,
    padding: 0,
    margin: 0,
    color: PALETTE.textPrimary,
    fontSize: 14,
    fontFamily: Fonts.family.medium,
    letterSpacing: 0.5,
  },
  phoneVerifiedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PALETTE.emeraldBg,
    borderWidth: 1,
    borderColor: PALETTE.emeraldBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  guidanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  guidanceText: {
    color: PALETTE.textMuted,
    fontSize: 12,
    fontFamily: Fonts.family.regular,
  },
  counterText: {
    color: PALETTE.textMuted,
    fontSize: 12,
    fontFamily: Fonts.family.medium,
  },
  counterComplete: {
    color: PALETTE.emerald,
  },
  otpMetaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.18)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  maskedNumberWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  maskedNumberText: {
    color: PALETTE.textPrimary,
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
    letterSpacing: 0.5,
  },
  changeNumberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
  },
  changeNumberText: {
    color: PALETTE.purpleBright,
    fontSize: 12,
    fontFamily: Fonts.family.medium,
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  otpBox: {
    flex: 1,
    maxWidth: 68,
    height: 70,
    backgroundColor: '#0C1422',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.inputBorder,
    color: PALETTE.textPrimary,
    fontSize: 24,
    fontFamily: Fonts.family.bold,
    textAlign: 'center',
  },
  otpBoxFilled: {
    backgroundColor: '#141A29',
    borderColor: 'rgba(139, 92, 246, 0.45)',
  },
  otpBoxFocused: {
    backgroundColor: PALETTE.inputBgFocused,
    borderColor: PALETTE.inputBorderFocused,
    borderWidth: 1.5,
  },
  otpBoxError: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: PALETTE.inputBorderError,
    borderWidth: 1.5,
  },
  inlineErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  inlineErrorText: {
    color: PALETTE.errorText,
    fontSize: 12.5,
    fontFamily: Fonts.family.medium,
    flex: 1,
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
    fontFamily: Fonts.family.medium,
    flex: 1,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: '#5013C7',
    borderRadius: 15,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    overflow: 'hidden',
    shadowColor: '#5013C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontFamily: Fonts.family.bold,
    letterSpacing: 0.3,
  },
  phonePrivacyNote: {
    color: PALETTE.textMuted,
    fontSize: 11.5,
    fontFamily: Fonts.family.regular,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 14,
    paddingHorizontal: 8,
  },
  resendRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  cooldownText: {
    color: PALETTE.textSecondary,
    fontSize: 13.5,
    fontFamily: Fonts.family.regular,
  },
  cooldownHighlight: {
    color: PALETTE.purpleBright,
    fontFamily: Fonts.family.bold,
  },
  resendActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendPromptText: {
    color: PALETTE.textSecondary,
    fontSize: 13.5,
    fontFamily: Fonts.family.regular,
  },
  resendActionText: {
    color: PALETTE.purpleBright,
    fontSize: 13.5,
    fontFamily: Fonts.family.semiBold,
  },
  footerNote: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  footerNoteText: {
    color: PALETTE.textMuted,
    fontSize: 11.5,
    fontFamily: Fonts.family.regular,
    textAlign: 'center',
    lineHeight: 16,
  },
});
