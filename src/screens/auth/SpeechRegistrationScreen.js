import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  PermissionsAndroid,
  NativeModules,
  StatusBar,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Text from '../../components/common/AppText';
import TextInput from '../../components/common/AppTextInput';
import KeyboardAwareScrollView from '../../components/common/KeyboardAwareScrollView';
import BrandGradientBackground from '../../components/common/BrandGradientBackground';
import AuthFlowProgress from '../../components/auth/AuthFlowProgress';
import { SalesBusterIcon } from '../../components/common/BrandLogo';
import { Fonts } from '../../styles/Fonts';
import { useAuth } from '../../context/AuthContext';
import { useGeminiLiveVoice } from '../../hooks/useGeminiLiveVoice';
import { eventService } from '../../services/api/eventService';
import {
  AlertCircleIcon,
  CheckIcon,
  SparklesIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  XIcon,
} from '../../icons/Icons';
import {
  extractName,
  extractCompanyName,
  extractDesignation,
  extractCity,
} from '../../utils/voiceEntityExtractor';

const { GeminiVoiceAudioModule } = NativeModules;

// Waveform bar specifications matching GuestHomeScreen
const WAVE_BARS_LEFT = [
  { h: 4, o: 0.3 },
  { h: 6, o: 0.35 },
  { h: 8, o: 0.4 },
  { h: 14, o: 0.45 },
  { h: 24, o: 0.55 },
  { h: 40, o: 0.68 },
  { h: 58, o: 0.82 },
  { h: 48, o: 0.74 },
  { h: 34, o: 0.62 },
  { h: 22, o: 0.5 },
  { h: 16, o: 0.45 },
  { h: 26, o: 0.58 },
  { h: 44, o: 0.72 },
  { h: 70, o: 0.88 },
  { h: 96, o: 1.0 },
  { h: 86, o: 0.94 },
  { h: 68, o: 0.82 },
  { h: 52, o: 0.7 },
  { h: 38, o: 0.58 },
  { h: 28, o: 0.48 },
];

const WAVE_BARS_RIGHT = [
  { h: 28, o: 0.48 },
  { h: 38, o: 0.58 },
  { h: 52, o: 0.7 },
  { h: 68, o: 0.82 },
  { h: 86, o: 0.94 },
  { h: 96, o: 1.0 },
  { h: 70, o: 0.88 },
  { h: 44, o: 0.72 },
  { h: 26, o: 0.58 },
  { h: 16, o: 0.45 },
  { h: 22, o: 0.5 },
  { h: 34, o: 0.62 },
  { h: 48, o: 0.74 },
  { h: 58, o: 0.82 },
  { h: 40, o: 0.68 },
  { h: 24, o: 0.55 },
  { h: 14, o: 0.45 },
  { h: 8, o: 0.4 },
  { h: 6, o: 0.35 },
  { h: 4, o: 0.3 },
];

export const ANALYSING_STEPS = [
  { id: 1, title: 'Audio processing' },
  { id: 2, title: 'Extracting registration information' },
  { id: 3, title: 'Identifying name, company, role and city' },
  { id: 4, title: 'Fetching and populating profile details' },
];

const formatVoiceTimer = sec => {
  const mins = Math.floor(sec / 60);
  const remaining = sec % 60;
  return `${mins.toString().padStart(2, '0')}:${remaining
    .toString()
    .padStart(2, '0')}`;
};

export default function SpeechRegistrationScreen({
  navigation,
  route,
  onComplete,
  onBack,
  embeddedFlow = false,
}) {
  const { user, completeProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const isAlreadyComplete = Boolean(user?.isProfileComplete);
  const [name, setName] = useState(
    isAlreadyComplete && user?.name && !user.name.startsWith('Guest_')
      ? user.name
      : '',
  );
  const [companyName, setCompanyName] = useState(
    isAlreadyComplete &&
      user?.companyName &&
      !user.companyName.includes("'s Workspace")
      ? user.companyName
      : '',
  );
  const [role, setRole] = useState(
    isAlreadyComplete &&
      user?.role &&
      !user.role.toLowerCase().includes('sales manager')
      ? user.role
      : '',
  );
  const [city, setCity] = useState(isAlreadyComplete ? user?.city || '' : '');
  const [email, setEmail] = useState(
    user?.email && !user.email.includes('@guest.salesbuster.ai')
      ? user.email
      : '',
  );

  // Voice capture popup states (matching GuestHomeScreen exactly)
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceAnalysing, setIsVoiceAnalysing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(1);
  const [voiceCountdown, setVoiceCountdown] = useState(null);
  const [voiceRecordingSeconds, setVoiceRecordingSeconds] = useState(0);
  const [rawTranscript, setRawTranscript] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isProfileFormVisible, setIsProfileFormVisible] = useState(false);

  const countdownTimerRef = useRef(null);
  const voiceTimerRef = useRef(null);
  const audioCaptureInfoRef = useRef(null);
  const keepAudioForAnalysisRef = useRef(false);

  // Animations matching GuestHomeScreen
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.85)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const waveAnim1 = useRef(new Animated.Value(1)).current;
  const waveAnim2 = useRef(new Animated.Value(1)).current;
  const orangeGlowAnim = useRef(new Animated.Value(0)).current;

  const navigateToHome = useCallback(() => {
    if (navigation?.reset) {
      try {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        return;
      } catch (e) {
        console.warn('Navigation reset failed:', e);
      }
    }
    if (navigation?.replace) {
      try {
        navigation.replace('Main');
        return;
      } catch (e) {
        console.warn('Navigation replace failed:', e);
      }
    }
    if (navigation?.navigate) {
      navigation.navigate('Main');
    }
  }, [navigation]);

  // Process live transcript and extract entities
  const handleTranscript = useCallback(
    spokenText => {
      if (!spokenText || typeof spokenText !== 'string') return;
      setRawTranscript(spokenText);

      // 1. Name
      const extractedName = extractName(spokenText);
      if (extractedName && (!name || name.trim().length === 0)) {
        setName(extractedName);
      }

      // 2. Company Name
      const extractedCompany = extractCompanyName(spokenText);
      if (
        extractedCompany &&
        (!companyName || companyName.trim().length === 0)
      ) {
        setCompanyName(extractedCompany);
      }

      // 3. Role / Designation
      const extractedRole = extractDesignation(spokenText);
      if (extractedRole && (!role || role.trim().length === 0)) {
        setRole(extractedRole);
      }

      // 4. City
      const extractedCity = extractCity(spokenText);
      if (extractedCity && (!city || city.trim().length === 0)) {
        setCity(extractedCity);
      }
    },
    [name, companyName, role, city],
  );

  // Initialize Gemini Live Voice Hook
  const liveVoice = useGeminiLiveVoice({
    token: user?.token,
    user,
    silentMode: true,
    isEventCapture: true,
    captureAudioFile: true,
    onUserTranscript: userText => {
      handleTranscript(userText);
    },
    onContactInterim: contactData => {
      if (contactData?.name && !name) setName(contactData.name);
      if (contactData?.companyName && !companyName)
        setCompanyName(contactData.companyName);
      if (contactData?.designation && !role) setRole(contactData.designation);
    },
    onConversationCompleted: completedData => {
      const extracted =
        completedData?.extractedContact || completedData?.contact || {};
      if (extracted.name && !name) setName(extracted.name);
      if (extracted.companyName && !companyName)
        setCompanyName(extracted.companyName);
      if (extracted.designation && !role) setRole(extracted.designation);
    },
    onSessionEnd: ({ audioCaptureInfo }) => {
      if (keepAudioForAnalysisRef.current) {
        audioCaptureInfoRef.current = audioCaptureInfo;
      } else if (audioCaptureInfo?.filePath) {
        GeminiVoiceAudioModule?.deleteCapturedAudioFile?.(
          audioCaptureInfo.filePath,
        ).catch(() => {});
      }
    },
  });

  const liveVoiceRef = useRef(liveVoice);
  liveVoiceRef.current = liveVoice;

  // Voice recording seconds timer
  useEffect(() => {
    if (
      isVoiceModalVisible &&
      isListening &&
      voiceCountdown === null &&
      !liveVoice?.isPaused
    ) {
      voiceTimerRef.current = setInterval(() => {
        setVoiceRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
    }
    return () => {
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
    };
  }, [isVoiceModalVisible, isListening, voiceCountdown, liveVoice?.isPaused]);

  // Waveform and glow animations
  const isVoiceActivelyRecording = Boolean(
    (isListening && !liveVoice?.isPaused && voiceCountdown === null) ||
      isVoiceAnalysing,
  );

  useEffect(() => {
    if (isVoiceActivelyRecording) {
      Animated.timing(orangeGlowAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      const loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.18,
              duration: 900,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 900,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim1, {
              toValue: 1.8,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(waveAnim1, {
              toValue: 0.6,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim2, {
              toValue: 2.1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(waveAnim2, {
              toValue: 0.5,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 8000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(orangeGlowAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start();
      pulseAnim.setValue(1);
      waveAnim1.setValue(1);
      waveAnim2.setValue(1);
      rotateAnim.setValue(0);
    }
  }, [
    isVoiceActivelyRecording,
    orangeGlowAnim,
    pulseAnim,
    waveAnim1,
    waveAnim2,
    rotateAnim,
  ]);

  // Request audio recording permission
  const checkAudioPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Access for AI Profile Setup',
            message:
              'SalesBuster needs microphone access to listen to your name, company, and role so your profile can be filled automatically using AI voice analysis. Audio is only recorded while you tap the microphone.',
            buttonPositive: 'Allow',
            buttonNegative: 'Not Now',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Microphone permission error:', err);
        return false;
      }
    }
    return true;
  };

  // Open Voice Modal & Start Gemini Live Voice Capture (exact matching GuestHomeScreen)
  const handleOpenVoiceCapture = async () => {
    const hasPerm = await checkAudioPermission();
    if (!hasPerm) {
      setErrorMessage('Microphone permission is required for voice capture.');
      return;
    }

    setVoiceRecordingSeconds(0);
    setRawTranscript('');
    setIsVoiceModalVisible(true);
    setIsListening(false);
    setIsVoiceAnalysing(false);
    setAnalysisStep(1);
    setVoiceCountdown(3);
    orangeGlowAnim.setValue(0);
    setErrorMessage('');

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    let count = 3;
    countdownTimerRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setVoiceCountdown(count);
      } else {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        setVoiceCountdown(null);
        setIsListening(true);
        setVoiceRecordingSeconds(0);
      }
    }, 1000);

    try {
      await liveVoice.startVoiceSession({
        eventName: 'Guest Registration',
        isEventCapture: true,
        captureAudioFile: true,
      });
    } catch (err) {
      console.error('Error starting live voice session:', err);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setVoiceCountdown(null);
      setIsListening(false);
      setIsVoiceModalVisible(false);
      setErrorMessage(err.message || 'Could not start live voice assistant.');
    }
  };

  // Finish Voice: Runs the 4-step AI analysis inside the popup sheet and fills fields
  const handleFinishVoice = async () => {
    if (isVoiceAnalysing) return;
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setVoiceCountdown(null);
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }

    setIsVoiceAnalysing(true);
    setAnalysisStep(1); // 1. Audio processing
    audioCaptureInfoRef.current = null;
    keepAudioForAnalysisRef.current = true;

    try {
      await liveVoiceRef.current?.stopVoiceSession?.();
    } catch (err) {
      console.warn('Error stopping voice session:', err);
    } finally {
      keepAudioForAnalysisRef.current = false;
    }

    // Step 2: Extracting registration details
    setAnalysisStep(2);

    const audioCapture = audioCaptureInfoRef.current;
    let serverExtracted = null;

    if (audioCapture?.filePath) {
      try {
        await new Promise(r => setTimeout(r, 450));
        setAnalysisStep(3); // 3. Identifying name, company, role, city

        const token = user?.token;
        const analysis = await eventService.analyzeVoiceAudio(token, {
          audioUri: audioCapture.filePath,
          eventName: 'Guest Registration',
        });
        serverExtracted = analysis?.data || {};

        if (serverExtracted.name && (!name || name.trim().length === 0)) {
          setName(serverExtracted.name);
        }
        if (
          serverExtracted.companyName &&
          (!companyName || companyName.trim().length === 0)
        ) {
          setCompanyName(serverExtracted.companyName);
        }
        if (
          serverExtracted.designation &&
          (!role || role.trim().length === 0)
        ) {
          setRole(serverExtracted.designation);
        }
        if (serverExtracted.originalTranscript) {
          setRawTranscript(serverExtracted.originalTranscript);
          const extCity = extractCity(serverExtracted.originalTranscript);
          if (extCity && (!city || city.trim().length === 0)) {
            setCity(extCity);
          }
        }
      } catch (error) {
        console.warn(
          '[REGISTRATION_VOICE] Post-stop audio analysis error, using live transcript:',
          error?.message,
        );
      } finally {
        GeminiVoiceAudioModule?.deleteCapturedAudioFile?.(
          audioCapture.filePath,
        ).catch(() => {});
      }
    } else {
      await new Promise(r => setTimeout(r, 450));
      setAnalysisStep(3);
    }

    // Step 4: Supplement with client-side transcript entity extraction
    await new Promise(r => setTimeout(r, 450));
    setAnalysisStep(4);

    const extName = extractName(rawTranscript);
    const extCompany = extractCompanyName(rawTranscript);
    const extRole = extractDesignation(rawTranscript);
    const extCity = extractCity(rawTranscript);

    if (extName && (!name || name.trim().length === 0)) setName(extName);
    if (extCompany && (!companyName || companyName.trim().length === 0))
      setCompanyName(extCompany);
    if (extRole && (!role || role.trim().length === 0)) setRole(extRole);
    if (extCity && (!city || city.trim().length === 0)) setCity(extCity);

    // Step 5: Complete & all checkmarks green
    await new Promise(r => setTimeout(r, 500));
    setAnalysisStep(5);
    await new Promise(r => setTimeout(r, 650));

    // Automatically close the popup after data has been successfully fetched and populated
    setIsProfileFormVisible(true);
    setIsVoiceModalVisible(false);
    setIsVoiceAnalysing(false);
    setAnalysisStep(1);
    setIsListening(false);
    orangeGlowAnim.setValue(0);
  };

  // Close voice popup without finishing
  const handleCloseVoiceModal = async () => {
    if (isVoiceAnalysing) return;
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setVoiceCountdown(null);
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (audioCaptureInfoRef.current?.filePath) {
      GeminiVoiceAudioModule?.deleteCapturedAudioFile?.(
        audioCaptureInfoRef.current.filePath,
      ).catch(() => {});
      audioCaptureInfoRef.current = null;
    }
    orangeGlowAnim.setValue(0);
    setIsVoiceAnalysing(false);
    setAnalysisStep(1);
    setIsVoiceModalVisible(false);
    if (isListening) {
      liveVoiceRef.current?.stopVoiceSession?.().catch(() => {});
      setIsListening(false);
    }
  };

  const handleTogglePauseVoice = () => {
    liveVoice.togglePause();
  };

  // Submit profile details to complete registration
  const handleSubmit = async () => {
    Keyboard.dismiss();
    setErrorMessage('');

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Please provide your full name by speaking or typing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completeProfile({
        name: trimmedName,
        companyName: companyName.trim(),
        role: role.trim() || 'Sales Manager',
        city: city.trim(),
        email: email.trim(),
      });

      if (result.success) {
        if (onComplete) {
          onComplete(result.user);
        }
        if (!embeddedFlow) {
          navigateToHome();
        }
      } else {
        setErrorMessage(result.message || 'Failed to complete registration.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error submitting registration details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset all registration fields (matching GuestHomeScreen handleResetFields)
  const handleReset = () => {
    if (isListening) {
      liveVoiceRef.current?.stopVoiceSession?.().catch(() => {});
      setIsListening(false);
    }

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (audioCaptureInfoRef.current?.filePath) {
      GeminiVoiceAudioModule?.deleteCapturedAudioFile?.(
        audioCaptureInfoRef.current.filePath,
      ).catch(() => {});
      audioCaptureInfoRef.current = null;
    }

    setIsVoiceAnalysing(false);
    setVoiceCountdown(null);
    setVoiceRecordingSeconds(0);
    setIsVoiceModalVisible(false);
    setAnalysisStep(1);
    orangeGlowAnim.setValue(0);

    Keyboard.dismiss();

    setName('');
    setCompanyName('');
    setRole('');
    setCity('');
    setEmail('');
    setErrorMessage('');
    setRawTranscript('');
    setIsProfileFormVisible(false);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const purpleGlowOpacity = orangeGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0D14" />

      {embeddedFlow ? (
        <View style={styles.fixedProgressWrapper}>
          <AuthFlowProgress activeStep={3} onBack={onBack} />
        </View>
      ) : null}

      <KeyboardAwareScrollView
        contentContainerStyle={[
          styles.scrollContent,
          !isProfileFormVisible && styles.startScreenScrollContent,
          {
            paddingBottom: Math.max(insets.bottom + 20, 28),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Section */}
        <View style={styles.topSection}>
          <View
            style={styles.brandMark}
            accessible
            accessibilityRole="image"
            accessibilityLabel="SalesBuster logo"
          >
            <SalesBusterIcon size={60} borderRadius={12} />
          </View>

          {/* Screen Title & Subtitle */}
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>
              Speak your details or enter them manually. You can review everything before saving.
            </Text>
          </View>

        </View>

        {!isProfileFormVisible ? (
          <View style={styles.profileStartSection}>
            <TouchableOpacity
              style={styles.heroVoiceCard}
              onPress={handleOpenVoiceCapture}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel="Fill your profile with Voice AI"
            >
              <View style={styles.heroVoicePulseHalo}>
                <View style={styles.heroVoiceMicCircle}>
                  <MicIcon size={25} color="#FFFFFF" />
                </View>
              </View>
              <View style={styles.heroVoiceTextWrap}>
                <Text style={styles.heroVoiceTitle}>Use Voice AI</Text>
                <Text style={styles.heroVoiceSubtitle}>
                  Speak naturally. We’ll fill in your profile.
                </Text>
              </View>
              <View style={styles.heroVoiceStartBtn}>
                <SparklesIcon size={13} color="#FFFFFF" />
                <Text style={styles.heroVoiceStartBtnText}>Start</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.profilePreviewCard}>
              <View style={styles.profilePreviewHeading}>
                <SparklesIcon size={15} color="#A78BFA" />
                <Text style={styles.profilePreviewTitle}>Your profile will include</Text>
              </View>
              <View style={styles.profilePreviewGrid}>
                {['Name', 'Company', 'Role', 'City'].map(item => (
                  <View key={item} style={styles.profilePreviewItem}>
                    <View style={styles.profilePreviewDot} />
                    <Text style={styles.profilePreviewItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.profileEditHint}>
              <CheckIcon size={14} color="#10B981" />
              <Text style={styles.profileEditHintText}>
                You can review and edit everything before saving.
              </Text>
            </View>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <AlertCircleIcon size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.manualEntryButton}
              onPress={() => {
                setErrorMessage('');
                setIsProfileFormVisible(true);
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Enter profile details manually"
            >
              <Text style={styles.manualEntryText}>
                Prefer typing? <Text style={styles.manualEntryLink}>Enter details manually</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bottomSection}>
            <View style={styles.reviewDetailsCard}>
              <CheckIcon size={17} color="#A78BFA" />
              <View style={styles.reviewDetailsTextWrap}>
                <Text style={styles.reviewDetailsTitle}>Review your details</Text>
                <Text style={styles.reviewDetailsSubtitle}>
                  Edit anything that needs a change, then save your profile.
                </Text>
              </View>
            </View>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <AlertCircleIcon size={16} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <View style={styles.inputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="Full Name"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="Company Name"
                placeholderTextColor="#64748B"
                value={companyName}
                onChangeText={setCompanyName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="Designation / Role"
                placeholderTextColor="#64748B"
                value={role}
                onChangeText={setRole}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="City"
                placeholderTextColor="#64748B"
                value={city}
                onChangeText={setCity}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            <View style={styles.actionBtnRow}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleReset}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <BrandGradientBackground
                  id="speech_screen_submit_btn_grad"
                  borderRadius={15}
                />
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <CheckIcon size={18} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Save & Continue</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* ========================================================================= */}
      {/* POPUP MODAL: VOICE CAPTURE & ANALYSING                                    */}
      {/* ========================================================================= */}
      <Modal
        visible={isVoiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseVoiceModal}
      >
        <View style={styles.voiceModalOverlay}>
          <View style={styles.voiceModalSheet}>
            {/* Close Button in Modal */}
            <TouchableOpacity
              style={styles.voiceModalCloseBtn}
              onPress={handleCloseVoiceModal}
              disabled={isVoiceAnalysing}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <XIcon size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* WAVEFORM + MIC HERO ANIMATION */}
            <View style={styles.voiceModalMicArea}>
              {/* Left Animated Waveform Bars */}
              {!isVoiceAnalysing && (
                <View style={styles.voiceModalWaveGroupLeft}>
                  {WAVE_BARS_LEFT.map((bar, idx) => (
                    <Animated.View
                      key={`vl-${idx}`}
                      style={[
                        styles.modalWaveBar,
                        {
                          height: bar.h,
                          opacity: bar.o,
                          transform: [
                            {
                              scaleY:
                                isListening && !liveVoice?.isPaused
                                  ? idx % 2 === 0
                                    ? waveAnim1
                                    : waveAnim2
                                  : 1,
                            },
                          ],
                        },
                      ]}
                    />
                  ))}
                </View>
              )}

              {/* Central Glowing Mic / Countdown / Spinner */}
              <View style={styles.voiceModalMicCenter}>
                <Animated.View
                  style={[
                    styles.voiceModalMicGlow,
                    {
                      opacity: glowAnim,
                      transform: [{ scale: pulseAnim }, { rotate: spin }],
                    },
                  ]}
                  pointerEvents="none"
                >
                  {/* Purple Ambient Halo (Idle / Waiting) */}
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.voiceModalGlowLayer,
                      { opacity: purpleGlowOpacity },
                    ]}
                  >
                    <Svg width={190} height={190} viewBox="0 0 190 190">
                      <Defs>
                        <RadialGradient
                          id="voiceModalGlowPurpleRegScreen"
                          cx="50%"
                          cy="50%"
                          rx="50%"
                          ry="50%"
                        >
                          <Stop
                            offset="0%"
                            stopColor="#7C3AED"
                            stopOpacity="0.75"
                          />
                          <Stop
                            offset="35%"
                            stopColor="#6D28D9"
                            stopOpacity="0.45"
                          />
                          <Stop
                            offset="65%"
                            stopColor="#4C1D95"
                            stopOpacity="0.22"
                          />
                          <Stop
                            offset="100%"
                            stopColor="#0B0C16"
                            stopOpacity="0"
                          />
                        </RadialGradient>
                      </Defs>
                      <Circle
                        cx="95"
                        cy="95"
                        r="92"
                        fill="url(#voiceModalGlowPurpleRegScreen)"
                      />
                      <Circle
                        cx="95"
                        cy="95"
                        r="48"
                        stroke="rgba(196, 181, 253, 0.45)"
                        strokeWidth="1.2"
                        fill="none"
                      />
                      <Circle
                        cx="95"
                        cy="95"
                        r="62"
                        stroke="rgba(167, 139, 250, 0.32)"
                        strokeWidth="1.2"
                        fill="none"
                      />
                      <Circle
                        cx="95"
                        cy="95"
                        r="76"
                        stroke="rgba(139, 92, 246, 0.22)"
                        strokeWidth="1.2"
                        fill="none"
                      />
                      <Circle
                        cx="95"
                        cy="95"
                        r="90"
                        stroke="rgba(124, 58, 237, 0.12)"
                        strokeWidth="1.2"
                        fill="none"
                      />
                    </Svg>
                  </Animated.View>

                  {/* Vibrant Orange Glow & Concentric Rings (Active Recording & Analysing) */}
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.voiceModalGlowLayer,
                      { opacity: orangeGlowAnim },
                    ]}
                  >
                    <Svg width={190} height={190} viewBox="0 0 190 190">
                      <Defs>
                        <RadialGradient
                          id="voiceModalGlowOrangeRegScreen"
                          cx="50%"
                          cy="50%"
                          rx="50%"
                          ry="50%"
                        >
                          <Stop
                            offset="0%"
                            stopColor="#F97316"
                            stopOpacity="0.85"
                          />
                          <Stop
                            offset="35%"
                            stopColor="#EA580C"
                            stopOpacity="0.5"
                          />
                          <Stop
                            offset="65%"
                            stopColor="#C2410C"
                            stopOpacity="0.25"
                          />
                          <Stop
                            offset="100%"
                            stopColor="#0B0C16"
                            stopOpacity="0"
                          />
                        </RadialGradient>
                      </Defs>
                      <Circle
                        cx="95"
                        cy="95"
                        r="92"
                        fill="url(#voiceModalGlowOrangeRegScreen)"
                      />
                      <Circle
                        cx="95"
                        cy="95"
                        r="48"
                        stroke="rgba(254, 215, 170, 0.55)"
                        strokeWidth="1.2"
                        fill="none"
                      />
                      <Circle
                        cx="95"
                        cy="95"
                        r="62"
                        stroke="rgba(251, 146, 60, 0.40)"
                        strokeWidth="1.2"
                        fill="none"
                      />
                      <Circle
                        cx="95"
                        cy="95"
                        r="76"
                        stroke="rgba(249, 115, 22, 0.28)"
                        strokeWidth="1.2"
                        fill="none"
                      />
                      <Circle
                        cx="95"
                        cy="95"
                        r="90"
                        stroke="rgba(234, 88, 12, 0.16)"
                        strokeWidth="1.2"
                        fill="none"
                      />
                    </Svg>
                  </Animated.View>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.voiceModalMicCircle,
                    isVoiceActivelyRecording &&
                      styles.voiceModalMicCircleActive,
                  ]}
                >
                  {isVoiceAnalysing ? (
                    <ActivityIndicator size="small" color="#F97316" />
                  ) : voiceCountdown !== null && voiceCountdown > 0 ? (
                    <Text style={styles.countdownNumberText}>
                      {voiceCountdown}
                    </Text>
                  ) : (
                    <MicIcon size={30} color="#FFFFFF" />
                  )}
                </Animated.View>
              </View>

              {/* Right Animated Waveform Bars */}
              {!isVoiceAnalysing && (
                <View style={styles.voiceModalWaveGroupRight}>
                  {WAVE_BARS_RIGHT.map((bar, idx) => (
                    <Animated.View
                      key={`vr-${idx}`}
                      style={[
                        styles.modalWaveBar,
                        {
                          height: bar.h,
                          opacity: bar.o,
                          transform: [
                            {
                              scaleY:
                                isListening && !liveVoice?.isPaused
                                  ? idx % 2 === 0
                                    ? waveAnim2
                                    : waveAnim1
                                  : 1,
                            },
                          ],
                        },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>

            {isVoiceAnalysing ? (
              /* STATE: ANALYSING YOUR CONVERSATION */
              <View style={styles.analysingContainer}>
                <View style={styles.analysingHeaderBlock}>
                  <Text style={styles.analysingHeading}>
                    Analysing Your Details
                  </Text>
                  <Text style={styles.analysingSubtitle}>
                    SalesBuster AI is extracting profile details from your
                    conversation...
                  </Text>
                </View>

                {/* 4 Processing Steps with Status Indicators */}
                <View style={styles.analysingStepsCard}>
                  {ANALYSING_STEPS.map((step, idx) => {
                    const stepNum = idx + 1;
                    const isDone = analysisStep > stepNum;
                    const isCurrent = analysisStep === stepNum;
                    return (
                      <View key={step.id} style={styles.analysingStepRow}>
                        <View
                          style={[
                            styles.stepIndicatorCircle,
                            isDone && styles.stepIndicatorCircleDone,
                            isCurrent && styles.stepIndicatorCircleCurrent,
                          ]}
                        >
                          {isDone ? (
                            <CheckIcon size={12} color="#10B981" />
                          ) : isCurrent ? (
                            <ActivityIndicator size="small" color="#F97316" />
                          ) : (
                            <View style={styles.stepDotPending} />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.stepLabelText,
                            isDone && styles.stepLabelTextDone,
                            isCurrent && styles.stepLabelTextCurrent,
                          ]}
                        >
                          {step.title}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Processing Progress Status Button */}
                <View style={styles.analysingProgressBtn}>
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                    style={styles.btnSpinner}
                  />
                  <Text style={styles.analysingProgressBtnText}>
                    {analysisStep >= 5
                      ? 'Populating Profile Details...'
                      : 'SalesBuster AI Processing...'}
                  </Text>
                </View>
              </View>
            ) : (
              /* STATE: LISTENING / PAUSED / COUNTDOWN */
              <>
                {/* Gemini AI Agent Connection Status */}
                <View style={styles.geminiBadge}>
                  <SparklesIcon
                    size={12}
                    color={liveVoice?.isConnected ? '#10B981' : '#A78BFA'}
                  />
                  <Text
                    style={[
                      styles.geminiBadgeText,
                      liveVoice?.isConnected && styles.geminiBadgeTextConnected,
                    ]}
                  >
                    {liveVoice?.isConnected
                      ? 'SalesBuster AI Agent Connected'
                      : 'Connecting to SalesBuster AI...'}
                  </Text>
                </View>

                {/* Status Dot & Live Duration Timer */}
                <View style={styles.voiceStatusRow}>
                  <View
                    style={[
                      styles.statusDotGreen,
                      voiceCountdown !== null && styles.statusDotCountdown,
                      liveVoice?.isPaused && styles.statusDotPaused,
                    ]}
                  />
                  <Text style={styles.voiceStatusText}>
                    {voiceCountdown !== null && voiceCountdown > 0
                      ? `Starting in ${voiceCountdown}s...`
                      : liveVoice?.isPaused
                      ? 'Paused...... '
                      : 'Listening...... '}
                    {voiceCountdown === null &&
                      formatVoiceTimer(voiceRecordingSeconds)}
                  </Text>
                </View>

                {/* Dual Buttons: Pause / Resume & Finish */}
                <View style={styles.voiceModalButtonsRow}>
                  <TouchableOpacity
                    style={styles.voicePauseBtn}
                    onPress={handleTogglePauseVoice}
                    activeOpacity={0.8}
                  >
                    {liveVoice?.isPaused ? (
                      <PlayIcon size={14} color="#FFFFFF" />
                    ) : (
                      <PauseIcon size={14} color="#FFFFFF" />
                    )}
                    <Text style={styles.voicePauseBtnText}>
                      {liveVoice?.isPaused ? 'Resume' : 'Pause'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.voiceFinishBtn}
                    onPress={handleFinishVoice}
                    activeOpacity={0.85}
                  >
                    <BrandGradientBackground
                      id="speech_screen_voice_finish_grad"
                      borderRadius={14}
                    />
                    <Text style={styles.voiceFinishBtnText}>Finish</Text>
                  </TouchableOpacity>
                </View>

                {/* REAL-TIME TRANSCRIPTION BOX */}
                <View style={styles.voiceTranscriptionBox}>
                  <Text style={styles.voiceTranscriptionText}>
                    {rawTranscript.trim().length > 0
                      ? rawTranscript
                      : 'Speak clearly into the microphone... (e.g. "I am Rahul Sharma, Founder of Nexa Corp, Mumbai")'}
                  </Text>
                </View>

                {/* Instructions / Cue Card */}
                <View style={styles.voiceInstructionsCard}>
                  <View style={styles.instructionsHeaderRow}>
                    <SparklesIcon size={14} color="#A78BFA" />
                    <Text style={styles.instructionsHeaderText}>
                      Details detected so far:
                    </Text>
                  </View>
                  <View style={styles.instructionsItemsContainer}>
                    <View style={styles.instructionsItemsRow}>
                      <View style={styles.checkItemWrap}>
                        <CheckIcon
                          size={12}
                          color={name ? '#10B981' : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.checkItemText,
                            name && styles.checkItemTextActive,
                          ]}
                        >
                          Name: {name || 'Not detected'}
                        </Text>
                      </View>
                      <View style={styles.checkItemWrap}>
                        <CheckIcon
                          size={12}
                          color={companyName ? '#10B981' : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.checkItemText,
                            companyName && styles.checkItemTextActive,
                          ]}
                        >
                          Company: {companyName || 'Not detected'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.instructionsItemsRow}>
                      <View style={styles.checkItemWrap}>
                        <CheckIcon
                          size={12}
                          color={role ? '#10B981' : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.checkItemText,
                            role && styles.checkItemTextActive,
                          ]}
                        >
                          Role: {role || 'Not detected'}
                        </Text>
                      </View>
                      <View style={styles.checkItemWrap}>
                        <CheckIcon
                          size={12}
                          color={city ? '#10B981' : '#64748B'}
                        />
                        <Text
                          style={[
                            styles.checkItemText,
                            city && styles.checkItemTextActive,
                          ]}
                        >
                          City: {city || 'Not detected'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  fixedProgressWrapper: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    backgroundColor: '#0A0D14',
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  startScreenScrollContent: {
    justifyContent: 'center',
  },
  topSection: {
    paddingTop: 0,
  },
  headerTextWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  brandMark: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 25,
    fontFamily: Fonts.family.bold,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13.5,
    fontFamily: Fonts.family.regular,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  profileStartSection: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    marginTop: 4,
  },
  profilePreviewCard: {
    marginTop: 14,
    padding: 14,
    backgroundColor: 'rgba(17, 24, 39, 0.82)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
  },
  profilePreviewHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePreviewTitle: {
    color: '#E2E8F0',
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
    marginLeft: 8,
  },
  profilePreviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  profilePreviewItem: {
    width: '48%',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    backgroundColor: 'rgba(148, 163, 184, 0.07)',
    borderRadius: 9,
  },
  profilePreviewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A78BFA',
    marginRight: 8,
  },
  profilePreviewItemText: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontFamily: Fonts.family.medium,
  },
  profileEditHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  profileEditHintText: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontFamily: Fonts.family.regular,
    marginLeft: 7,
    flexShrink: 1,
  },
  bottomSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  manualEntryButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
  },
  manualEntryText: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontFamily: Fonts.family.regular,
    textAlign: 'center',
  },
  manualEntryLink: {
    color: '#C4B5FD',
    fontFamily: Fonts.family.semiBold,
    textDecorationLine: 'underline',
  },
  reviewDetailsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 13,
    padding: 12,
    marginBottom: 14,
  },
  reviewDetailsTextWrap: {
    flex: 1,
    marginLeft: 9,
  },
  reviewDetailsTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
    marginBottom: 3,
  },
  reviewDetailsSubtitle: {
    color: '#94A3B8',
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: Fonts.family.regular,
  },

  // HERO VOICE TRIGGER CARD
  heroVoiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17172A',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.38)',
    borderRadius: 16,
    padding: 11,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 14,
  },
  heroVoicePulseHalo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroVoiceMicCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroVoiceTextWrap: {
    flex: 1,
    paddingRight: 6,
  },
  heroVoiceTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: Fonts.family.semiBold,
    marginBottom: 2,
  },
  heroVoiceSubtitle: {
    color: '#A78BFA',
    fontSize: 11.5,
    fontFamily: Fonts.family.regular,
    lineHeight: 16,
  },
  heroVoiceStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroVoiceStartBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: Fonts.family.semiBold,
    marginLeft: 4,
  },

  // FORM FIELDS
  inputCard: {
    backgroundColor: '#0D1422',
    borderRadius: 13,
    paddingHorizontal: 14,
    height: 54,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
    justifyContent: 'center',
  },
  textInput: {
    color: '#F8FAFC',
    fontSize: 14,
    fontFamily: Fonts.family.regular,
    padding: 0,
    margin: 0,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    marginBottom: 20,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#121327',
    borderWidth: 1,
    borderColor: '#382D67',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#A855F7',
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
  },
  submitButton: {
    flex: 2.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4013C7',
    borderRadius: 15,
    paddingVertical: 14,
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: '#4013C7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: Fonts.family.semiBold,
    marginLeft: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12.5,
    fontFamily: Fonts.family.medium,
    marginLeft: 8,
    flex: 1,
  },

  // =========================================================================
  // VOICE POPUP MODAL STYLES (MATCHING GuestHomeScreen)
  // =========================================================================
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 16, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  voiceModalSheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#111226',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#242749',
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  voiceModalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E203B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  voiceModalMicArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 130,
    width: '100%',
    marginTop: 10,
    marginBottom: 6,
    position: 'relative',
  },
  voiceModalWaveGroupLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  voiceModalWaveGroupRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  modalWaveBar: {
    width: 2.2,
    borderRadius: 1.2,
    backgroundColor: '#A78BFA',
    marginHorizontal: 1.8,
  },
  voiceModalMicCenter: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginHorizontal: 4,
    zIndex: 2,
  },
  voiceModalMicGlow: {
    position: 'absolute',
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  voiceModalGlowLayer: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceModalMicCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0F1026',
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 2,
  },
  voiceModalMicCircleActive: {
    borderColor: 'rgba(249, 115, 22, 0.65)',
    shadowColor: '#F97316',
    shadowOpacity: 0.8,
    shadowRadius: 22,
  },
  countdownNumberText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: Fonts.family.bold,
    textAlign: 'center',
    lineHeight: 36,
  },
  geminiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
    marginBottom: 4,
    alignSelf: 'center',
  },
  geminiBadgeText: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontFamily: Fonts.family.medium,
    marginLeft: 5,
  },
  geminiBadgeTextConnected: {
    color: '#10B981',
  },
  voiceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  statusDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusDotCountdown: {
    backgroundColor: '#A855F7',
  },
  statusDotPaused: {
    backgroundColor: '#F59E0B',
  },
  voiceStatusText: {
    color: '#10B981',
    fontSize: 13,
    fontFamily: Fonts.family.medium,
  },
  voiceModalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 14,
  },
  voicePauseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#191B33',
    borderWidth: 1,
    borderColor: '#2F335A',
    borderRadius: 14,
    paddingVertical: 12,
  },
  voicePauseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.medium,
    marginLeft: 6,
  },
  voiceFinishBtn: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4013C7',
    overflow: 'hidden',
    borderRadius: 14,
    paddingVertical: 12,
  },
  voiceFinishBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
  },
  voiceTranscriptionBox: {
    width: '100%',
    backgroundColor: 'rgba(21, 23, 46, 0.85)',
    borderWidth: 1,
    borderColor: '#2A2D55',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    minHeight: 48,
  },
  voiceTranscriptionText: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontFamily: Fonts.family.regular,
    lineHeight: 18,
    textAlign: 'center',
  },
  voiceInstructionsCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#373A68',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(16, 17, 36, 0.7)',
    padding: 12,
  },
  instructionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  instructionsHeaderText: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontFamily: Fonts.family.semiBold,
    marginLeft: 6,
  },
  instructionsItemsContainer: {
    gap: 6,
  },
  instructionsItemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  checkItemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkItemText: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: Fonts.family.regular,
    marginLeft: 4,
  },
  checkItemTextActive: {
    color: '#E2E8F0',
    fontFamily: Fonts.family.medium,
  },
  analysingContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
  analysingHeaderBlock: {
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  analysingHeading: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.family.bold,
    textAlign: 'center',
    marginBottom: 6,
  },
  analysingSubtitle: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontFamily: Fonts.family.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  analysingStepsCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 16, 38, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  analysingStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  stepIndicatorCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepIndicatorCircleDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  stepIndicatorCircleCurrent: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#F97316',
  },
  stepDotPending: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748B',
  },
  stepLabelText: {
    color: '#64748B',
    fontSize: 13,
    fontFamily: Fonts.family.medium,
    flex: 1,
  },
  stepLabelTextDone: {
    color: '#E2E8F0',
    fontFamily: Fonts.family.medium,
  },
  stepLabelTextCurrent: {
    color: '#F97316',
    fontFamily: Fonts.family.semiBold,
  },
  analysingProgressBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EA580C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  analysingProgressBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
  },
  btnSpinner: {
    marginRight: 8,
  },
});
