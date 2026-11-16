import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Keyboard,
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
  Line,
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
  EyeIcon,
  MailIcon,
  PhoneIcon,
  SparklesIcon,
  UserIcon,
} from '../../icons/Icons';
import { Fonts } from '../../styles/Fonts';
import { Spacing } from '../../styles/Spacing';
import { SalesBusterLogo } from '../../components/common/BrandLogo';

const PALETTE = {
  bgDeep: 'rgba(4, 5, 15)',
  bgStatusBar: '#04050F',
  cardBg: '#17162A',
  cardBorder: '#363252',
  inputBg: '#1B1C2E',
  inputBgFocused: '#1B1C2E',
  inputBorder: 'rgba(255, 255, 255, 0.04)',
  inputBorderFocused: '#8B5CF6',
  inputBorderError: '#F87171',
  electricBlue: '#7C3AED',
  electricBlueBright: '#A78BFA',
  orangeAccent: '#A855F7',
  orangeSoft: '#C4B5FD',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  errorText: '#FCA5A5',
  errorBg: 'rgba(239, 68, 68, 0.14)',
  errorBorder: 'rgba(248, 113, 113, 0.4)',
  successText: '#6EE7B7',
  successBg: 'rgba(16, 185, 129, 0.14)',
  successBorder: 'rgba(52, 211, 153, 0.38)',
};

const LockIcon = ({ size = 18, color = PALETTE.textSecondary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect
      x="5"
      y="11"
      width="14"
      height="10"
      rx="2.5"
      stroke={color}
      strokeWidth={1.9}
    />
    <Path
      d="M8 11V7a4 4 0 018 0v4"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
    />
  </Svg>
);

const EyeOffIcon = ({ size = 19, color = PALETTE.textSecondary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line
      x1="2"
      y1="2"
      x2="22"
      y2="22"
      stroke={color}
      strokeWidth={1.9}
      strokeLinecap="round"
    />
  </Svg>
);

export const GuestRegisterScreen = ({ navigation }) => {
  const { registerGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = height < 700 || width < 360;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [focusedField, setFocusedField] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  // Entrance & button animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(12)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(16)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const entrance = Animated.stagger(100, [
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
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    entrance.start();
    return () => entrance.stop();
  }, [formOpacity, formTranslateY, headerOpacity, headerTranslateY]);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.975,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const updateField = (field, setter) => (value) => {
    setter(value);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const getFieldBorderColor = (field, value) => {
    if (errors[field]) return PALETTE.inputBorderError;
    if (focusedField === field) return PALETTE.inputBorderFocused;
    if (value && value.length > 0) return 'rgba(56, 189, 248, 0.32)';
    return PALETTE.inputBorder;
  };

  const getIconColor = (field) => {
    if (errors[field]) return PALETTE.inputBorderError;
    if (focusedField === field) return PALETTE.electricBlueBright;
    return PALETTE.textSecondary;
  };

  const handleRegister = async () => {
    if (isLoading || isSuccess) return;

    Keyboard.dismiss();

    const nextErrors = {};
    if (!name || name.trim().length < 2) {
      nextErrors.name = 'Please enter your full name (at least 2 characters).';
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    const cleanDigits = phone.replace(/\D/g, '');
    if (!phone || cleanDigits.length < 10) {
      nextErrors.phone = 'Please enter a valid 10-digit mobile number.';
    }

    if (!password || password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Password and confirm password do not match.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setServerError('');
    setIsLoading(true);

    try {
      const result = await registerGuest(name.trim(), cleanEmail, cleanDigits, password);
      if (result?.success) {
        setIsSuccess(true);
      } else {
        setServerError(
          result?.message || 'Could not complete registration. Please try again.',
        );
      }
    } catch (_err) {
      setServerError('Network error connecting to server. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PALETTE.bgStatusBar} />

      {/* Guest-matched dark backdrop & soft purple radial glow */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="guestLogoGlow" cx="50%" cy="15%" r="42%">
              <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.28" />
              <Stop offset="0.55" stopColor="#6D28D9" stopOpacity="0.1" />
              <Stop offset="1" stopColor="#04050F" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill="url(#guestLogoGlow)" />
        </Svg>
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + (isCompact ? 12 : 20), 24),
            paddingBottom: Math.max(insets.bottom + 20, 28),
          },
        ]}
        extraHeight={90}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* A. Compact Branding & Introduction */}
        <Animated.View
          style={[
            styles.header,
            isCompact && styles.headerCompact,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <View style={styles.logoRing}>
            <View style={styles.logoContainer}>
              <SalesBusterLogo width={128} height={27} />
            </View>
          </View>

          <View style={styles.workspaceBadge}>
            <SparklesIcon size={13} color={PALETTE.orangeSoft} />
            <Text style={styles.workspaceBadgeText}>Free Event Capture Workspace</Text>
          </View>

          <Text style={[styles.title, isCompact && styles.titleCompact]}>
            Create Your Account
          </Text>
          <Text style={styles.subtitle}>
            Get started with SalesBuster. Capture contacts and manage your event leads effortlessly.
          </Text>
        </Animated.View>

        {/* B. Registration Form Card */}
        <Animated.View
          style={[
            styles.formCard,
            isCompact && styles.formCardCompact,
            {
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }],
            },
          ]}
        >
          {Boolean(serverError) && (
            <View style={styles.serverErrorBanner}>
              <AlertCircleIcon size={18} color={PALETTE.errorText} />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          {isSuccess && (
            <View style={styles.successBanner}>
              <CheckIcon size={18} color={PALETTE.successText} />
              <Text style={styles.successText}>
                Account created! Opening your workspace...
              </Text>
            </View>
          )}

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: getFieldBorderColor('name', name),
                  backgroundColor:
                    focusedField === 'name' ? PALETTE.inputBgFocused : PALETTE.inputBg,
                },
              ]}
            >
              <View style={styles.inputIcon}>
                <UserIcon size={18} color={getIconColor('name')} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={PALETTE.textMuted}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                blurOnSubmit={false}
                value={name}
                onChangeText={updateField('name', setName)}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => emailRef.current?.focus()}
                editable={!isLoading && !isSuccess}
              />
            </View>
            {Boolean(errors.name) && (
              <Text style={styles.fieldErrorText}>{errors.name}</Text>
            )}
          </View>

          {/* Email Address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: getFieldBorderColor('email', email),
                  backgroundColor:
                    focusedField === 'email' ? PALETTE.inputBgFocused : PALETTE.inputBg,
                },
              ]}
            >
              <View style={styles.inputIcon}>
                <MailIcon size={18} color={getIconColor('email')} />
              </View>
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="name@example.com"
                placeholderTextColor={PALETTE.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                value={email}
                onChangeText={updateField('email', setEmail)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => phoneRef.current?.focus()}
                editable={!isLoading && !isSuccess}
              />
            </View>
            {Boolean(errors.email) && (
              <Text style={styles.fieldErrorText}>{errors.email}</Text>
            )}
          </View>

          {/* Mobile Phone Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mobile Phone Number</Text>
            <View
              style={[
                styles.inputWrapper,
                styles.phoneInputWrapper,
                {
                  borderColor: getFieldBorderColor('phone', phone),
                  backgroundColor:
                    focusedField === 'phone' ? PALETTE.inputBgFocused : PALETTE.inputBg,
                },
              ]}
            >
              <Text style={styles.countryCodeText}>+91</Text>
              <View style={styles.phoneDivider} />
              <TextInput
                ref={phoneRef}
                style={[styles.input, styles.phoneInput]}
                placeholder="10-digit mobile number"
                placeholderTextColor={PALETTE.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="next"
                blurOnSubmit={false}
                value={phone}
                onChangeText={updateField('phone', setPhone)}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!isLoading && !isSuccess}
              />
            </View>
            {Boolean(errors.phone) && (
              <Text style={styles.fieldErrorText}>{errors.phone}</Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: getFieldBorderColor('password', password),
                  backgroundColor:
                    focusedField === 'password' ? PALETTE.inputBgFocused : PALETTE.inputBg,
                },
              ]}
            >
              <View style={styles.inputIcon}>
                <LockIcon size={18} color={getIconColor('password')} />
              </View>
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Minimum 6 characters"
                placeholderTextColor={PALETTE.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="next"
                blurOnSubmit={false}
                value={password}
                onChangeText={updateField('password', setPassword)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                editable={!isLoading && !isSuccess}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOffIcon size={19} color={PALETTE.electricBlueBright} />
                ) : (
                  <EyeIcon size={19} color={PALETTE.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
            {Boolean(errors.password) && (
              <Text style={styles.fieldErrorText}>{errors.password}</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: getFieldBorderColor('confirmPassword', confirmPassword),
                  backgroundColor:
                    focusedField === 'confirmPassword'
                      ? PALETTE.inputBgFocused
                      : PALETTE.inputBg,
                },
              ]}
            >
              <View style={styles.inputIcon}>
                <LockIcon size={18} color={getIconColor('confirmPassword')} />
              </View>
              <TextInput
                ref={confirmPasswordRef}
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor={PALETTE.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password-new"
                textContentType="newPassword"
                returnKeyType="done"
                value={confirmPassword}
                onChangeText={updateField('confirmPassword', setConfirmPassword)}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={handleRegister}
                editable={!isLoading && !isSuccess}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOffIcon size={19} color={PALETTE.electricBlueBright} />
                ) : (
                  <EyeIcon size={19} color={PALETTE.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
            {Boolean(errors.confirmPassword) && (
              <Text style={styles.fieldErrorText}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* C. Primary Action */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              onPress={handleRegister}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isLoading || isSuccess}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && !isLoading && !isSuccess && styles.primaryButtonPressed,
                (isLoading || isSuccess) && styles.primaryButtonDisabled,
              ]}
            >
              <View style={styles.buttonTopHighlight} />
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Creating Account...</Text>
                </View>
              ) : isSuccess ? (
                <View style={styles.loadingRow}>
                  <CheckIcon size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Account Created</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </Pressable>
          </Animated.View>

          {/* D. Existing Account Option */}
          <TouchableOpacity
            style={styles.switchAuthBtn}
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.switchAuthText}>
              Already have an account?{' '}
              <Text style={styles.switchAuthHighlight}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* E. Trust & Reassurance Footer */}
        <Animated.View style={[styles.footer, { opacity: formOpacity }]}>
          <Text style={styles.footerReassurance}>
            Quick setup. Simple lead management. Smarter follow-ups.
          </Text>
          <Text style={styles.footerBrand}>Powered by SalesBuster AI</Text>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.bgDeep,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  headerCompact: {
    marginBottom: Spacing.md,
  },
  logoRing: {
    padding: 4,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    marginBottom: Spacing.md,
    elevation: 10,
    shadowColor: '#2E087A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  logoContainer: {
    width: 142,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  logoImage: {
    width: "90%",
    height: "90%",
  },
  workspaceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(23, 22, 42, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(221, 214, 254, 0.35)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  workspaceBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.family.semiBold,
    color: PALETTE.orangeSoft,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.family.extraBold,
    color: PALETTE.textPrimary,
    letterSpacing: 0.3,
    textAlign: 'center',
    marginBottom: 6,
  },
  titleCompact: {
    fontSize: 22,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: Fonts.family.regular,
    color: PALETTE.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  formCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    padding: Spacing.xl,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  formCardCompact: {
    padding: Spacing.lg,
    borderRadius: 18,
  },
  serverErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PALETTE.errorBg,
    borderWidth: 1,
    borderColor: PALETTE.errorBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  serverErrorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.family.medium,
    color: PALETTE.errorText,
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PALETTE.successBg,
    borderWidth: 1,
    borderColor: PALETTE.successBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: Spacing.md,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.family.medium,
    color: PALETTE.successText,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12.5,
    fontFamily: Fonts.family.semiBold,
    color: PALETTE.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1C2E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  phoneInputWrapper: {
    paddingHorizontal: 14,
  },
  countryCodeText: {
    color: '#8F90A6',
    fontSize: 15,
    fontFamily: Fonts.family.medium,
  },
  phoneDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#353754',
    marginHorizontal: 12,
  },
  phoneInput: {
    flex: 1,
  },
  inputIcon: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.family.regular,
    color: '#ADADAD',
    paddingVertical: 14,
  },
  eyeButton: {
    paddingLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldErrorText: {
    fontSize: 12,
    fontFamily: Fonts.family.medium,
    color: PALETTE.inputBorderError,
    marginTop: 5,
    marginLeft: 2,
  },
  primaryButton: {
    marginTop: 6,
    height: 52,
    borderRadius: 14,
    backgroundColor: PALETTE.electricBlue,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: PALETTE.electricBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  primaryButtonPressed: {
    backgroundColor: '#1754C8',
  },
  primaryButtonDisabled: {
    opacity: 0.78,
  },
  buttonTopHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(147, 197, 253, 0.5)',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 15.5,
    fontFamily: Fonts.family.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  switchAuthBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  switchAuthText: {
    fontSize: 13.5,
    color: PALETTE.textSecondary,
    fontFamily: Fonts.family.regular,
  },
  switchAuthHighlight: {
    color: PALETTE.electricBlueBright,
    fontFamily: Fonts.family.bold,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  footerReassurance: {
    fontSize: 11.5,
    fontFamily: Fonts.family.regular,
    color: 'rgba(148, 163, 184, 0.78)',
    textAlign: 'center',
    marginBottom: 4,
  },
  footerBrand: {
    fontSize: 11.5,
    fontFamily: Fonts.family.semiBold,
    color: 'rgba(100, 116, 139, 0.9)',
    letterSpacing: 0.4,
  },
});

export default GuestRegisterScreen;
