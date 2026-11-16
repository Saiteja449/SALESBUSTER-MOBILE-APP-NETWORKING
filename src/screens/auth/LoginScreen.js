import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  EyeIcon,
  MailIcon,
  SparklesIcon,
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

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = height < 700 || width < 360;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passwordInputRef = useRef(null);

  // Entrance & interaction animations
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(12)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(16)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const entrance = Animated.stagger(110, [
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
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

  const handleEmailChange = text => {
    setEmail(text);
    if (emailError) setEmailError('');
    if (serverError) setServerError('');
  };

  const handlePasswordChange = text => {
    setPassword(text);
    if (passwordError) setPasswordError('');
    if (serverError) setServerError('');
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Password Assistance',
      'Please contact your SalesBuster organization administrator to reset your password.',
    );
  };

  const handleLogin = async () => {
    if (isLoading) return;

    Keyboard.dismiss();
    const trimmedEmail = email.trim();
    let hasValidationError = false;

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setEmailError('Please enter a valid email address.');
      hasValidationError = true;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Please enter your password.');
      hasValidationError = true;
    } else {
      setPasswordError('');
    }

    if (hasValidationError) {
      return;
    }

    setServerError('');
    setIsLoading(true);
    try {
      const result = await login(trimmedEmail, password);
      if (!result?.success) {
        setServerError(
          result?.message ||
            'Invalid credentials. Please check your details and try again.',
        );
      }
    } catch (_err) {
      setServerError(
        'Network error connecting to server. Please check your connection.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const emailBorderColor = emailError
    ? PALETTE.inputBorderError
    : focusedField === 'email'
    ? PALETTE.inputBorderFocused
    : email.length > 0
    ? 'rgba(56, 189, 248, 0.32)'
    : PALETTE.inputBorder;

  const passwordBorderColor = passwordError
    ? PALETTE.inputBorderError
    : focusedField === 'password'
    ? PALETTE.inputBorderFocused
    : password.length > 0
    ? 'rgba(56, 189, 248, 0.32)'
    : PALETTE.inputBorder;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PALETTE.bgStatusBar} />

      {/* Guest-matched dark backdrop & soft purple radial glow */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="loginLogoGlow" cx="50%" cy="18%" r="45%">
              <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.28" />
              <Stop offset="0.55" stopColor="#6D28D9" stopOpacity="0.1" />
              <Stop offset="1" stopColor="#04050F" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="url(#loginLogoGlow)"
          />
        </Svg>
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + (isCompact ? 16 : 28), 32),
            paddingBottom: Math.max(insets.bottom + 20, 28),
          },
        ]}
        extraHeight={90}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* A. Branding Section */}
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
              <SalesBusterLogo width={138} height={29} />
            </View>
          </View>

          <Text style={[styles.title, isCompact && styles.titleCompact]}>
            Welcome Back
          </Text>
          <Text style={styles.subtitle}>
            Your sales intelligence workspace is waiting.
          </Text>
        </Animated.View>

        {/* B. Login Form Card */}
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
          {/* Server / Network Error Banner */}
          {Boolean(serverError) && (
            <View style={styles.serverErrorBanner}>
              <AlertCircleIcon size={18} color={PALETTE.errorText} />
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          )}

          {/* Email Field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: emailBorderColor,
                  backgroundColor:
                    focusedField === 'email'
                      ? PALETTE.inputBgFocused
                      : PALETTE.inputBg,
                },
              ]}
            >
              <View style={styles.inputIcon}>
                <MailIcon
                  size={18}
                  color={
                    emailError
                      ? PALETTE.inputBorderError
                      : focusedField === 'email'
                      ? PALETTE.electricBlueBright
                      : PALETTE.textSecondary
                  }
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                placeholderTextColor={PALETTE.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                value={email}
                onChangeText={handleEmailChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                editable={!isLoading}
              />
            </View>
            {Boolean(emailError) && (
              <Text style={styles.fieldErrorText}>{emailError}</Text>
            )}
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <View style={styles.passwordLabelRow}>
              <Text style={[styles.label, styles.labelInline]}>Password</Text>
              {/* <TouchableOpacity
                onPress={handleForgotPassword}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity> */}
            </View>

            <View
              style={[
                styles.inputWrapper,
                {
                  borderColor: passwordBorderColor,
                  backgroundColor:
                    focusedField === 'password'
                      ? PALETTE.inputBgFocused
                      : PALETTE.inputBg,
                },
              ]}
            >
              <View style={styles.inputIcon}>
                <LockIcon
                  size={18}
                  color={
                    passwordError
                      ? PALETTE.inputBorderError
                      : focusedField === 'password'
                      ? PALETTE.electricBlueBright
                      : PALETTE.textSecondary
                  }
                />
              </View>
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor={PALETTE.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                returnKeyType="done"
                value={password}
                onChangeText={handlePasswordChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={handleLogin}
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(prev => !prev)}
                style={styles.eyeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={
                  showPassword ? 'Hide password' : 'Show password'
                }
              >
                {showPassword ? (
                  <EyeOffIcon size={19} color={PALETTE.electricBlueBright} />
                ) : (
                  <EyeIcon size={19} color={PALETTE.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
            {Boolean(passwordError) && (
              <Text style={styles.fieldErrorText}>{passwordError}</Text>
            )}
          </View>

          {/* C. Primary Sign In Button */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <Pressable
              onPress={handleLogin}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.signInButton,
                pressed && !isLoading && styles.signInButtonPressed,
                isLoading && styles.signInButtonDisabled,
              ]}
            >
              <View style={styles.signInTopHighlight} />
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.signInText}>Signing In...</Text>
                </View>
              ) : (
                <Text style={styles.signInText}>Sign In</Text>
              )}
            </Pressable>
          </Animated.View>

          {/* D. Divider & Guest Registration Option */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.guestRegisterBtn}
            onPress={() => navigation.navigate('GuestRegister')}
            disabled={isLoading}
            activeOpacity={0.78}
          >
            <View style={styles.guestTitleRow}>
              <SparklesIcon size={16} color={PALETTE.orangeSoft} />
              <Text style={styles.guestRegisterBtnText}>
                Create an Account
              </Text>
            </View>
            <Text style={styles.guestRegisterSubtext}>
              Instant voice event & contact capture workspace
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tourLinkBtn}
            onPress={() => navigation.navigate('Onboarding')}
            activeOpacity={0.7}
          >
            <Text style={styles.tourLinkText}>View App Introduction Tour</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: formOpacity }]}>
          <Text style={styles.footerBrand}>Powered by SalesBuster AI</Text>
          <Text style={styles.footerTagline}>Bust Limits. Boost Sales.</Text>
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
    marginBottom: Spacing.xl,
  },
  headerCompact: {
    marginBottom: Spacing.lg,
  },
  logoRing: {
    padding: 5,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    marginBottom: Spacing.lg,
    elevation: 10,
    shadowColor: '#2E087A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
  },
  logoContainer: {
    width: 156,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    // paddingHorizontal: 14,
  },
  logoImage: {
    width: '90%',
    height: '90%',
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.family.extraBold,
    color: PALETTE.textPrimary,
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  titleCompact: {
    fontSize: 25,
  },
  subtitle: {
    fontSize: 14.5,
    fontFamily: Fonts.family.regular,
    color: PALETTE.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
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
    marginBottom: Spacing.lg,
  },
  serverErrorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.family.medium,
    color: PALETTE.errorText,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
    color: PALETTE.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  labelInline: {
    marginBottom: 0,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 12.5,
    fontFamily: Fonts.family.semiBold,
    color: PALETTE.electricBlueBright,
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
    marginTop: 6,
    marginLeft: 2,
  },
  signInButton: {
    marginTop: 4,
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
  signInButtonPressed: {
    backgroundColor: '#1754C8',
  },
  signInButtonDisabled: {
    opacity: 0.72,
  },
  signInTopHighlight: {
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
  signInText: {
    fontSize: 16,
    fontFamily: Fonts.family.bold,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: 11.5,
    fontFamily: Fonts.family.semiBold,
    color: PALETTE.textMuted,
    letterSpacing: 1,
  },
  guestRegisterBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.35)',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
  guestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  guestRegisterBtnText: {
    fontSize: 14,
    fontFamily: Fonts.family.bold,
    color: PALETTE.orangeSoft,
  },
  guestRegisterSubtext: {
    fontSize: 11.5,
    fontFamily: Fonts.family.regular,
    color: PALETTE.textSecondary,
    textAlign: 'center',
  },
  tourLinkBtn: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tourLinkText: {
    fontSize: 12.5,
    fontFamily: Fonts.family.medium,
    color: PALETTE.electricBlueBright,
    textDecorationLine: 'underline',
    letterSpacing: 0.2,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerBrand: {
    fontSize: 12,
    fontFamily: Fonts.family.semiBold,
    color: 'rgba(148, 163, 184, 0.75)',
    letterSpacing: 0.4,
  },
  footerTagline: {
    fontSize: 11,
    fontFamily: Fonts.family.medium,
    color: 'rgba(100, 116, 139, 0.85)',
    marginTop: 2,
    letterSpacing: 0.4,
  },
});

export default LoginScreen;
