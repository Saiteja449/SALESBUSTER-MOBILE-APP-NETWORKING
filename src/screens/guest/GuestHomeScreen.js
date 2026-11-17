import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
  Animated,
  Easing,
  Linking,
  KeyboardAvoidingView,
  PermissionsAndroid,
  AppState,
  Image,
  NativeModules,
  ToastAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Circle,
  Rect,
  Path,
  Line,
} from 'react-native-svg';
import Text from '../../components/common/AppText';
import TextInput from '../../components/common/AppTextInput';
import KeyboardAwareScrollView from '../../components/common/KeyboardAwareScrollView';
import { Fonts } from '../../styles/Fonts';
import {
  GridProductsIcon,
  LocationPinIcon,
  UserIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MicIcon,
  CheckIcon,
  XIcon,
  PhoneIcon,
  WhatsAppIcon,
  WhatsAppBadgeIcon,
  LogoutIcon,
  SparklesIcon,
  PaperclipIcon,
  PhotoIcon,
  CameraIcon,
  RefreshIcon,
  PauseIcon,
  PlayIcon,
  AlertCircleIcon,
  StarIcon,
  EditIcon,
} from '../../icons/Icons';
import { useAuth } from '../../context/AuthContext';
import { eventService } from '../../services/api/eventService';
import { useGeminiLiveVoice } from '../../hooks/useGeminiLiveVoice';
import {
  parseRealtimeTranscript,
  normalizeExtractedContact,
  mergeContactData,
  redactPhone,
  polishFieldSpellings,
  isLikelyCompanyName,
  isStrictPersonNameCandidate,
} from '../../utils/voiceEntityExtractor';
import { OrgOwnerTabBar } from '../../components/common/OrgOwnerTabBar';
import { useGuestAlert } from '../../components/guest/GuestAlert';
import GuestTourModal from '../../components/guest/GuestTourModal';
import GuestActionableGuidance from '../../components/guest/GuestActionableGuidance';
import { getFriendlyErrorMessage } from '../../utils/formatters';
import { getFullMediaUrl } from '../../utils/constants';

const LAST_EVENT_STORAGE_KEY = 'salesbuster_last_selected_event_id';
const CAPTURE_GUIDE_SEEN_KEY = '@guest_capture_guide_seen';
const { GeminiVoiceAudioModule } = NativeModules;

const PRODUCTS_CATALOG = [
  {
    id: 'bi_analyst',
    title: 'BI Analyst',
    tag: 'Analytics',
    imageUrl:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80',
    fallbackBg: '#1A1838',
    description:
      'A dedicated BI Analyst that turns your raw numbers into clear, actionable insight — dashboards, KPIs and reports your whole team can trust.',
    features: [
      'Live dashboards & KPI tracking',
      'Automated daily / weekly reports',
      'Sales funnel & revenue insights',
    ],
  },
  {
    id: 'target_audience',
    title: 'Target Audience',
    tag: 'Growth',
    imageUrl:
      'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=400&q=80',
    fallbackBg: '#2A1828',
    description:
      'Identify, segment and engage your high-value audience segments with precision-engineered data analytics and customer persona intelligence.',
    features: [
      'High-intent buyer segmentation',
      'Persona-based audience discovery',
      'Multi-channel conversion optimization',
    ],
  },
  {
    id: 'whatsapp_chat_automation',
    title: 'WhatsApp Chat Automation',
    tag: 'Cloude API',
    imageUrl:
      'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=400&q=80',
    fallbackBg: '#132822',
    description:
      'Supercharge customer communication with intelligent WhatsApp chatbots that qualify leads, answer FAQs, and book meetings 24/7.',
    features: [
      'Instant automated inquiry replies',
      'Lead qualification & routing',
      'Official Meta Cloud API integration',
    ],
  },
  {
    id: 'whatsapp_campaigns',
    title: 'WhatsApp Campaigns',
    tag: 'Marketing',
    imageUrl:
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&q=80',
    fallbackBg: '#162338',
    description:
      'Launch high-conversion broadcast campaigns, promotional announcements, and event reminders with enterprise-grade deliverability.',
    features: [
      'Targeted broadcast messaging',
      'Automated opt-in & click tracking',
      'Rich media & interactive CTAs',
    ],
  },
  {
    id: 'followup_automation',
    title: '24/7 Follow-up Automation',
    tag: 'Automation',
    imageUrl:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
    fallbackBg: '#181C38',
    description:
      'Never drop another hot lead. Instantly follow up across WhatsApp, SMS, and email the moment a prospect shows interest.',
    features: [
      'Multi-touch smart follow-up sequences',
      'AI response trigger detection',
      'Automated pipeline status updates',
    ],
  },
  {
    id: 'call_recording',
    title: 'Call Recording & Call Log',
    tag: 'Sales OPS',
    imageUrl:
      'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=400&q=80',
    fallbackBg: '#1F1A30',
    description:
      'Automatically record and transcribe client calls, analyze sales performance, and keep your CRM updated with zero manual work.',
    features: [
      'Background call recording & sync',
      'AI transcription & sentiment analysis',
      'Automatic CRM activity logging',
    ],
  },
];

// Exact acoustic waveform harmonics matching reference design (Image 2)
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
  { id: 2, title: 'Extracting contact information' },
  { id: 3, title: 'Identifying name, company and designation' },
  { id: 4, title: 'Fetching and populating contact details' },
];

// Exact Capture & Top Bar Icons matching Figma/Design specs

export const ExactCaptureCameraIcon = ({ size = 40, bg = '#0B0A1F' }) => {
  const width = size;
  const height = size * 0.75;

  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 40 30"
      fill="none"
      style={{ marginTop: 5 }}
    >
      <Defs>
        <LinearGradient id="exactCamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#5013C7" />
          <Stop offset="100%" stopColor="#9C40FA" />
        </LinearGradient>
      </Defs>

      {/* Camera body and top lens housing */}
      <Path
        d="
          M12 0
          H20
          C22.5 0 23.5 1.5 25 3
          C26.5 4.5 28 5 30 5
          H34
          C37.3 5 40 7.7 40 11
          V26
          C40 28.2 38.2 30 36 30
          H4
          C1.8 30 0 28.2 0 26
          V11
          C0 7.7 2.7 5 6 5
          H9
          C10.5 5 11 3.5 12 0
          Z
        "
        fill="url(#exactCamGrad)"
      />

      {/* Camera sensor */}
      <Circle cx="6.5" cy="9" r="1.2" fill={bg} />

      {/* Outer lens ring */}
      <Circle cx="20" cy="15" r="8" fill={bg} />

      {/* Inner lens */}
      <Circle cx="20" cy="15" r="6.1" fill="url(#exactCamGrad)" />
    </Svg>
  );
};

export const ExactCaptureVoiceIcon = ({ size = 40 }) => (
  <Svg width={size} height={size} viewBox="0 0 44 44" fill="none">
    <Defs>
      <LinearGradient id="exactVoiceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%" stopColor="#6D28D9" />
        <Stop offset="100%" stopColor="#A855F7" />
      </LinearGradient>
    </Defs>

    {/* Microphone capsule */}
    <Rect
      x="14"
      y="0"
      width="16"
      height="26"
      rx="8"
      fill="url(#exactVoiceGrad)"
    />

    {/* Microphone cradle */}
    <Path
      d="M8 18c0 7.7 6.3 14 14 14s14-6.3 14-14"
      stroke="url(#exactVoiceGrad)"
      strokeWidth="3.4"
      strokeLinecap="round"
      fill="none"
    />

    {/* Vertical stem */}
    <Line
      x1="22"
      y1="32"
      x2="22"
      y2="41"
      stroke="url(#exactVoiceGrad)"
      strokeWidth="3.4"
      strokeLinecap="round"
    />

    {/* Horizontal base */}
    <Line
      x1="12"
      y1="41"
      x2="32"
      y2="41"
      stroke="url(#exactVoiceGrad)"
      strokeWidth="3.4"
      strokeLinecap="round"
    />
  </Svg>
);

const ExactInfoIcon = ({ size = 16, color = '#0B0A1F' }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Circle cx="11.2" cy="4.2" r="1.6" fill={color} />
    <Path
      d="M8.8 8h3l-2.2 8h2.8"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const GuestHomeScreen = ({ navigation, isEmbedded = false }) => {
  const { showGuestAlert, guestAlertModal } = useGuestAlert();
  const { token: ctxToken, user, logout } = useAuth();
  const token = user?.token || ctxToken;

  const isGuest =
    user?.accountType === 'guest' ||
    user?.organization?.accountType === 'guest';
  const isOrgOwner =
    !isGuest && Boolean(user?.isOrgOwner || user?.organization?.isOrgOwner);

  // Active Event state
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [summary, setSummary] = useState('');
  const [messageText, setMessageText] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [isAnalyzingVoiceAudio, setIsAnalyzingVoiceAudio] = useState(false);
  const [isVoiceAnalysing, setIsVoiceAnalysing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(1);
  const audioCaptureInfoRef = useRef(null);
  const keepAudioForAnalysisRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTourModalVisible, setIsTourModalVisible] = useState(false);
  const [isActionableGuideVisible, setIsActionableGuideVisible] = useState(false);
  const scrollViewRef = useRef(null);
  const guidanceEventRef = useRef(null);
  const guidanceVoiceRef = useRef(null);
  const guidanceCameraRef = useRef(null);
  const guidanceFormRef = useRef(null);
  const guidanceSaveRef = useRef(null);
  const guidanceContactsRef = useRef(null);
  const guidanceProductsRef = useRef(null);
  const [guidanceTargets, setGuidanceTargets] = useState({});

  const measureGuidanceTargets = useCallback(() => {
    const measurements = {};
    const measureRef = (ref, key) => {
      if (ref?.current?.measureInWindow) {
        ref.current.measureInWindow((x, y, width, height) => {
          if (width > 0 && height > 0) {
            measurements[key] = { x, y, width, height };
          }
        });
      }
    };

    measureRef(guidanceEventRef, 'events');
    measureRef(guidanceVoiceRef, 'audio');
    measureRef(guidanceCameraRef, 'image');
    measureRef(guidanceFormRef, 'form');
    measureRef(guidanceSaveRef, 'save');
    measureRef(guidanceContactsRef, 'contacts');
    measureRef(guidanceProductsRef, 'products');

    setTimeout(() => {
      setGuidanceTargets(prev => ({ ...prev, ...measurements }));
    }, 60);
  }, []);

  const handleGuidanceStepChange = useCallback((stepIndex, stepKey) => {
    if (stepKey === 'form') {
      if (scrollViewRef.current?.scrollToPosition) {
        scrollViewRef.current.scrollToPosition(0, 240, true);
      } else if (scrollViewRef.current?.scrollTo) {
        scrollViewRef.current.scrollTo({ y: 240, animated: true });
      }
    } else if (stepKey === 'save') {
      if (scrollViewRef.current?.scrollToEnd) {
        scrollViewRef.current.scrollToEnd(true);
      } else if (scrollViewRef.current?.scrollTo) {
        scrollViewRef.current.scrollTo({ y: 600, animated: true });
      }
    } else {
      if (scrollViewRef.current?.scrollToPosition) {
        scrollViewRef.current.scrollToPosition(0, 0, true);
      } else if (scrollViewRef.current?.scrollTo) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    }

    setTimeout(() => {
      measureGuidanceTargets();
    }, 320);
  }, [measureGuidanceTargets]);

  const handleTourComplete = useCallback(() => {
    setIsTourModalVisible(false);
  }, []);

  useEffect(() => {
    if (!isGuest) return;
    let isMounted = true;
    const guideKey = `${CAPTURE_GUIDE_SEEN_KEY}:${
      user?.id || user?._id || user?.email || 'guest'
    }`;
    AsyncStorage.getItem(guideKey)
      .then(seen => {
        if (isMounted && seen !== 'true') {
          setTimeout(() => {
            if (isMounted) {
              measureGuidanceTargets();
              setIsActionableGuideVisible(true);
            }
          }, 400);
          AsyncStorage.setItem(guideKey, 'true').catch(() => {});
        }
      })
      .catch(() => {
        if (isMounted) {
          setTimeout(() => {
            if (isMounted) {
              measureGuidanceTargets();
              setIsActionableGuideVisible(true);
            }
          }, 400);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [isGuest, measureGuidanceTargets, user?.id, user?._id, user?.email]);

  // WhatsApp Confirmation Modal State
  const [isWhatsAppConfirmVisible, setIsWhatsAppConfirmVisible] =
    useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [pendingLeadData, setPendingLeadData] = useState(null);
  const [submittingStatus, setSubmittingStatus] = useState('');
  const appStateSubscriptionRef = useRef(null);

  // Field detection flags for visual AI highlights
  const [aiDetectedFields, setAiDetectedFields] = useState({
    name: false,
    company: false,
    designation: false,
    phone: false,
    summary: false,
  });

  // Track latest field values & tool-set source of truth to prevent stale closures and overwrites
  const fieldsRef = useRef({
    name,
    phone,
    companyName,
    designation,
    summary,
    aiDetectedFields,
    isToolSet: {
      name: false,
      phone: false,
      company: false,
      designation: false,
    },
  });

  // Single source of truth metadata for contact fields: { value, source, confidence, isManuallyEdited }
  const contactDetailsRef = useRef({
    name: {
      value: '',
      source: 'empty',
      confidence: 0,
      isManuallyEdited: false,
    },
    phone: {
      value: '',
      source: 'empty',
      confidence: 0,
      isManuallyEdited: false,
    },
    companyName: {
      value: '',
      source: 'empty',
      confidence: 0,
      isManuallyEdited: false,
    },
    designation: {
      value: '',
      source: 'empty',
      confidence: 0,
      isManuallyEdited: false,
    },
    summary: {
      value: '',
      source: 'empty',
      confidence: 0,
      isManuallyEdited: false,
    },
  });

  const [manualReviewNotice, setManualReviewNotice] = useState(false);
  const reviewedSessionsRef = useRef(new Set());

  // Centralized single-source-of-truth contact field updater
  const updateContactField = useCallback(
    (field, value, source = 'ai_interim', confidence = 0.9) => {
      const currentMeta = contactDetailsRef.current[field] || {
        value: '',
        source: 'empty',
        confidence: 0,
        isManuallyEdited: false,
      };

      const isManual = source === 'manual';
      const isReset = source === 'reset';
      const isPolish = source === 'polish';

      if (currentMeta.isManuallyEdited && !isManual && !isReset && !isPolish) {
        console.log(
          `[CONTACT_CAPTURE] Field update ignored (${field} is protected by manual edit)`,
        );
        return false;
      }

      const oldValue = currentMeta.value || '';
      const cleanValue =
        typeof value === 'string' ? value.trim() : value ? String(value) : '';

      if (field === 'name' && !isManual && !isReset) {
        if (!isStrictPersonNameCandidate(cleanValue)) {
          console.log(
            '[CONTACT_CAPTURE] Rejected ambiguous or non-person name:',
            cleanValue,
          );
          return false;
        }
        if (isPolish) {
          const approvedSpelling = oldValue
            ? polishFieldSpellings({ name: oldValue }).name
            : '';
          if (
            !approvedSpelling ||
            approvedSpelling.toLowerCase() !== cleanValue.toLowerCase()
          ) {
            console.log(
              '[CONTACT_CAPTURE] Rejected name polish without an existing confirmed name',
            );
            return false;
          }
        }
      }

      if (!cleanValue && oldValue && !isManual && !isReset && !isPolish) {
        // Do not clear valid value with empty AI value
        return false;
      }

      // Keep the visible name responsive while the speaker is still talking. A
      // finalized value can be corrected by a later live chunk; manual edits are
      // still protected above.
      if (
        field !== 'name' &&
        currentMeta.value &&
        currentMeta.source === 'ai_final' &&
        source === 'ai_interim' &&
        (currentMeta.confidence || 0) > confidence
      ) {
        console.log(
          `[CONTACT_CAPTURE] Field update ignored (current ai_final has higher confidence than interim)`,
        );
        return false;
      }

      // STRICT COMPANY SHIELD: Block corporate brands, legal forms, and company names from entering person name field
      if (field === 'name' && !isManual && !isReset) {
        const currentCompany = (
          contactDetailsRef.current.companyName?.value ||
          fieldsRef.current.companyName ||
          ''
        )
          .trim()
          .toLowerCase();
        const valLower = cleanValue.toLowerCase();
        if (
          isLikelyCompanyName(cleanValue) ||
          (currentCompany &&
            (valLower === currentCompany ||
              currentCompany.includes(valLower) ||
              valLower.includes(currentCompany)))
        ) {
          console.warn(
            `[CONTACT_CAPTURE] BLOCKED company name "${cleanValue}" from entering Name field.`,
          );
          if (
            !contactDetailsRef.current.companyName?.value &&
            !fieldsRef.current.companyName
          ) {
            updateContactField('companyName', cleanValue, source, confidence);
          }
          return false;
        }
      }

      // Auto-clean name field if it was previously misassigned with this company name
      if (field === 'companyName' && cleanValue && !isReset) {
        const currentName = (
          contactDetailsRef.current.name?.value ||
          fieldsRef.current.name ||
          ''
        ).trim();
        const compLower = cleanValue.toLowerCase();
        if (
          currentName &&
          !contactDetailsRef.current.name?.isManuallyEdited &&
          (currentName.toLowerCase() === compLower ||
            compLower.includes(currentName.toLowerCase()) ||
            currentName.toLowerCase().includes(compLower) ||
            isLikelyCompanyName(currentName))
        ) {
          console.warn(
            `[CONTACT_CAPTURE] Purging misassigned company "${currentName}" from Name field.`,
          );
          setName('');
          fieldsRef.current.name = '';
          contactDetailsRef.current.name = {
            value: '',
            source: 'empty',
            confidence: 0,
            isManuallyEdited: false,
          };
          setAiDetectedFields(prev => ({ ...prev, name: false }));
          fieldsRef.current.aiDetectedFields.name = false;
        }
      }

      const newMeta = {
        value: cleanValue,
        source: isReset
          ? 'empty'
          : isManual
          ? 'manual'
          : isPolish
          ? 'polish'
          : source,
        confidence: isReset ? 0 : isManual ? 1.0 : isPolish ? 0.98 : confidence,
        isManuallyEdited: isManual
          ? true
          : isReset
          ? false
          : isPolish
          ? Boolean(currentMeta.isManuallyEdited)
          : false,
      };

      contactDetailsRef.current[field] = newMeta;

      console.log('[CONTACT_CAPTURE] Field update:', {
        field,
        oldValue: field === 'phone' ? redactPhone(oldValue) : oldValue,
        newValue: field === 'phone' ? redactPhone(cleanValue) : cleanValue,
        source: newMeta.source,
        confidence: newMeta.confidence,
      });

      const hasValue = Boolean(cleanValue);
      const isAiDetected = !isManual && !isReset && hasValue;

      if (field === 'name') {
        setName(cleanValue);
        setAiDetectedFields(prev => ({ ...prev, name: isAiDetected }));
        fieldsRef.current.name = cleanValue;
        fieldsRef.current.aiDetectedFields.name = isAiDetected;
      } else if (field === 'phone') {
        setPhone(cleanValue);
        setAiDetectedFields(prev => ({ ...prev, phone: isAiDetected }));
        fieldsRef.current.phone = cleanValue;
        fieldsRef.current.aiDetectedFields.phone = isAiDetected;
      } else if (field === 'companyName') {
        setCompanyName(cleanValue);
        setAiDetectedFields(prev => ({ ...prev, company: isAiDetected }));
        fieldsRef.current.companyName = cleanValue;
        fieldsRef.current.aiDetectedFields.company = isAiDetected;
      } else if (field === 'designation') {
        setDesignation(cleanValue);
        setAiDetectedFields(prev => ({ ...prev, designation: isAiDetected }));
        fieldsRef.current.designation = cleanValue;
        fieldsRef.current.aiDetectedFields.designation = isAiDetected;
      } else if (field === 'summary') {
        setSummary(cleanValue);
        setAiDetectedFields(prev => ({ ...prev, summary: isAiDetected }));
        fieldsRef.current.summary = cleanValue;
        fieldsRef.current.aiDetectedFields.summary = isAiDetected;
      }

      return true;
    },
    [],
  );

  useEffect(() => {
    fieldsRef.current = {
      name,
      phone,
      companyName,
      designation,
      summary,
      aiDetectedFields,
      isToolSet: fieldsRef.current.isToolSet,
    };
  }, [name, phone, companyName, designation, summary, aiDetectedFields]);

  // Voice capture state (continuous non-triggering active listener)
  const [isListening, setIsListening] = useState(false);
  const [isVoiceModalVisible, setIsVoiceModalVisible] = useState(false);
  const [voiceRecordingSeconds, setVoiceRecordingSeconds] = useState(0);
  const [voiceCountdown, setVoiceCountdown] = useState(null);
  const voiceTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // Selfie capture state
  const [selfiePhoto, setSelfiePhoto] = useState(null);

  // Unsaved details flag for the warning indicator
  const hasUnsavedDetails = Boolean(
    (name && name.trim().length > 0) ||
      (companyName && companyName.trim().length > 0) ||
      (designation && designation.trim().length > 0) ||
      (phone && phone.trim().length > 0) ||
      (summary && summary.trim().length > 0) ||
      selfiePhoto ||
      (fieldsRef.current?.name && fieldsRef.current.name.trim().length > 0) ||
      (fieldsRef.current?.phone && fieldsRef.current.phone.trim().length > 0) ||
      (fieldsRef.current?.companyName &&
        fieldsRef.current.companyName.trim().length > 0) ||
      (fieldsRef.current?.designation &&
        fieldsRef.current.designation.trim().length > 0) ||
      (fieldsRef.current?.summary &&
        fieldsRef.current.summary.trim().length > 0) ||
      (contactDetailsRef.current?.name?.value &&
        contactDetailsRef.current.name.value.trim().length > 0) ||
      (contactDetailsRef.current?.phone?.value &&
        contactDetailsRef.current.phone.value.trim().length > 0) ||
      (contactDetailsRef.current?.companyName?.value &&
        contactDetailsRef.current.companyName.value.trim().length > 0) ||
      (contactDetailsRef.current?.designation?.value &&
        contactDetailsRef.current.designation.value.trim().length > 0) ||
      (contactDetailsRef.current?.summary?.value &&
        contactDetailsRef.current.summary.value.trim().length > 0),
  );

  // Red line text warning state: only shown when user taps mic or camera after filling details
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  useEffect(() => {
    if (!hasUnsavedDetails) {
      setShowUnsavedWarning(false);
    }
  }, [hasUnsavedDetails]);

  // Visiting card visual capture state (Gemini 3.5 Flash Lite)
  const [isScanningCard, setIsScanningCard] = useState(false);

  // Modals
  const [isEventPickerVisible, setIsEventPickerVisible] = useState(false);
  const [isNewEventModalVisible, setIsNewEventModalVisible] = useState(false);
  const [isNoEventModalVisible, setIsNoEventModalVisible] = useState(false);
  const [isProductsModalVisible, setIsProductsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductDetailVisible, setIsProductDetailVisible] = useState(false);
  const [isAccountModalVisible, setIsAccountModalVisible] = useState(false);

  // New Event Form State
  const [newEventName, setNewEventName] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.85)).current;
  const waveAnim1 = useRef(new Animated.Value(1)).current;
  const waveAnim2 = useRef(new Animated.Value(1)).current;
  const orangeGlowAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // 1. Load initial events & restore last selected event
  useEffect(() => {
    loadEvents();
    return () => {
      if (appStateSubscriptionRef.current) {
        appStateSubscriptionRef.current.remove();
        appStateSubscriptionRef.current = null;
      }
    };
  }, [token]);

  const loadEvents = async () => {
    if (!token) return;
    try {
      const res = await eventService.getEvents(token);
      if (res.success && Array.isArray(res.data)) {
        setEvents(res.data);
        if (res.data.length > 0) {
          const lastSavedId = await AsyncStorage.getItem(
            LAST_EVENT_STORAGE_KEY,
          );
          const found = res.data.find(e => e._id === lastSavedId);
          setSelectedEvent(found || res.data[0]);
          setIsNoEventModalVisible(false);
        } else {
          setSelectedEvent(null);
          setIsNoEventModalVisible(false);
        }
      }
    } catch (err) {
      console.warn('[GuestHome] Failed to load events:', err);
      if (events.length === 0) {
        setSelectedEvent(null);
        setIsNoEventModalVisible(false);
      }
    } finally {
    }
  };

  const handleSelectEvent = evt => {
    setSelectedEvent(evt);
    setIsEventPickerVisible(false);
    if (evt?._id && evt._id !== 'default') {
      AsyncStorage.setItem(LAST_EVENT_STORAGE_KEY, evt._id).catch(() => {});
    }
  };

  const handleEditEvent = evt => {
    const targetEvent = evt || selectedEvent;
    if (!targetEvent || targetEvent._id === 'default') {
      if (events.length === 0) {
        setIsNoEventModalVisible(true);
      } else {
        setIsEventPickerVisible(true);
      }
      return;
    }
    navigation?.navigate('NewEvent', {
      isEdit: true,
      event: targetEvent,
      onEventUpdated: updated => {
        setEvents(prev =>
          prev.map(e => (e._id === updated._id ? { ...e, ...updated } : e)),
        );
        setSelectedEvent(prev =>
          prev?._id === updated._id ? { ...prev, ...updated } : prev,
        );
      },
    });
  };

  const handleSelectProduct = prod => {
    setSelectedProduct(prod);
    setIsProductDetailVisible(true);
  };

  const handleBookDemo = () => {
    const calendlyUrl =
      'https://calendly.com/team-salesbuster/30min?month=2026-11';
    setIsProductDetailVisible(false);

    Linking.openURL(calendlyUrl).catch(err => {
      console.warn('Error opening Calendly demo link:', err);
      showGuestAlert(
        'Open Link Failed',
        'Could not open browser. Please visit https://calendly.com/team-salesbuster/30min?month=2026-11 to schedule your demo.',
      );
    });
  };

  // 2. Real-time Gemini 3.8 Live Speech Transcription Callback
  const handleUserTranscript = useCallback(chunkText => {
    console.log(`[CONTACT_CAPTURE] Raw transcript chunk received:`, chunkText);
  }, []);

  // 3. Real-time Gemini Live Voice Callbacks (Interim & Final Extraction)
  const handleContactInterim = useCallback(
    data => {
      if (!data) return;
      console.log(
        '[CONTACT_CAPTURE] Gemini interim extraction received:',
        data,
      );
      if (data.rawTranscript) setRawTranscript(data.rawTranscript);

      const normalized = normalizeExtractedContact(data, {
        user,
        organization: { name: user?.organizationName || 'SalesBuster' },
      });
      console.log(
        '[CONTACT_CAPTURE] Normalized interim extraction:',
        normalized,
      );

      const fields = ['name', 'phone', 'companyName', 'designation', 'summary'];
      for (const f of fields) {
        if (normalized[f]?.value) {
          updateContactField(
            f,
            normalized[f].value,
            'ai_interim',
            normalized[f].confidence,
          );
        }
      }

      if (data.messageText) {
        setMessageText(data.messageText.trim());
      }
    },
    [user, updateContactField],
  );

  const handleContactTriggered = useCallback(
    data => {
      if (!data) return;
      console.log('[CONTACT_CAPTURE] Gemini contact triggered received:', data);
      if (data.rawTranscript) setRawTranscript(data.rawTranscript);

      const normalized = normalizeExtractedContact(data, {
        user,
        organization: { name: user?.organizationName || 'SalesBuster' },
      });
      console.log(
        '[CONTACT_CAPTURE] Normalized contact triggered:',
        normalized,
      );

      const fields = ['name', 'phone', 'companyName', 'designation', 'summary'];
      for (const f of fields) {
        if (normalized[f]?.value) {
          updateContactField(
            f,
            normalized[f].value,
            'ai_interim',
            normalized[f].confidence,
          );
          fieldsRef.current.isToolSet[
            f === 'companyName' ? 'company' : f
          ] = true;
        }
      }

      if (data.messageText) {
        setMessageText(data.messageText.trim());
      }
    },
    [user, updateContactField],
  );

  // Dedicated completion handler when backend finishes single-person finalization
  const handleConversationCompleted = useCallback(
    data => {
      console.log(
        '[CONTACT_CAPTURE] Gemini extraction (conversation completed):',
        data,
      );
      const sId = data?.sessionId;
      if (sId && reviewedSessionsRef.current.has(sId)) {
        return;
      }
      if (sId) reviewedSessionsRef.current.add(sId);

      // 1. Normalize final extraction payload
      const normalized = normalizeExtractedContact(data, {
        user,
        organization: { name: user?.organizationName || 'SalesBuster' },
      });
      console.log('[CONTACT_CAPTURE] Normalized final extraction:', normalized);

      // 2. Synchronous merge with current contact state (preserves manual edits)
      const finalContact = mergeContactData(
        contactDetailsRef.current,
        normalized,
        {
          source: 'ai_final',
          context: {
            user,
            organization: { name: user?.organizationName || 'SalesBuster' },
          },
        },
      );

      console.log('[CONTACT_CAPTURE] Final merged contact:', {
        name: finalContact.name?.value,
        phone: finalContact.phone?.value
          ? redactPhone(finalContact.phone.value)
          : '',
        companyName: finalContact.companyName?.value,
        designation: finalContact.designation?.value,
        summary: finalContact.summary?.value
          ? `${finalContact.summary.value.slice(0, 60)}...`
          : '',
      });

      // 3. Update component state and single source of truth ref
      const fields = ['name', 'phone', 'companyName', 'designation', 'summary'];
      for (const f of fields) {
        if (finalContact[f]?.value) {
          updateContactField(
            f,
            finalContact[f].value,
            finalContact[f].source || 'ai_final',
            finalContact[f].confidence || 0.95,
          );
        }
      }

      const rawTrans =
        data?.rawTranscript ||
        rawTranscript ||
        liveVoiceRef.current?.liveTranscript ||
        '';
      if (rawTrans) setRawTranscript(rawTrans);
      if (data?.messageText) setMessageText(data.messageText.trim());

      const finalName = (finalContact.name?.value || '').trim();
      const finalPhone = (finalContact.phone?.value || '')
        .replace(/\D/g, '')
        .slice(-10);
      const isValidPhone =
        finalPhone.length === 10 && /^[6-9]\d{9}$/.test(finalPhone);

      // Section 8: Name and valid phone are minimum requirements to save; company and designation are optional
      const isComplete = Boolean(finalName.length >= 2 && isValidPhone);

      if (isComplete && !data?.requiresManualReview) {
        setManualReviewNotice(false);
      } else {
        console.log(
          '[CONTACT_CAPTURE] Incomplete or requires manual review; populated form without auto-triggering modal',
          {
            hasName: Boolean(finalName.length >= 2),
            isValidPhone,
            requiresManualReview: Boolean(data?.requiresManualReview),
          },
        );
        setManualReviewNotice(true);
      }
    },
    [
      user,
      updateContactField,
      handleInitiateSaveAndSend,
      rawTranscript,
      messageText,
    ],
  );

  // Initialize Gemini Live Voice Assistant Hook (Silent Background Listener)
  const liveVoice = useGeminiLiveVoice({
    token,
    user,
    silentMode: true,
    isEventCapture: true,
    onUserTranscript: handleUserTranscript,
    onContactInterim: handleContactInterim,
    onContactTriggered: handleContactTriggered,
    onConversationCompleted: handleConversationCompleted,
    captureAudioFile: true,
    onSessionEnd: ({ audioCaptureInfo }) => {
      if (keepAudioForAnalysisRef.current)
        audioCaptureInfoRef.current = audioCaptureInfo;
      else if (audioCaptureInfo?.filePath)
        GeminiVoiceAudioModule?.deleteCapturedAudioFile?.(
          audioCaptureInfo.filePath,
        ).catch(() => {});
    },
  });

  const liveVoiceRef = useRef(liveVoice);
  liveVoiceRef.current = liveVoice;

  // Dynamic recording state: active listening or analysing turns microphone glow from purple to vibrant orange
  const isVoiceActivelyRecording = Boolean(
    (isListening && !liveVoice?.isPaused && voiceCountdown === null) ||
      isVoiceAnalysing,
  );
  const isOrangeGlowActive = isVoiceActivelyRecording;

  useEffect(() => {
    Animated.timing(orangeGlowAnim, {
      toValue: isOrangeGlowActive ? 1 : 0,
      duration: 350,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isOrangeGlowActive]);

  const purpleGlowOpacity = orangeGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  // Smooth rotation for analyzing spinner ring
  useEffect(() => {
    let animLoop = null;
    if (isVoiceAnalysing) {
      rotateAnim.setValue(0);
      animLoop = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      animLoop.start();
    } else {
      rotateAnim.setValue(0);
    }
    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [isVoiceAnalysing]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Sync display transcript for UI preview
  useEffect(() => {
    if (liveVoice.displayTranscript) {
      setRawTranscript(liveVoice.displayTranscript);
    }
  }, [liveVoice.displayTranscript]);

  // Real-time entity extraction from live speech transcript acts as FALLBACK ONLY
  // Progressively extracts Name, Phone, Company, Designation, and Summary in real-time as speech is transcribed,
  // without overwriting structured Gemini tool extractions or manually edited fields.
  useEffect(() => {
    const textToParse = (
      liveVoice.displayTranscript ||
      liveVoice.committedTranscript ||
      ''
    ).trim();
    if (!textToParse) return;

    console.log('[CONTACT_CAPTURE] Raw transcript:', textToParse);

    const currentMeta = contactDetailsRef.current;
    const currentFields = {
      name: currentMeta.name.value,
      phone: currentMeta.phone.value,
      companyName: currentMeta.companyName.value,
      designation: currentMeta.designation.value,
      summary: currentMeta.summary.value,
      isNameAiDetected: currentMeta.name.source === 'regex_fallback',
      isPhoneAiDetected: currentMeta.phone.source === 'regex_fallback',
      isCompanyAiDetected: currentMeta.companyName.source === 'regex_fallback',
      isDesignationAiDetected:
        currentMeta.designation.source === 'regex_fallback',
      isSummaryAiDetected: currentMeta.summary.source === 'regex_fallback',
    };

    const updates = parseRealtimeTranscript(textToParse, {
      user,
      organization: { name: user?.organizationName || 'SalesBuster' },
      currentFields,
    });

    // Fallback: only update fields that are currently empty or previous regex fallback
    for (const [field, val] of Object.entries(updates)) {
      if (!val) continue;
      const meta = currentMeta[field];
      if (!meta || !meta.value || meta.source === 'regex_fallback') {
        updateContactField(field, val, 'regex_fallback', 0.8);
      }
    }
  }, [
    liveVoice.displayTranscript,
    liveVoice.committedTranscript,
    user,
    updateContactField,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      liveVoiceRef.current?.stopVoiceSession?.().catch(() => {});
    };
  }, []);

  // Waveform & Pulse Animation react to speech volume
  useEffect(() => {
    let animLoop;
    if (isListening) {
      const vol = liveVoice.inputVolume || 0.15;
      const targetScale = Math.min(1.6, Math.max(1, 1 + vol * 1.4));

      animLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: targetScale,
              duration: 350,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 350,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: Math.min(1, 0.75 + vol * 0.8),
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.65,
              duration: 350,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim1, {
              toValue: Math.min(2.0, Math.max(0.6, 1 + vol * 2.2)),
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(waveAnim1, {
              toValue: 0.8,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(waveAnim2, {
              toValue: 0.75,
              duration: 350,
              useNativeDriver: true,
            }),
            Animated.timing(waveAnim2, {
              toValue: Math.min(1.8, Math.max(0.6, 1 + vol * 2.0)),
              duration: 350,
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      animLoop.start();
    } else {
      // Gentle ambient idle breathing loop for the radial aura
      animLoop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 2200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 0.98,
              duration: 2200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1.0,
              duration: 2200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.8,
              duration: 2200,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ]),
      );
      animLoop.start();
      waveAnim1.setValue(1);
      waveAnim2.setValue(1);
    }
    return () => animLoop?.stop();
  }, [isListening, liveVoice.inputVolume]);

  // Live voice duration timer effect (starts counting up only after countdown finishes)
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

  const formatVoiceTimer = (totalSecs = 0) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Gracefully stop active voice session and apply post-capture analysis & polish
  const stopVoiceCapture = async (showAnalysingStatus = false) => {
    setIsListening(false);
    audioCaptureInfoRef.current = null;
    keepAudioForAnalysisRef.current = true;

    if (showAnalysingStatus) {
      setIsVoiceAnalysing(true);
      setAnalysisStep(1); // 1. Audio processing
    }

    try {
      await liveVoice.stopVoiceSession();
    } catch (err) {
      console.warn('Error stopping voice session:', err);
    } finally {
      keepAudioForAnalysisRef.current = false;
    }

    const audioCapture = audioCaptureInfoRef.current;
    let extracted = null;

    if (showAnalysingStatus) {
      setAnalysisStep(2); // 2. Extracting contact information
    }

    if (audioCapture?.filePath) {
      setIsAnalyzingVoiceAudio(true);
      try {
        if (showAnalysingStatus) {
          await new Promise(r => setTimeout(r, 450));
          setAnalysisStep(3); // 3. Identifying name, company and designation
        }

        const analysis = await eventService.analyzeVoiceAudio(token, {
          audioUri: audioCapture.filePath,
          eventName: selectedEvent?.name || 'Event Lead',
        });
        extracted = analysis?.data || {};

        if (showAnalysingStatus) {
          setAnalysisStep(4); // 4. Fetching and populating contact details
        }

        const normalized = normalizeExtractedContact(extracted, {
          user,
          organization: { name: user?.organizationName || 'SalesBuster' },
        });
        for (const field of [
          'name',
          'phone',
          'companyName',
          'designation',
          'summary',
        ]) {
          if (normalized[field]?.value) {
            updateContactField(
              field,
              normalized[field].value,
              'ai_final',
              0.98,
            );
          }
        }
        if (extracted.originalTranscript)
          setRawTranscript(extracted.originalTranscript);
      } catch (error) {
        console.error(
          '[CONTACT_CAPTURE] Post-stop audio analysis failed:',
          error?.response?.data?.message || error.message,
        );
        showGuestAlert(
          'Voice Analysis',
          error?.response?.data?.message ||
            'Could not analyze the recording. The live-captured details are still available.',
        );
      } finally {
        setIsAnalyzingVoiceAudio(false);
        GeminiVoiceAudioModule?.deleteCapturedAudioFile?.(
          audioCapture.filePath,
        ).catch(() => {});
      }
    } else if (showAnalysingStatus) {
      // Audio file not present; use live/interim transcript data
      await new Promise(r => setTimeout(r, 450));
      setAnalysisStep(3); // 3. Identifying name, company and designation
      await new Promise(r => setTimeout(r, 450));
      setAnalysisStep(4); // 4. Fetching and populating contact details
    }

    // Apply client-side phonetic & spell-check polish on captured fields
    const currentSnapshot = {
      name: fieldsRef.current.name || name,
      companyName: fieldsRef.current.companyName || companyName,
      designation: fieldsRef.current.designation || designation,
      summary: fieldsRef.current.summary || summary,
    };
    const quickPolished = polishFieldSpellings(currentSnapshot);
    if (
      quickPolished.name &&
      !contactDetailsRef.current.name?.isManuallyEdited
    ) {
      updateContactField('name', quickPolished.name, 'polish', 0.95);
    }
    if (
      quickPolished.companyName &&
      !contactDetailsRef.current.companyName?.isManuallyEdited
    ) {
      updateContactField(
        'companyName',
        quickPolished.companyName,
        'polish',
        0.95,
      );
    }
    if (
      quickPolished.designation &&
      !contactDetailsRef.current.designation?.isManuallyEdited
    ) {
      updateContactField(
        'designation',
        quickPolished.designation,
        'polish',
        0.95,
      );
    }
    if (
      quickPolished.summary &&
      !contactDetailsRef.current.summary?.isManuallyEdited
    ) {
      updateContactField('summary', quickPolished.summary, 'polish', 0.95);
    }

    if (showAnalysingStatus) {
      // Mark all 4 steps complete with satisfying visual pause
      setAnalysisStep(5);
      await new Promise(r => setTimeout(r, 650));

      // Automatically close popup after data has been successfully fetched and populated!
      setIsVoiceModalVisible(false);
      setIsVoiceAnalysing(false);
      setAnalysisStep(1);
      orangeGlowAnim.setValue(0);
    }
  };

  // Open Voice Capture Modal & Start Gemini Live Voice Capture
  const handleOpenVoiceCapture = async () => {
    // If details are already filled in, show warning and stop opening modal
    const isFilled = Boolean(
      hasUnsavedDetails ||
        (name && name.trim().length > 0) ||
        (companyName && companyName.trim().length > 0) ||
        (designation && designation.trim().length > 0) ||
        (phone && phone.trim().length > 0) ||
        (summary && summary.trim().length > 0) ||
        selfiePhoto ||
        (fieldsRef.current?.name && fieldsRef.current.name.trim().length > 0) ||
        (fieldsRef.current?.phone &&
          fieldsRef.current.phone.trim().length > 0) ||
        (fieldsRef.current?.companyName &&
          fieldsRef.current.companyName.trim().length > 0) ||
        (fieldsRef.current?.designation &&
          fieldsRef.current.designation.trim().length > 0) ||
        (fieldsRef.current?.summary &&
          fieldsRef.current.summary.trim().length > 0) ||
        (contactDetailsRef.current?.name?.value &&
          contactDetailsRef.current.name.value.trim().length > 0) ||
        (contactDetailsRef.current?.phone?.value &&
          contactDetailsRef.current.phone.value.trim().length > 0) ||
        (contactDetailsRef.current?.companyName?.value &&
          contactDetailsRef.current.companyName.value.trim().length > 0) ||
        (contactDetailsRef.current?.designation?.value &&
          contactDetailsRef.current.designation.value.trim().length > 0) ||
        (contactDetailsRef.current?.summary?.value &&
          contactDetailsRef.current.summary.value.trim().length > 0),
    );

    if (isFilled) {
      setShowUnsavedWarning(true);
      return;
    }

    if (isScanningCard) {
      showGuestAlert('Please Wait', 'Card scanning is currently in progress.');
      return;
    }

    if (
      !selectedEvent?._id ||
      selectedEvent._id === 'default' ||
      events.length === 0
    ) {
      setIsNoEventModalVisible(true);
      return;
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message:
            'SalesBuster needs microphone access for the SalesBuster AI Voice Capture.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        showGuestAlert(
          'Permission Denied',
          'Microphone permission is required for voice capture.',
        );
        return;
      }
    }

    setVoiceRecordingSeconds(0);
    setIsVoiceModalVisible(true);
    setIsListening(false);
    setVoiceCountdown(5);
    orangeGlowAnim.setValue(0);

    // 5-to-1 Countdown before starting the listening duration count
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    let count = 5;
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
        eventId:
          selectedEvent?._id !== 'default' ? selectedEvent?._id : undefined,
        eventName: selectedEvent?.name || 'Event Lead',
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
      showGuestAlert(
        'SalesBuster AI Voice Assistant',
        err.message || 'Could not start live voice assistant.',
      );
    }
  };

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

    // Run post-stop analysis inside the existing voice capture modal
    await stopVoiceCapture(true);
  };

  const handleCloseVoiceModal = async () => {
    if (isVoiceAnalysing) return; // Prevent aborting while analysis is active
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setVoiceCountdown(null);
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    orangeGlowAnim.setValue(0);
    setIsVoiceAnalysing(false);
    setAnalysisStep(1);
    setIsVoiceModalVisible(false);
    if (isListening) {
      await stopVoiceCapture(false);
    }
  };

  const handleTogglePauseVoice = () => {
    liveVoice.togglePause();
  };

  // Native camera capture for attendee selfie
  const handleCaptureSelfie = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'SalesBuster needs camera access to take a selfie.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        showGuestAlert(
          'Permission Denied',
          'Camera permission is required to take a selfie.',
        );
        return;
      }
    }

    const { DefaultDialer } = NativeModules;
    if (DefaultDialer?.captureSelfiePhoto) {
      try {
        const photoResult = await DefaultDialer.captureSelfiePhoto();
        if (photoResult?.base64) {
          setSelfiePhoto({
            base64: photoResult.base64,
            mimeType: photoResult.mimeType || 'image/jpeg',
            uri:
              photoResult.uri ||
              `data:${photoResult.mimeType || 'image/jpeg'};base64,${
                photoResult.base64
              }`,
          });
        }
      } catch (err) {
        console.warn('Error capturing selfie:', err);
      }
    } else {
      showGuestAlert('Camera', 'Selfie camera capture is available on device.');
    }
  };

  const handleResetFields = () => {
    // Gracefully stop active voice listener if running
    if (isListening) {
      liveVoiceRef.current?.stopVoiceSession?.().catch(() => {});
      setIsListening(false);
    }

    // Reset input states
    setName('');
    setPhone('');
    setCompanyName('');
    setDesignation('');
    setSummary('');
    setMessageText('');
    setRawTranscript('');
    setSelfiePhoto(null);
    setIsVoiceModalVisible(false);
    setManualReviewNotice(false);
    setShowUnsavedWarning(false);

    // Reset AI detected badges
    setAiDetectedFields({
      name: false,
      phone: false,
      company: false,
      designation: false,
      summary: false,
    });

    // Reset ref metadata
    contactDetailsRef.current = {
      name: {
        value: '',
        source: 'empty',
        confidence: 0,
        isManuallyEdited: false,
      },
      phone: {
        value: '',
        source: 'empty',
        confidence: 0,
        isManuallyEdited: false,
      },
      companyName: {
        value: '',
        source: 'empty',
        confidence: 0,
        isManuallyEdited: false,
      },
      designation: {
        value: '',
        source: 'empty',
        confidence: 0,
        isManuallyEdited: false,
      },
      summary: {
        value: '',
        source: 'empty',
        confidence: 0,
        isManuallyEdited: false,
      },
    };

    fieldsRef.current = {
      name: '',
      phone: '',
      companyName: '',
      designation: '',
      summary: '',
      aiDetectedFields: {
        name: false,
        phone: false,
        company: false,
        designation: false,
        summary: false,
      },
      isToolSet: {
        name: false,
        phone: false,
        company: false,
        designation: false,
        summary: false,
      },
    };
  };

  // Launch native camera directly to capture visiting / business card & extract via Gemini 3.5 Flash Lite
  const handleCaptureCard = async () => {
    // If details are already filled in, show warning and stop opening camera
    const isFilled = Boolean(
      hasUnsavedDetails ||
        (name && name.trim().length > 0) ||
        (companyName && companyName.trim().length > 0) ||
        (designation && designation.trim().length > 0) ||
        (phone && phone.trim().length > 0) ||
        (summary && summary.trim().length > 0) ||
        selfiePhoto ||
        (fieldsRef.current?.name && fieldsRef.current.name.trim().length > 0) ||
        (fieldsRef.current?.phone &&
          fieldsRef.current.phone.trim().length > 0) ||
        (fieldsRef.current?.companyName &&
          fieldsRef.current.companyName.trim().length > 0) ||
        (fieldsRef.current?.designation &&
          fieldsRef.current.designation.trim().length > 0) ||
        (fieldsRef.current?.summary &&
          fieldsRef.current.summary.trim().length > 0) ||
        (contactDetailsRef.current?.name?.value &&
          contactDetailsRef.current.name.value.trim().length > 0) ||
        (contactDetailsRef.current?.phone?.value &&
          contactDetailsRef.current.phone.value.trim().length > 0) ||
        (contactDetailsRef.current?.companyName?.value &&
          contactDetailsRef.current.companyName.value.trim().length > 0) ||
        (contactDetailsRef.current?.designation?.value &&
          contactDetailsRef.current.designation.value.trim().length > 0) ||
        (contactDetailsRef.current?.summary?.value &&
          contactDetailsRef.current.summary.value.trim().length > 0),
    );

    if (isFilled) {
      setShowUnsavedWarning(true);
      return;
    }

    if (isScanningCard) return;

    if (
      !selectedEvent?._id ||
      selectedEvent._id === 'default' ||
      events.length === 0
    ) {
      setIsNoEventModalVisible(true);
      return;
    }

    // Gracefully stop active voice session if running
    if (isListening) {
      setIsListening(false);
      try {
        await liveVoice.stopVoiceSession();
      } catch (err) {
        console.warn('Error stopping voice before camera:', err);
      }
    }

    // Android Camera permission check
    if (Platform.OS === 'android') {
      const isGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );

      if (!isGranted) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message:
              'SalesBuster needs camera access to capture business & visiting cards.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          showGuestAlert(
            'Camera Permission Required',
            'Camera access is required to capture visiting cards. Please allow Camera permission in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          showGuestAlert(
            'Permission Denied',
            'Camera permission is required to capture business cards.',
          );
          return;
        }
      }
    }

    const { DefaultDialer } = NativeModules;
    if (!DefaultDialer?.captureCardPhoto) {
      showGuestAlert(
        'Feature Unavailable',
        'Direct camera card capture is only available on Android.',
      );
      return;
    }

    try {
      const photoResult = await DefaultDialer.captureCardPhoto();
      if (!photoResult?.base64) {
        return;
      }

      setIsScanningCard(true);

      const aiRes = await eventService.scanBusinessCard(token, {
        imageBase64: photoResult.base64,
        mimeType: photoResult.mimeType || 'image/jpeg',
      });

      if (aiRes?.success && aiRes?.data) {
        const card = aiRes.data;
        const detected = {
          name: false,
          company: false,
          designation: false,
          phone: false,
          summary: false,
        };

        if (card.name && typeof card.name === 'string' && card.name.trim()) {
          const rawCardName = card.name.trim();
          if (!isLikelyCompanyName(rawCardName)) {
            setName(rawCardName);
            detected.name = true;
            contactDetailsRef.current.name = {
              value: rawCardName,
              source: 'card_scan',
              confidence: 0.95,
              isManuallyEdited: false,
            };
          } else if (!card.companyName) {
            setCompanyName(rawCardName);
            detected.company = true;
            contactDetailsRef.current.companyName = {
              value: rawCardName,
              source: 'card_scan',
              confidence: 0.95,
              isManuallyEdited: false,
            };
          }
        }

        if (
          card.companyName &&
          typeof card.companyName === 'string' &&
          card.companyName.trim()
        ) {
          setCompanyName(card.companyName.trim());
          detected.company = true;
          contactDetailsRef.current.companyName = {
            value: card.companyName.trim(),
            source: 'card_scan',
            confidence: 0.95,
            isManuallyEdited: false,
          };
        }

        if (
          card.designation &&
          typeof card.designation === 'string' &&
          card.designation.trim()
        ) {
          setDesignation(card.designation.trim());
          detected.designation = true;
          contactDetailsRef.current.designation = {
            value: card.designation.trim(),
            source: 'card_scan',
            confidence: 0.95,
            isManuallyEdited: false,
          };
        }

        if (card.phone && typeof card.phone === 'string' && card.phone.trim()) {
          setPhone(card.phone.trim());
          detected.phone = true;
          contactDetailsRef.current.phone = {
            value: card.phone.trim(),
            source: 'card_scan',
            confidence: 0.99,
            isManuallyEdited: false,
          };
        }

        // Build composite summary if email / website / address are also extracted
        let finalSummary =
          card.summary && typeof card.summary === 'string'
            ? card.summary.trim()
            : '';
        const extraLines = [];
        if (card.email && typeof card.email === 'string' && card.email.trim()) {
          extraLines.push(`Email: ${card.email.trim()}`);
        }
        if (
          card.website &&
          typeof card.website === 'string' &&
          card.website.trim()
        ) {
          extraLines.push(`Website: ${card.website.trim()}`);
        }
        if (
          card.address &&
          typeof card.address === 'string' &&
          card.address.trim()
        ) {
          extraLines.push(`Address: ${card.address.trim()}`);
        }
        if (extraLines.length > 0) {
          finalSummary = finalSummary
            ? `${finalSummary}\n${extraLines.join(' | ')}`
            : extraLines.join(' | ');
        }
        if (finalSummary) {
          setSummary(finalSummary);
          detected.summary = true;
        }

        setAiDetectedFields(prev => ({
          ...prev,
          ...detected,
        }));

        fieldsRef.current.isToolSet = {
          name: detected.name,
          phone: detected.phone,
          company: detected.company,
          designation: detected.designation,
        };

        showGuestAlert(
          'Card Scanned Successfully',
          `Captured details for "${
            card.name || card.companyName || 'Attendee'
          }" via SalesBuster AI. Review and submit!`,
        );
      } else {
        showGuestAlert(
          'Card Analysis',
          aiRes?.message ||
            'Could not detect clear text on this card. Please retake photo with better lighting.',
        );
      }
    } catch (err) {
      if (
        err?.code === 'CANCELLED' ||
        err?.message?.toLowerCase().includes('cancel')
      ) {
        return;
      }
      console.warn('[GuestHomeScreen] Card capture/scan error:', err);
      showGuestAlert(
        'Card Scan Failed',
        getFriendlyErrorMessage(
          err,
          'Failed to capture and analyze business card. Please retake photo with good lighting.',
        ),
      );
    } finally {
      setIsScanningCard(false);
    }
  };

  // Helper to reset form fields
  const resetFormFields = () => {
    setName('');
    setCompanyName('');
    setDesignation('');
    setPhone('');
    setSummary('');
    setMessageText('');
    setRawTranscript('');
    setSelfiePhoto(null);
    setAiDetectedFields({
      name: false,
      company: false,
      designation: false,
      phone: false,
      summary: false,
    });
    fieldsRef.current = {
      name: '',
      phone: '',
      companyName: '',
      designation: '',
      summary: '',
      aiDetectedFields: {
        name: false,
        company: false,
        designation: false,
        phone: false,
        summary: false,
      },
      isToolSet: {
        name: false,
        phone: false,
        company: false,
        designation: false,
      },
    };
    contactDetailsRef.current = {
      name: {
        value: '',
        source: 'empty',
        confidence: 0,
        isManuallyEdited: false,
      },
      phone: {
        value: '',
        source: 'empty',
        confidence: 0,
        isManuallyEdited: false,
      },
      companyName: {
        value: '',
        source: 'empty',
        confidence: 0,
        isManuallyEdited: false,
      },
      designation: {
        value: '',
        source: 'empty',
        confidence: 0,
        isManuallyEdited: false,
      },
      summary: {
        value: '',
        source: 'empty',
        confidence: 0,
        isManuallyEdited: false,
      },
    };
    setManualReviewNotice(false);
    setShowUnsavedWarning(false);
  };

  // Gracefully stop active AI voice listener immediately on save / send action
  const stopVoiceListener = useCallback(async () => {
    if (
      isListening ||
      liveVoiceRef.current?.isConnected ||
      liveVoice.isConnected ||
      liveVoice.status !== 'idle'
    ) {
      console.log(
        '[CONTACT_CAPTURE] Stopping AI voice listener on Save/Send action',
      );
      setIsListening(false);
      try {
        await (liveVoiceRef.current?.stopVoiceSession?.() ||
          liveVoice.stopVoiceSession?.());
      } catch (err) {
        console.warn('[CONTACT_CAPTURE] Error stopping voice session:', err);
      }
    }
  }, [
    isListening,
    liveVoice.isConnected,
    liveVoice.status,
    liveVoice.stopVoiceSession,
  ]);

  // 1. Validate & open the WhatsApp confirmation modal with merged template & docs
  const handleInitiateSaveAndSend = async (explicitContact = null) => {
    // Immediately stop the AI voice listener before anything else
    await stopVoiceListener();

    const contactData = explicitContact || {
      name: contactDetailsRef.current.name?.value || name,
      phone: contactDetailsRef.current.phone?.value || phone,
      companyName: contactDetailsRef.current.companyName?.value || companyName,
      designation: contactDetailsRef.current.designation?.value || designation,
      summary: contactDetailsRef.current.summary?.value || summary,
      rawTranscript: rawTranscript || liveVoice.liveTranscript || '',
      messageText: messageText,
    };

    const targetName = (contactData.name || '').trim();
    if (!targetName) {
      showGuestAlert('Required Field', 'Please enter visitor name.');
      return;
    }
    const rawPhoneDigits = (contactData.phone || '').replace(/\D/g, '');
    let cleanPhone = rawPhoneDigits;
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91'))
      cleanPhone = cleanPhone.slice(2);
    else if (cleanPhone.length === 11 && cleanPhone.startsWith('0'))
      cleanPhone = cleanPhone.slice(1);

    if (!cleanPhone) {
      showGuestAlert(
        'Required Field',
        'Please enter visitor mobile number.',
      );
      return;
    }

    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      showGuestAlert(
        'Invalid Mobile Number',
        'Please enter a valid 10-digit mobile number.',
      );
      return;
    }

    if (
      !selectedEvent?._id ||
      selectedEvent._id === 'default' ||
      events.length === 0
    ) {
      setIsNoEventModalVisible(true);
      return;
    }

    const activeTranscript =
      contactData.rawTranscript ||
      rawTranscript ||
      liveVoice.liveTranscript ||
      '';
    const eventTemplate = (
      selectedEvent?.whatsappTemplate ||
      selectedEvent?.description ||
      ''
    ).trim();
    const fallbackGreeting = `Hi ${targetName}, it was a pleasure connecting with you at ${selectedEvent.name}! Here are our company and event details. Feel free to reach out anytime!`;

    // Populate template variables
    let populated = (contactData.messageText || messageText || '').trim();
    if (!populated) {
      if (eventTemplate) {
        populated = eventTemplate
          .replace(/\{there name\}|\{name\}/gi, targetName || 'there')
          .replace(
            /\{company\}/gi,
            (contactData.companyName || '').trim() || 'your company',
          )
          .replace(
            /\{event name\}|\{event\}/gi,
            selectedEvent.name || 'our event',
          )
          .replace(
            /\{venue\}/gi,
            selectedEvent.venue || selectedEvent.location || '',
          );
      } else {
        populated = fallbackGreeting;
      }
    }

    // Helper to identify image attachment
    const isImageAttachment = att => {
      if (!att) return false;
      if (att.isImage) return true;
      const type = (att.type || att.mimeType || '').toLowerCase();
      if (type.startsWith('image/')) return true;
      const target = (
        att.name ||
        att.fileName ||
        att.uri ||
        att.url ||
        ''
      ).toLowerCase();
      return /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(target);
    };

    // Find the event file if one exists (any file type: PDF, Doc, Image, etc.)
    const eventAttachment =
      Array.isArray(selectedEvent?.attachments) && selectedEvent.attachments.length > 0
        ? selectedEvent.attachments[0]
        : null;

    // Resolve sharable link on our server for the event file
    let sharableFileLink = '';
    if (eventAttachment) {
      const rawUrl = eventAttachment.url || eventAttachment.uri || '';
      if (rawUrl) {
        sharableFileLink =
          rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
            ? rawUrl
            : getFullMediaUrl(rawUrl);
      }
    }

    // Append sharable file link to text message if not already included
    let messageWithFileLink = populated;
    if (sharableFileLink && !messageWithFileLink.includes(sharableFileLink)) {
      messageWithFileLink = messageWithFileLink.trim()
        ? `${messageWithFileLink.trim()}\n\n${sharableFileLink}`
        : sharableFileLink;
    }

    // Media share rule:
    // Only attendee selfie is sent as media ("share the selfie as it is how it was working").
    // The event file is shared as a sharable link in text form, NOT as media ("while sharing the file no need send as nedia share the sharable link that we are stored in our server in text form").
    let attachments = [];
    let isSelfieAttached = false;

    if (selfiePhoto?.uri) {
      attachments = [
        {
          name: `selfie_${Date.now()}.jpg`,
          fileName: `selfie_${Date.now()}.jpg`,
          uri: selfiePhoto.uri,
          type: selfiePhoto.mimeType || 'image/jpeg',
          mimeType: selfiePhoto.mimeType || 'image/jpeg',
          isImage: true,
          isSelfie: true,
        },
      ];
      isSelfieAttached = true;
    }

    const savePayload = {
      name: targetName,
      cleanPhone,
      companyName: (contactData.companyName || '').trim(),
      designation: (contactData.designation || '').trim(),
      summary: (contactData.summary || '').trim(),
      transcript: activeTranscript,
      attachments,
      isSelfieAttached,
      sharableFileLink,
      eventFileName: eventAttachment?.name || '',
    };

    console.log('[CONTACT_CAPTURE] Save payload:', {
      ...savePayload,
      cleanPhone: redactPhone(cleanPhone),
    });

    setPendingLeadData(savePayload);
    setConfirmMessage(messageWithFileLink);
    setIsWhatsAppConfirmVisible(true);
  };

  // 2. Confirm, Save to Backend, Open WhatsApp, and Return to Success Screen
  const handleConfirmAndSendWhatsApp = async () => {
    if (!pendingLeadData) return;
    await stopVoiceListener();
    setSubmitting(true);
    setSubmittingStatus(
      pendingLeadData.attachments?.length > 0
        ? 'Syncing contact...'
        : 'Saving lead...',
    );

    try {
      // Message text to send (caption when files are attached, or full text message)
      const finalMessage = confirmMessage.trim();

      // Save contact to backend
      const res = await eventService.saveEventContact(
        token,
        selectedEvent._id,
        {
          name: pendingLeadData.name,
          phone: pendingLeadData.cleanPhone,
          companyName: pendingLeadData.companyName,
          designation: pendingLeadData.designation,
          summary: pendingLeadData.summary,
          messageText: finalMessage,
          transcript: pendingLeadData.transcript,
          attachments: pendingLeadData.attachments,
          status: 'captured',
        },
      );

      const contactId = res.data?._id;

      // Data for success screen
      const successData = {
        name: pendingLeadData.name,
        eventName: selectedEvent.name,
        phone: pendingLeadData.cleanPhone,
        messageText: finalMessage,
        contactId,
      };

      // Clean up any existing listener
      if (appStateSubscriptionRef.current) {
        appStateSubscriptionRef.current.remove();
        appStateSubscriptionRef.current = null;
      }

      if (pendingLeadData.attachments?.length > 0) {
        setSubmittingStatus('Preparing WhatsApp...');
      }

      const shareResult = await eventService.shareEventFilesToWhatsApp(
        pendingLeadData.cleanPhone,
        finalMessage,
        pendingLeadData.attachments,
        {
          name: pendingLeadData.name,
          companyName: pendingLeadData.companyName,
          eventName: selectedEvent?.name,
          sharableLink: pendingLeadData.sharableFileLink,
        },
      );

      if (Platform.OS === 'android' && shareResult?.imageCopiedToClipboard) {
        ToastAndroid.show(
          'Photo copied to clipboard — paste from keyboard if needed',
          ToastAndroid.LONG,
        );
      }

      // AppState change listener: detects when user returns to app from WhatsApp
      let hasNavigated = false;
      const navigateToSuccess = () => {
        if (!hasNavigated) {
          hasNavigated = true;
          if (appStateSubscriptionRef.current) {
            appStateSubscriptionRef.current.remove();
            appStateSubscriptionRef.current = null;
          }
          navigation.navigate('LeadCaptureSuccess', successData);
        }
      };

      appStateSubscriptionRef.current = AppState.addEventListener(
        'change',
        nextAppState => {
          if (nextAppState === 'active') {
            navigateToSuccess();
          }
        },
      );

      if (contactId) {
        eventService
          .updateContactStatus(
            token,
            selectedEvent._id,
            contactId,
            'whatsapp_opened',
          )
          .catch(statusErr => {
            console.warn(
              '[CONTACT_CAPTURE] Could not update WhatsApp handoff status:',
              statusErr,
            );
          });
      }
      resetFormFields();
      setIsWhatsAppConfirmVisible(false);
      // Start navigation fallback only after WhatsApp was launched.
      setTimeout(() => navigateToSuccess(), 3500);
    } catch (err) {
      if (appStateSubscriptionRef.current) {
        appStateSubscriptionRef.current.remove();
        appStateSubscriptionRef.current = null;
      }
      console.error('Save & Send WhatsApp error:', err);
      showGuestAlert(
        'Unable to Save Contact',
        getFriendlyErrorMessage(
          err,
          'Failed to save contact and open WhatsApp. Please try again.',
        ),
      );
    } finally {
      setSubmitting(false);
      setSubmittingStatus('');
    }
  };

  // Create New Event
  const handleCreateEvent = async () => {
    if (!newEventName.trim()) {
      showGuestAlert('Required', 'Please enter an event name.');
      return;
    }
    setCreatingEvent(true);
    try {
      const res = await eventService.createEvent(token, {
        name: newEventName.trim(),
        venue: newEventLocation.trim() || 'Venue',
        location: newEventLocation.trim() || 'Venue',
        description: newEventDesc.trim(),
        whatsappTemplate: newEventDesc.trim(),
      });
      if (res.success && res.data) {
        setEvents(prev => [res.data, ...prev]);
        setSelectedEvent(res.data);
        setIsNoEventModalVisible(false);
        AsyncStorage.setItem(LAST_EVENT_STORAGE_KEY, res.data._id).catch(
          () => {},
        );
        setIsNewEventModalVisible(false);
        setNewEventName('');
        setNewEventLocation('');
        setNewEventDesc('');
        showGuestAlert('Success', `Event "${res.data.name}" created!`);
      }
    } catch (err) {
      showGuestAlert(
        'Unable to Create Event',
        getFriendlyErrorMessage(
          err,
          'Failed to create event. Please check the details and try again.',
        ),
      );
    } finally {
      setCreatingEvent(false);
    }
  };

  const ContainerComponent = isEmbedded ? View : SafeAreaView;
  const containerProps = isEmbedded
    ? { style: styles.container }
    : {
        style: [styles.safeArea, isOrgOwner && { backgroundColor: '#181738' }],
        edges: ['top', 'left', 'right'],
      };

  return (
    <ContainerComponent {...containerProps}>
      {!isEmbedded && (
        <StatusBar
          barStyle="light-content"
          backgroundColor={isOrgOwner ? '#181738' : '#0B0A1F'}
        />
      )}

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {!isEmbedded && isOrgOwner && (
          <OrgOwnerTabBar
            activeTab="networking"
            onSelectTab={tab => {
              if (tab === 'sales') {
                navigation?.navigate('ManagerDashboard');
              }
            }}
          />
        )}

        <KeyboardAwareScrollView
          ref={scrollViewRef}
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. TOP ACTION NAVIGATION BAR */}
          <View style={styles.topBar}>
            {/* Our Products */}
            <TouchableOpacity
              ref={guidanceProductsRef}
              collapsable={false}
              style={styles.productsBtn}
              onPress={() => setIsProductsModalVisible(true)}
              activeOpacity={0.8}
            >
              <GridProductsIcon size={16} color="#9F6EFE" />
              <Text style={styles.productsBtnText}>Our Products</Text>
            </TouchableOpacity>

            {/* Right Action Group: Contacts, New Event, Info */}
            <View style={styles.topBarRight}>
              {/* Contacts Pill Button */}
              <TouchableOpacity
                ref={guidanceContactsRef}
                collapsable={false}
                style={styles.pillActionBtn}
                onPress={() => {
                  navigation?.navigate('EventContacts', {
                    selectedEventId:
                      selectedEvent?._id !== 'default'
                        ? selectedEvent?._id
                        : undefined,
                  });
                }}
                activeOpacity={0.8}
              >
                <UserIcon size={12} color="#A8A8B2" />
                <Text style={styles.pillActionBtnText}>Contacts</Text>
              </TouchableOpacity>

              {/* New Event Pill Button */}
              <TouchableOpacity
                style={styles.pillActionBtn}
                onPress={() => {
                  navigation?.navigate('NewEvent', {
                    onEventCreated: created => {
                      setEvents(prev => [created, ...prev]);
                      setSelectedEvent(created);
                    },
                  });
                }}
                activeOpacity={0.8}
              >
                <PlusIcon size={14} color="#A8A8B2" />
                <Text style={styles.pillActionBtnText}>New Event</Text>
              </TouchableOpacity>

              {/* Info Guide Circle Button - Opens GuestTourModal */}
              <TouchableOpacity
                style={styles.infoCircleBtn}
                onPress={() => setIsTourModalVisible(true)}
                activeOpacity={0.8}
              >
                <ExactInfoIcon size={16} color="#0B0A1F" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. EVENT TITLE & LOCATION HEADER */}
          <View
            ref={guidanceEventRef}
            collapsable={false}
            style={styles.eventHeader}
          >
            <View style={styles.eventTitleContainer}>
              <TouchableOpacity
                style={styles.eventTitleRow}
                onPress={() => {
                  if (events.length === 0) {
                    setIsNoEventModalVisible(true);
                  } else {
                    setIsEventPickerVisible(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {selectedEvent?.name || 'Add an event to get started'}
                </Text>
                <View style={styles.dropdownCircle}>
                  <ChevronDownIcon size={12} color="#CBD5E1" />
                </View>
              </TouchableOpacity>
              {/* {selectedEvent?._id && selectedEvent._id !== 'default' && (
                <TouchableOpacity
                  style={styles.eventEditBtn}
                  onPress={() => handleEditEvent(selectedEvent)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <EditIcon size={14} color="#A78BFA" />
                </TouchableOpacity>
              )} */}
            </View>

            <TouchableOpacity
              style={styles.locationRow}
              onPress={() => {
                if (events.length === 0) {
                  setIsNoEventModalVisible(true);
                } else {
                  setIsEventPickerVisible(true);
                }
              }}
              activeOpacity={0.7}
            >
              <LocationPinIcon size={14} color="#8F90A6" />
              <Text style={styles.locationText} numberOfLines={1}>
                {selectedEvent?.venue ||
                  selectedEvent?.location ||
                  (events.length === 0
                    ? 'Tap to pick or create an event'
                    : 'Select an event')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3. DUAL CAPTURE CARDS: CAPTURE VOICE & CAPTURE CARD */}
          <View style={styles.captureCardsRow}>
            <TouchableOpacity
              ref={guidanceVoiceRef}
              collapsable={false}
              style={styles.captureCardBig}
              onPress={handleOpenVoiceCapture}
              activeOpacity={0.8}
              disabled={isScanningCard}
            >
              <ExactCaptureVoiceIcon size={40} />
              <Text style={styles.captureCardBigTitle}>Capture Voice</Text>
            </TouchableOpacity>

            <TouchableOpacity
              ref={guidanceCameraRef}
              collapsable={false}
              style={styles.captureCardBig}
              onPress={handleCaptureCard}
              activeOpacity={0.8}
              disabled={isScanningCard}
            >
              {isScanningCard ? (
                <ActivityIndicator
                  size="small"
                  color="#A855F7"
                  style={{ marginVertical: 8 }}
                />
              ) : (
                <ExactCaptureCameraIcon size={40} bg="#0B0A1F" />
              )}
              <Text style={styles.captureCardBigTitle}>
                {isScanningCard ? 'Analyzing Card...' : 'Capture Card'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* UNSAVED DETAILS WARNING (Shown only when user taps mic or camera after filling details) */}
          {showUnsavedWarning && (
            <Text style={styles.unsavedWarningText}>
              Unsaved Details! Save or reset before proceeding.
            </Text>
          )}

          {/* SCANNING CARD BANNER */}
          {isScanningCard && (
            <View style={styles.scanningCardBanner}>
              <ActivityIndicator
                size="small"
                color="#A78BFA"
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.scanningCardBannerTitle}>
                  Analyzing Card with AI...
                </Text>
                <Text style={styles.scanningCardBannerSubtitle}>
                  Extracting attendee details with SalesBuster AI
                </Text>
              </View>
            </View>
          )}

          {/* ANALYZING VOICE AUDIO BANNER */}
          {isAnalyzingVoiceAudio && (
            <View style={styles.scanningCardBanner}>
              <ActivityIndicator
                size="small"
                color="#A78BFA"
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.scanningCardBannerTitle}>
                  Analyzing Voice Recording...
                </Text>
                <Text style={styles.scanningCardBannerSubtitle}>
                  SalesBuster AI is polishing the captured contact details
                </Text>
              </View>
            </View>
          )}

          {/* 4. FORM INPUT FIELDS */}
          <View
            ref={guidanceFormRef}
            collapsable={false}
            style={styles.formSection}
          >
            {/* Name */}
            <View style={styles.inputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="Name"
                placeholderTextColor="#64748B"
                value={name}
                onChangeText={val => {
                  updateContactField('name', val, 'manual');
                }}
                autoCorrect={false}
              />
            </View>

            {/* Company Name */}
            <View style={styles.inputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="Company Name"
                placeholderTextColor="#64748B"
                value={companyName}
                onChangeText={val => {
                  updateContactField('companyName', val, 'manual');
                }}
                autoCorrect={false}
              />
            </View>

            {/* Designation / Role */}
            <View style={styles.inputCard}>
              <TextInput
                style={styles.textInput}
                placeholder="Designation / Role"
                placeholderTextColor="#64748B"
                value={designation}
                onChangeText={val => {
                  updateContactField('designation', val, 'manual');
                }}
                autoCorrect={false}
              />
            </View>

            {/* Phone Number with +91 Prefix */}
            <View style={[styles.inputCard, styles.phoneCard]}>
              <Text style={styles.countryCodeText}>+91</Text>
              <View style={styles.phoneDivider} />
              <TextInput
                style={[styles.textInput, styles.phoneInput]}
                placeholder="Mobile Number"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={val => {
                  updateContactField('phone', val, 'manual');
                }}
              />
              {phone.replace(/\D/g, '').length === 10 && (
                <View style={styles.phoneVerifiedBadge}>
                  <CheckIcon size={12} color="#10B981" />
                </View>
              )}
            </View>

            {/* Discussion summary textarea */}
            <View style={[styles.inputCard, styles.summaryCard]}>
              <TextInput
                style={[styles.textInput, styles.summaryInput]}
                placeholder="Discussion summary"
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={summary}
                onChangeText={val => {
                  updateContactField('summary', val, 'manual');
                }}
              />
            </View>

            {/* Take a Selfie (optional) */}
            <View style={[styles.inputCard, styles.selfieRow]}>
              <View style={styles.selfieLabelContainer}>
                <Text style={styles.selfieLabel}>
                  Take a Selfie{' '}
                  <Text style={styles.selfieOptional}>(optional)</Text>
                </Text>
              </View>
              <View style={styles.selfieActionWrap}>
                <TouchableOpacity
                  style={styles.selfieCaptureBtn}
                  onPress={handleCaptureSelfie}
                  activeOpacity={0.8}
                >
                  {selfiePhoto ? (
                    <View style={styles.selfieCapturedRow}>
                      <Image
                        source={{ uri: selfiePhoto.uri }}
                        style={styles.selfieThumb}
                      />
                      <Text style={styles.selfieCaptureBtnText}>Retake</Text>
                    </View>
                  ) : (
                    <View style={styles.selfieCapturedRow}>
                      <CameraIcon
                        size={16}
                        color="#CBD5E1"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.selfieCaptureBtnText}>Capture</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {selfiePhoto ? (
                  <TouchableOpacity
                    style={styles.selfieClearBtn}
                    onPress={() => setSelfiePhoto(null)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <XIcon size={12} color="#CBD5E1" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          {/* 5. BOTTOM ACTIONS: RESET & SAVE / SEND MESSAGE */}
          <View style={styles.bottomActionsRow}>
            <TouchableOpacity
              style={styles.bottomResetBtn}
              onPress={handleResetFields}
              activeOpacity={0.8}
            >
              <Text style={styles.bottomResetBtnText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              ref={guidanceSaveRef}
              collapsable={false}
              style={[
                styles.bottomSaveBtn,
                submitting && styles.bottomSaveBtnDisabled,
              ]}
              onPress={async () => {
                await stopVoiceListener();
                handleInitiateSaveAndSend();
              }}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.bottomSaveBtnContent}>
                  <Text style={styles.bottomSaveBtnText}>
                    Save / Send Message
                  </Text>
                  <View style={styles.bottomSaveBtnWaWrap}>
                    <WhatsAppBadgeIcon size={24} />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Profile / Account link footer */}
          <TouchableOpacity
            style={styles.accountFooterLink}
            onPress={() => setIsAccountModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.accountFooterText}>
              Logged in as{' '}
              <Text style={styles.accountFooterHighlight}>
                {user?.name || 'User'}
              </Text>{' '}
              • Account Options
            </Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

      {/* ========================================================================= */}
      {/* MODAL 1: EVENT SELECTOR BOTTOM SHEET */}
      {/* ========================================================================= */}
      <Modal
        visible={isEventPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEventPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsEventPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.bottomSheetContainer}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            {/* Sheet Handle */}
            <View style={styles.sheetHandle} />

            {/* Header Row: Title, Subtitle, & Close Button */}
            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetHeaderTextContainer}>
                <Text style={styles.sheetTitle}>All Events</Text>
                <Text style={styles.sheetSubtitle}>
                  Pick the event you're capturing leads for.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setIsEventPickerVisible(false)}
                activeOpacity={0.7}
              >
                <XIcon size={14} color="#9E9EB2" />
              </TouchableOpacity>
            </View>

            {/* Events List or Empty State */}
            {events.length === 0 ? (
              <View style={styles.emptyEventsBox}>
                <View style={styles.emptyEventsIconWrap}>
                  <LocationPinIcon size={28} color="#A78BFA" />
                </View>
                <Text style={styles.emptyEventsTitle}>
                  Add an event to get started
                </Text>
                <Text style={styles.emptyEventsSubtitle}>
                  Create your first event to start capturing attendee leads and
                  business cards.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 4 }}
              >
                {events.map(evt => {
                  const isSelected = selectedEvent?._id === evt._id;
                  return (
                    <TouchableOpacity
                      key={evt._id}
                      style={[
                        styles.eventItemCard,
                        isSelected && styles.eventItemCardSelected,
                      ]}
                      onPress={() => handleSelectEvent(evt)}
                      activeOpacity={0.8}
                    >
                      {/* Left Indicator: Checked Circle or Empty Ring */}
                      {isSelected ? (
                        <View style={styles.eventItemCheckedCircle}>
                          <CheckIcon size={13} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View style={styles.eventItemUncheckedCircle} />
                      )}

                      {/* Middle Info: Name & Location with Pin */}
                      <View style={styles.eventItemInfo}>
                        <Text
                          style={[
                            styles.eventItemName,
                            isSelected && styles.eventItemNameSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {evt.name}
                        </Text>
                        <View style={styles.eventItemLocationRow}>
                          <LocationPinIcon size={12} color="#8E8CA6" />
                          <Text
                            style={styles.eventItemLocationText}
                            numberOfLines={1}
                          >
                            {evt.location ||
                              evt.venue ||
                              'No location provided'}
                          </Text>
                        </View>
                      </View>

                      {/* Right Action: Edit & Chevron */}
                      <View style={styles.sheetEventItemActions}>
                        <TouchableOpacity
                          style={styles.sheetEventEditBtn}
                          onPress={e => {
                            e?.stopPropagation?.();
                            setIsEventPickerVisible(false);
                            handleEditEvent(evt);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          activeOpacity={0.7}
                        >
                          <EditIcon size={14} color="#A78BFA" />
                        </TouchableOpacity>

                        <ChevronRightIcon
                          size={18}
                          color={isSelected ? '#A78BFA' : '#6B6987'}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Bottom Dashed Action: + New Event */}
            <TouchableOpacity
              style={styles.sheetNewEventBtn}
              onPress={() => {
                setIsEventPickerVisible(false);
                navigation?.navigate('NewEvent', {
                  onEventCreated: created => {
                    setEvents(prev => [created, ...prev]);
                    setSelectedEvent(created);
                  },
                });
              }}
              activeOpacity={0.8}
            >
              <PlusIcon size={16} color="#A78BFA" />
              <Text style={styles.sheetNewEventBtnText}>New Event</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 1B: NO EVENT POPUP */}
      {/* ========================================================================= */}
      <Modal
        visible={Boolean(isNoEventModalVisible && !isActionableGuideVisible && !isTourModalVisible)}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNoEventModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlayCentered}
          activeOpacity={1}
          onPress={() => setIsNoEventModalVisible(false)}
        >
          <View
            style={styles.noEventModalCard}
            onStartShouldSetResponder={() => true}
          >
            <TouchableOpacity
              style={styles.noEventCloseBtn}
              onPress={() => setIsNoEventModalVisible(false)}
              activeOpacity={0.7}
            >
              <XIcon size={18} color="#94A3B8" />
            </TouchableOpacity>

            <View style={styles.noEventIconWrap}>
              <LocationPinIcon size={32} color="#A78BFA" />
            </View>

            <Text style={styles.noEventTitle}>No Event Added</Text>
            <Text style={styles.noEventDesc}>
              No active events were found for your team. Create or add an event
              to capture attendee leads, scan business cards, and send WhatsApp
              messages.
            </Text>

            <TouchableOpacity
              style={styles.noEventCreateBtn}
              onPress={() => {
                setIsNoEventModalVisible(false);
                if (navigation) {
                  navigation.navigate('NewEvent', {
                    onEventCreated: created => {
                      setEvents(prev => [created, ...prev]);
                      setSelectedEvent(created);
                      setIsNoEventModalVisible(false);
                    },
                  });
                } else {
                  setIsNewEventModalVisible(true);
                }
              }}
              activeOpacity={0.85}
            >
              <PlusIcon size={16} color="#FFFFFF" />
              <Text style={styles.noEventCreateBtnText}>Create New Event</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.noEventRefreshBtn}
              onPress={() => {
                loadEvents();
              }}
              activeOpacity={0.7}
            >
              <RefreshIcon size={14} color="#94A3B8" />
              <Text style={styles.noEventRefreshBtnText}>Refresh Events</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: NEW EVENT CREATION */}
      {/* ========================================================================= */}
      <Modal
        visible={isNewEventModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNewEventModalVisible(false)}
      >
        <View style={styles.modalOverlayCentered}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Create New Event</Text>
              <TouchableOpacity
                onPress={() => setIsNewEventModalVisible(false)}
              >
                <XIcon size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.dialogInputWrap}>
              <Text style={styles.dialogLabel}>EVENT NAME *</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="e.g. Furry Fest, Tech Expo 2026"
                placeholderTextColor="#64748B"
                value={newEventName}
                onChangeText={setNewEventName}
              />
            </View>

            <View style={styles.dialogInputWrap}>
              <Text style={styles.dialogLabel}>LOCATION / VENUE</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="e.g. Jio World Garden, Mumbai"
                placeholderTextColor="#64748B"
                value={newEventLocation}
                onChangeText={setNewEventLocation}
              />
            </View>

            <View style={styles.dialogInputWrap}>
              <Text style={styles.dialogLabel}>DESCRIPTION</Text>
              <TextInput
                style={[styles.dialogInput, { height: 70 }]}
                placeholder="Optional notes or booth number..."
                placeholderTextColor="#64748B"
                multiline
                value={newEventDesc}
                onChangeText={setNewEventDesc}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.dialogSubmitBtn,
                creatingEvent && { opacity: 0.7 },
              ]}
              onPress={handleCreateEvent}
              disabled={creatingEvent}
            >
              {creatingEvent ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.dialogSubmitBtnText}>
                  Create & Select Event
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={isProductsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsProductsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsProductsModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.bottomSheetContainer}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            {/* Top Handle */}
            <View style={styles.sheetHandle} />

            {/* Header Row */}
            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetHeaderTextContainer}>
                <Text style={styles.sheetTitle}>Our Products</Text>
                <Text style={styles.sheetSubtitle}>
                  Tap any product to view features and book a demo.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setIsProductsModalVisible(false)}
                activeOpacity={0.7}
              >
                <XIcon size={14} color="#9E9EB2" />
              </TouchableOpacity>
            </View>

            {/* Products List matching design mockup */}
            <ScrollView
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {PRODUCTS_CATALOG.map(prod => (
                <TouchableOpacity
                  key={prod.id}
                  style={styles.productListItemCard}
                  onPress={() => handleSelectProduct(prod)}
                  activeOpacity={0.82}
                >
                  {/* Left: Thumbnail Image */}
                  <View
                    style={[
                      styles.productThumbWrap,
                      { backgroundColor: prod.fallbackBg },
                    ]}
                  >
                    <Image
                      source={{ uri: prod.imageUrl }}
                      style={styles.productThumbImage}
                      resizeMode="cover"
                    />
                  </View>

                  {/* Center: Title & Tag Badge */}
                  <View style={styles.productInfoCol}>
                    <Text style={styles.productItemTitle} numberOfLines={2}>
                      {prod.title}
                    </Text>
                    <View style={styles.productTagPill}>
                      <Text style={styles.productTagPillText}>{prod.tag}</Text>
                    </View>
                  </View>

                  {/* Right: Chevron */}
                  <ChevronRightIcon size={18} color="#8F90A6" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4.1: PRODUCT DETAILS POPUP (IDENTICAL TO SUCCESS PAGE POPUP) */}
      {/* ========================================================================= */}
      <Modal
        visible={isProductDetailVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsProductDetailVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsProductDetailVisible(false)}
        >
          <TouchableOpacity
            style={styles.productDetailContainer}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            {/* Top Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header: Title & Close Button */}
            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetTitleCol}>
                <Text style={styles.detailSheetTitle}>
                  {selectedProduct?.title}
                </Text>
                <View style={styles.detailSheetTagPill}>
                  <Text style={styles.detailSheetTagText}>
                    {selectedProduct?.tag}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setIsProductDetailVisible(false)}
                activeOpacity={0.8}
              >
                <XIcon size={14} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {/* Description */}
            <Text style={styles.detailSheetDescription}>
              {selectedProduct?.description}
            </Text>

            {/* Feature Checklist */}
            <View style={styles.checklist}>
              {selectedProduct?.features?.map((feature, idx) => (
                <View key={idx} style={styles.checkItem}>
                  <View style={styles.checkIconWrap}>
                    <CheckIcon size={12} color="#C084FC" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.checkItemText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Book a Demo Button */}
            <TouchableOpacity
              style={styles.bookDemoBtn}
              onPress={handleBookDemo}
              activeOpacity={0.85}
            >
              <Text style={styles.bookDemoBtnText}>Book a Demo</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: ACCOUNT & LOGOUT OPTIONS */}
      {/* ========================================================================= */}
      <Modal
        visible={isAccountModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAccountModalVisible(false)}
      >
        <View style={styles.modalOverlayCentered}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Account Profile</Text>
              <TouchableOpacity onPress={() => setIsAccountModalVisible(false)}>
                <XIcon size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={styles.accountBox}>
              <View style={styles.accountAvatar}>
                <Text style={styles.accountAvatarText}>
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>
                  {user?.name || 'User'}
                </Text>
                <Text style={styles.accountPhone}>
                  {user?.phone || 'Field Rep'}
                </Text>
                <View style={styles.accountBadge}>
                  <SparklesIcon size={12} color="#8B5CF6" />
                  <Text style={styles.accountBadgeText}>
                    Account Active
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={() => {
                setIsAccountModalVisible(false);
                showGuestAlert('Log Out', 'Are you sure you want to log out?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: () => logout(),
                  },
                ]);
              }}
            >
              <LogoutIcon size={16} color="#EF4444" />
              <Text style={styles.logoutBtnText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* ========================================================================= */}
      {/* MODAL 4: WHATSAPP CONFIRMATION & ATTACHMENTS PREVIEW POPUP */}
      {/* ========================================================================= */}
      <Modal
        visible={isWhatsAppConfirmVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsWhatsAppConfirmVisible(false)}
      >
        <TouchableOpacity
          style={styles.confirmModalOverlay}
          activeOpacity={1}
          onPress={() => setIsWhatsAppConfirmVisible(false)}
        >
          <TouchableOpacity
            style={styles.confirmModalSheet}
            activeOpacity={1}
            onPress={e => e.stopPropagation?.()}
          >
            <View style={styles.sheetHandle} />

            {/* Modal Header */}
            <View style={styles.confirmHeaderRow}>
              <View style={styles.confirmHeaderLeft}>
                <View style={styles.whatsappBadgeCircle}>
                  <WhatsAppIcon size={18} color="#22C55E" />
                </View>
                <View>
                  <Text style={styles.confirmModalTitle}>Confirm & Send</Text>
                  <Text style={styles.confirmModalSubtitle}>
                    WhatsApp message for {selectedEvent?.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.confirmCloseBtn}
                onPress={() => setIsWhatsAppConfirmVisible(false)}
                activeOpacity={0.7}
              >
                <XIcon size={14} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView
              style={styles.confirmScrollBody}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Recipient Details Pill */}
              <View style={styles.recipientPill}>
                <Text style={styles.recipientLabel}>Recipient:</Text>
                <Text style={styles.recipientName}>
                  {pendingLeadData?.name}
                </Text>
                {pendingLeadData?.companyName ? (
                  <Text style={styles.recipientCompany}>
                    ({pendingLeadData?.companyName})
                  </Text>
                ) : null}
                <Text style={styles.recipientPhone}>
                  • +91 {pendingLeadData?.cleanPhone}
                </Text>
              </View>

              {/* Message Template Preview Box */}
              <View style={styles.confirmSectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.confirmSectionTitle}>
                    WhatsApp Message Template
                  </Text>
                  <Text style={styles.confirmSectionBadge}>Event Template</Text>
                </View>
                <TextInput
                  style={styles.confirmMessageInput}
                  multiline={true}
                  value={confirmMessage}
                  onChangeText={setConfirmMessage}
                  placeholder="Enter message..."
                  placeholderTextColor="#64748B"
                />
              </View>

              {/* Media Attachment Section (Only attendee selfie is sent as media; event file is shared as link in text) */}
              <View style={styles.confirmSectionBox}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.confirmSectionTitle}>
                    {pendingLeadData?.isSelfieAttached
                      ? 'Attached Attendee Selfie'
                      : 'Media Attachment'}
                  </Text>
                  <Text style={styles.confirmSectionCount}>
                    {pendingLeadData?.isSelfieAttached ? '1 photo' : 'None'}
                  </Text>
                </View>

                {pendingLeadData?.isSelfieAttached &&
                pendingLeadData.attachments &&
                pendingLeadData.attachments.length > 0 ? (
                  <View style={styles.attachmentsList}>
                    {pendingLeadData.attachments.map((att, idx) => {
                      return (
                        <View key={idx} style={styles.attachmentCard}>
                          {att.uri ? (
                            <Image
                              source={{ uri: att.uri }}
                              style={styles.attachmentThumb}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.attachmentIconBox}>
                              <PhotoIcon size={16} color="#A78BFA" />
                            </View>
                          )}
                          <View style={styles.attachmentInfo}>
                            <Text
                              style={styles.attachmentName}
                              numberOfLines={1}
                            >
                              Attendee Selfie
                            </Text>
                            <Text style={styles.attachmentMeta}>
                              Photo ready to share
                            </Text>
                          </View>
                          <View style={styles.attachedCheckBadge}>
                            <CheckIcon size={12} color="#10B981" />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.noAttachmentsBox}>
                    <Text style={styles.noAttachmentsText}>
                      {pendingLeadData?.sharableFileLink
                        ? 'No photo attached. File link is included in message text.'
                        : 'No photo attached. Text message will be sent.'}
                    </Text>
                  </View>
                )}
              </View>
            </KeyboardAwareScrollView>

            {/* Action Buttons */}
            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setIsWhatsAppConfirmVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmCancelBtnText}>Edit Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmProceedBtn}
                onPress={handleConfirmAndSendWhatsApp}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <View style={styles.confirmProceedBtnContent}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.confirmProceedBtnText} numberOfLines={1}>
                      {submittingStatus || 'Opening WhatsApp...'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.confirmProceedBtnContent}>
                    <WhatsAppIcon size={18} color="#FFFFFF" />
                    <Text style={styles.confirmProceedBtnText}>
                      Confirm & Open WhatsApp
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      {/* 1. GUEST TOUR MODAL (4-STEP OVERVIEW - Triggered via Info 'i' Button) */}
      <GuestTourModal
        visible={isTourModalVisible}
        onClose={() => setIsTourModalVisible(false)}
        onComplete={handleTourComplete}
      />

      {/* 2. GUEST ACTIONABLE GUIDANCE (7-STEP COMIC SPEECH-BUBBLE TOUR) */}
      <GuestActionableGuidance
        visible={isActionableGuideVisible}
        onClose={() => setIsActionableGuideVisible(false)}
        targets={guidanceTargets}
        onStepChange={handleGuidanceStepChange}
      />
      {/* ========================================================================= */}
      {/* MODAL: VOICE CAPTURE POPUP (EXACT MATCH TO DESIGN - IMAGE 2) */}
      {/* ========================================================================= */}
      <Modal
        visible={isVoiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseVoiceModal}
      >
        <View style={styles.voiceModalOverlay}>
          <View style={styles.voiceModalSheet}>
            {/* Top Close Button (X in circle) - Hidden during AI Analysis to prevent aborting */}
            {!isVoiceAnalysing && (
              <TouchableOpacity
                style={styles.voiceModalCloseBtn}
                onPress={handleCloseVoiceModal}
                activeOpacity={0.7}
              >
                <XIcon size={14} color="#CBD5E1" />
              </TouchableOpacity>
            )}

            {/* Microphone Area with Audio Waveforms and Glowing Halo */}
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

              {/* Center Mic Button & Glowing Concentric Aura */}
              <View style={styles.voiceModalMicCenter}>
                <Animated.View
                  style={[
                    styles.voiceModalMicGlow,
                    {
                      opacity: glowAnim,
                      transform: [
                        { scale: pulseAnim },
                        { rotate: spin },
                      ],
                    },
                  ]}
                  pointerEvents="none"
                >
                  {/* Purple Glow & Rings (Idle / Countdown / Paused) */}
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
                          id="voiceModalGlow"
                          cx="50%"
                          cy="50%"
                          rx="50%"
                          ry="50%"
                        >
                          <Stop
                            offset="0%"
                            stopColor="#7C3AED"
                            stopOpacity="0.85"
                          />
                          <Stop
                            offset="35%"
                            stopColor="#6D28D9"
                            stopOpacity="0.45"
                          />
                          <Stop
                            offset="65%"
                            stopColor="#4C1D95"
                            stopOpacity="0.2"
                          />
                          <Stop
                            offset="100%"
                            stopColor="#0B0C16"
                            stopOpacity="0"
                          />
                        </RadialGradient>
                      </Defs>
                      {/* Glowing background gradient aura */}
                      <Circle
                        cx="95"
                        cy="95"
                        r="92"
                        fill="url(#voiceModalGlow)"
                      />
                      {/* Concentric aura ripple rings matching Image 2 */}
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
                          id="voiceModalGlowOrange"
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
                      {/* Glowing background gradient aura */}
                      <Circle
                        cx="95"
                        cy="95"
                        r="92"
                        fill="url(#voiceModalGlowOrange)"
                      />
                      {/* Concentric aura ripple rings with complementary orange shades */}
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
                    isVoiceActivelyRecording && styles.voiceModalMicCircleActive,
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
              /* ========================================================= */
              /* STATE: ANALYSING YOUR CONVERSATION (IMAGE 2 POPUP STATE)   */
              /* ========================================================= */
              <View style={styles.analysingContainer}>
                <View style={styles.analysingHeaderBlock}>
                  <Text style={styles.analysingHeading}>
                    Analysing Your Conversation
                  </Text>
                  <Text style={styles.analysingSubtitle}>
                    SalesBuster AI is extracting contact details from your conversation...
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
                            <ActivityIndicator
                              size="small"
                              color="#F97316"
                              style={{ transform: [{ scale: 0.75 }] }}
                            />
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

                {/* Processing Indicator Button */}
                <View style={styles.analysingProgressBtn}>
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.analysingProgressBtnText}>
                    {analysisStep >= 5
                      ? 'Populating Contact Details...'
                      : 'SalesBuster AI Processing...'}
                  </Text>
                </View>
              </View>
            ) : (
              /* ========================================================= */
              /* STATE: LISTENING / PAUSED / COUNTDOWN                     */
              /* ========================================================= */
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
                    <Text style={styles.voiceFinishBtnText}>Finish</Text>
                  </TouchableOpacity>
                </View>

                {/* REAL-TIME TRANSCRIPTION BOX - POSITIONED DIRECTLY ABOVE INSTRUCTIONS */}
                <View style={styles.voiceTranscriptionBox}>
                  <Text style={styles.voiceTranscriptionText} numberOfLines={3}>
                    {liveVoice.interimTranscript ||
                      liveVoice.displayTranscript ||
                      liveVoice.liveTranscript ||
                      '...'}
                  </Text>
                </View>

                {/* INSTRUCTIONS CARD WITH DASHED BORDER (IMAGE 2) */}
                <View style={styles.voiceInstructionsCard}>
                  <View style={styles.instructionsHeaderRow}>
                    <AlertCircleIcon size={16} color="#F59E0B" />
                    <Text style={styles.instructionsHeaderText}>
                      Make sure you mention
                    </Text>
                  </View>

                  <View style={styles.instructionsItemsContainer}>
                    <View style={styles.instructionsItemsRow}>
                      <View style={styles.checkItemWrap}>
                        <CheckIcon size={12} color="#10B981" />
                        <Text style={styles.checkItemText}>Name</Text>
                      </View>
                      <View style={styles.checkItemWrap}>
                        <CheckIcon size={12} color="#10B981" />
                        <Text style={styles.checkItemText}>Company</Text>
                      </View>
                      <View style={styles.checkItemWrap}>
                        <CheckIcon size={12} color="#10B981" />
                        <Text style={styles.checkItemText}>Designation</Text>
                      </View>
                    </View>

                    <View style={styles.instructionsItemsRow}>
                      <View style={styles.checkItemWrap}>
                        <CheckIcon size={12} color="#10B981" />
                        <Text style={styles.checkItemText}>Mobile Number</Text>
                      </View>
                      <View style={styles.checkItemWrap}>
                        <StarIcon size={12} color="#F59E0B" />
                        <Text style={styles.checkItemText}>
                          You can add More Information
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

      {guestAlertModal}
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  guideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 5, 15, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  guideCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: '#17162A',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#363252',
    overflow: 'hidden',
  },
  guideAccent: {
    height: 3,
    backgroundColor: '#8B5CF6',
    marginHorizontal: -22,
    marginTop: -22,
    marginBottom: 18,
  },
  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  guideTitleWrap: { flex: 1 },
  guideEyebrow: {
    color: '#A78BFA',
    fontSize: 10,
    fontFamily: Fonts.family.bold,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  guideTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: Fonts.family.bold,
  },
  guideCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#28263D',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  guideSectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
    marginBottom: 7,
  },
  guideBody: {
    color: '#B9B5CD',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: Fonts.family.regular,
    marginBottom: 10,
  },
  guideEmphasis: {
    color: '#D8B4FE',
    fontFamily: Fonts.family.bold,
  },
  guidePhraseList: {
    backgroundColor: '#211F35',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  guidePhraseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 26,
  },
  guideBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A78BFA',
    marginRight: 10,
  },
  guidePhrase: {
    color: '#E9E6F3',
    fontSize: 13,
    fontFamily: Fonts.family.medium,
  },
  guideDivider: {
    height: 1,
    backgroundColor: '#363252',
    marginVertical: 14,
  },
  guideDoneButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#6D3EC4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  guideDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.bold,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0A1F',
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0A1F',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },

  // 1. TOP BAR
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    position: 'absolute',
    top: -80,
    right: 28,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#211D3B',
    borderWidth: 1,
    borderColor: '#454064',
    zIndex: 5,
  },
  productsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 6,
  },
  productsBtnText: {
    color: '#9F6EFE',
    fontSize: 12,
    fontFamily: Fonts.family.semiBold,
    marginLeft: 6,
  },
  pillActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0A1F',
    borderColor: '#26243A',
    borderWidth: 1.2,
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  pillActionBtnText: {
    color: '#A8A8B2',
    fontSize: 12,
    fontFamily: Fonts.family.semiBold,
    marginLeft: 6,
  },

  // 2. EVENT HEADER
  eventHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  eventTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  eventEditBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1E1B38',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#3B3663',
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: Fonts.family.bold,
    letterSpacing: 0.3,
    maxWidth: 240,
  },
  dropdownCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#232438',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    color: '#8F90A6',
    fontSize: 13,
    fontFamily: Fonts.family.regular,
    marginLeft: 4,
  },

  // 3. VOICE SECTION
  voiceSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -20,
    marginBottom: 20,
    position: 'relative',
  },
  micArea: {
    width: '100%',
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // overflow: 'hidden',
  },
  waveformRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 140,
    zIndex: 1,
  },
  waveGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  waveBar: {
    width: 2,
    borderRadius: 1,
    backgroundColor: '#9B8AFB',
    marginHorizontal: 1.6,
  },
  waveSpacer: {
    width: 78,
  },
  micHaloContainer: {
    position: 'absolute',
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  micButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#120E22',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 3,
  },
  micButtonActive: {
    borderColor: '#C084FC',
    backgroundColor: '#1D1336',
    shadowOpacity: 0.9,
    shadowRadius: 28,
  },
  captureActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
    zIndex: 4,
  },
  capturePill: {
    flexDirection: 'row',
    backgroundColor: '#3C1B70',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  capturePillActive: {
    backgroundColor: '#58259E',
    borderColor: '#C084FC',
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  captureCardPill: {
    flexDirection: 'row',
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.45)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  captureCardPillActive: {
    backgroundColor: '#312E81',
    borderColor: '#A5B4FC',
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  capturePillText: {
    color: '#D8CEFA',
    fontSize: 11,
    fontFamily: Fonts.family.semiBold,
    letterSpacing: 0.3,
    marginLeft: 5,
  },
  captureCardPillText: {
    color: '#E0E7FF',
    fontSize: 11,
    fontFamily: Fonts.family.semiBold,
    letterSpacing: 0.3,
  },
  scanningCardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B4B',
    borderColor: '#818CF8',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  scanningCardBannerTitle: {
    color: '#E0E7FF',
    fontSize: 12,
    fontFamily: Fonts.family.semiBold,
  },
  scanningCardBannerSubtitle: {
    color: '#A5B4FC',
    fontSize: 11,
    fontFamily: Fonts.family.regular,
    marginTop: 2,
  },

  // LIVE STREAM & CELEBRATION BANNERS
  liveStreamBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1435',
    borderColor: '#8B5CF6',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  liveStreamDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  liveStreamText: {
    flex: 1,
    color: '#E9D5FF',
    fontSize: 12,
    fontStyle: 'italic',
  },
  liveStreamBannerWarning: {
    backgroundColor: '#2A1805',
    borderColor: '#F59E0B',
  },
  liveStreamDotWarning: {
    backgroundColor: '#F59E0B',
  },
  liveStreamDotActive: {
    backgroundColor: '#38BDF8',
  },
  liveStreamTextWarning: {
    color: '#FDE68A',
    fontStyle: 'normal',
    fontFamily: Fonts.family.medium,
  },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F291E',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  completeBannerText: {
    color: '#6EE7B7',
    fontSize: 12,
    fontFamily: Fonts.family.medium,
    marginLeft: 6,
  },

  // 4. FORM SECTION
  formSection: {
    marginTop: 2,
  },
  formHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  formHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formSectionTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Fonts.family.semiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  formReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginLeft: 8,
  },
  formReadyBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontFamily: Fonts.family.medium,
    marginLeft: 4,
  },
  formActionButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
  formActionBtnDisabled: {
    opacity: 0.6,
  },
  formPolishBtn: {
    backgroundColor: 'rgba(192, 132, 252, 0.12)',
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  formPolishBtnText: {
    color: '#C084FC',
    fontSize: 11,
    fontFamily: Fonts.family.medium,
    marginLeft: 4,
  },
  formResetBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  formResetBtnText: {
    color: '#F87171',
    fontSize: 11,
    fontFamily: Fonts.family.medium,
    marginLeft: 4,
  },
  noEventModalCard: {
    backgroundColor: '#16172B',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#2E304F',
    alignItems: 'center',
    position: 'relative',
  },
  noEventCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#20223D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noEventIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  noEventTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.family.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  noEventDesc: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: Fonts.family.regular,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  noEventCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '100%',
    marginBottom: 10,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  noEventCreateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
    marginLeft: 8,
  },
  noEventRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  noEventRefreshBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: Fonts.family.medium,
    marginLeft: 6,
  },
  inputCard: {
    backgroundColor: '#1B1C2E',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 18 : 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    position: 'relative',
  },
  cardHeaderSmall: {
    position: 'absolute',
    top: 6,
    right: 12,
    zIndex: 1,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D164D',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiBadgeText: {
    color: '#C084FC',
    fontSize: 9,
    fontFamily: Fonts.family.bold,
    marginLeft: 3,
  },
  textInput: {
    color: '#ADADAD',
    fontSize: 14,
    fontFamily: Fonts.family.regular,
    padding: 0,
    margin: 0,
  },
  phoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  phoneVerifiedBadge: {
    marginLeft: 8,
  },
  summaryCard: {
    minHeight: 110,
    paddingVertical: 14,
  },
  summaryInput: {
    minHeight: 85,
  },

  // 5. SUBMIT BUTTON
  submitButton: {
    backgroundColor: '#8B5CF6',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.family.bold,
  },

  // Account footer link
  accountFooterLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  accountFooterText: {
    color: '#64748B',
    fontSize: 12,
  },
  accountFooterHighlight: {
    color: '#8B5CF6',
    fontFamily: Fonts.family.semiBold,
  },

  // BOTTOM SHEET & MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalOverlayCentered: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  bottomSheetContainer: {
    backgroundColor: '#1E1D36',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#2D2B4A',
  },
  sheetHandle: {
    width: 48,
    height: 4,
    backgroundColor: '#3E3C5B',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetHeaderTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.family.bold,
    letterSpacing: 0.2,
  },
  sheetSubtitle: {
    color: '#8E8CA6',
    fontSize: 13,
    fontFamily: Fonts.family.regular,
    marginTop: 4,
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#32304C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  sheetScroll: {
    maxHeight: 380,
  },
  emptyEventsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: '#24213D',
    borderRadius: 18,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  emptyEventsIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#322554',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyEventsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.family.bold,
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyEventsSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontFamily: Fonts.family.regular,
    textAlign: 'center',
    lineHeight: 18,
  },
  eventItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27253D',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  eventItemCardSelected: {
    backgroundColor: '#281D4C',
    borderColor: '#7C3AED',
  },
  eventItemCheckedCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#6D28D9',
    borderWidth: 1.5,
    borderColor: '#A78BFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  eventItemUncheckedCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#555375',
    backgroundColor: 'transparent',
    marginRight: 14,
  },
  eventItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  eventItemName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.family.bold,
  },
  eventItemNameSelected: {
    color: '#FFFFFF',
  },
  eventItemLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  eventItemLocationText: {
    color: '#8E8CA6',
    fontSize: 12,
    fontFamily: Fonts.family.regular,
    marginLeft: 4,
    flexShrink: 1,
  },
  sheetEventItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetEventEditBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1E1B38',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3B3663',
  },
  sheetNewEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#251A45',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    borderStyle: 'dashed',
    marginTop: 12,
  },
  sheetNewEventBtnText: {
    color: '#A78BFA',
    fontSize: 15,
    fontFamily: Fonts.family.semiBold,
    marginLeft: 8,
  },
  eventItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1B1C2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  eventItemRowSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: '#211E3B',
  },
  eventItemLocation: {
    color: '#8F90A6',
    fontSize: 12,
    marginTop: 2,
  },
  sheetActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    height: 46,
    borderRadius: 12,
    marginTop: 14,
  },
  sheetActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.bold,
    marginLeft: 6,
  },

  // DIALOG STYLES
  dialogCard: {
    backgroundColor: '#16172B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2E304F',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.family.bold,
  },
  dialogInputWrap: {
    marginBottom: 12,
  },
  dialogLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: Fonts.family.bold,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dialogInput: {
    backgroundColor: '#1E1F35',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2F3152',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  dialogSubmitBtn: {
    backgroundColor: '#8B5CF6',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  dialogSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.family.bold,
  },

  // CONTACTS MODAL
  contactsModalContainer: {
    flex: 1,
    backgroundColor: '#0B0C16',
  },
  contactsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2036',
  },
  contactsCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B1C2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsHeaderCenter: {
    alignItems: 'center',
  },
  contactsHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.family.bold,
  },
  contactsHeaderSubtitle: {
    color: '#8B5CF6',
    fontSize: 12,
    fontFamily: Fonts.family.medium,
    marginTop: 2,
  },
  contactsScroll: {
    flex: 1,
  },
  contactItemCard: {
    backgroundColor: '#16172B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#272944',
  },
  contactCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2E1A47',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAvatarText: {
    color: '#C084FC',
    fontSize: 18,
    fontFamily: Fonts.family.bold,
  },
  contactMeta: {
    flex: 1,
  },
  contactItemName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.family.bold,
  },
  contactItemCompany: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  contactItemPhone: {
    color: '#C084FC',
    fontSize: 13,
    marginTop: 2,
  },
  contactSummaryWrap: {
    backgroundColor: '#1E1F35',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  contactSummaryLabel: {
    color: '#64748B',
    fontSize: 10,
    fontFamily: Fonts.family.bold,
    marginBottom: 2,
  },
  contactSummaryText: {
    color: '#E2E8F0',
    fontSize: 13,
  },
  contactActionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  contactCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#201A38',
    borderColor: '#8B5CF6',
    borderWidth: 1,
    height: 38,
    borderRadius: 8,
  },
  contactCallText: {
    color: '#C084FC',
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
    marginLeft: 6,
  },
  contactWhatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    height: 38,
    borderRadius: 8,
  },
  contactWhatsAppText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
    marginLeft: 6,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.family.bold,
    marginTop: 14,
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },

  // PRODUCTS LIST & DETAILS MODAL
  productListItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1936',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.18)',
  },
  productThumbWrap: {
    width: 96,
    height: 62,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1838',
  },
  productThumbImage: {
    width: '100%',
    height: '100%',
  },
  productInfoCol: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
    justifyContent: 'center',
  },
  productItemTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.family.bold,
    lineHeight: 20,
  },
  productTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2E274D',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    marginTop: 6,
  },
  productTagPillText: {
    color: '#BDB3E8',
    fontSize: 11,
    fontFamily: Fonts.family.medium,
  },

  // PRODUCT DETAIL POPUP (MATCHING SUCCESS PAGE)
  productDetailContainer: {
    backgroundColor: '#1E1B33',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    maxHeight: '85%',
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#423C64',
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailSheetTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: Fonts.family.bold,
    marginBottom: 8,
  },
  detailSheetTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2E2650',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailSheetTagText: {
    color: '#B0A3E8',
    fontSize: 11.5,
    fontFamily: Fonts.family.medium,
  },
  detailSheetDescription: {
    color: '#94A3B8',
    fontSize: 13.5,
    lineHeight: 20,
    fontFamily: Fonts.family.regular,
    marginTop: 14,
    marginBottom: 18,
  },
  checklist: {
    marginBottom: 22,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#2B2050',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkItemText: {
    color: '#F1F5F9',
    fontSize: 13.5,
    fontFamily: Fonts.family.medium,
  },
  bookDemoBtn: {
    backgroundColor: '#7C3AED',
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  bookDemoBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.family.bold,
    letterSpacing: 0.2,
  },

  // ACCOUNT MODAL
  accountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2038',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  accountAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.family.bold,
  },
  accountName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.family.bold,
  },
  accountPhone: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  accountBadgeText: {
    color: '#C084FC',
    fontSize: 11,
    fontFamily: Fonts.family.semiBold,
    marginLeft: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D1B28',
    borderColor: '#EF4444',
    borderWidth: 1,
    height: 46,
    borderRadius: 12,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: Fonts.family.bold,
    marginLeft: 8,
  },

  // SAVE AND SEND VIA WHATSAPP BUTTON
  saveSendWhatsAppBtn: {
    backgroundColor: '#7C3AED',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  saveSendWhatsAppBtnDisabled: {
    opacity: 0.65,
  },
  saveSendWhatsAppBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSendWhatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontFamily: Fonts.family.bold,
    letterSpacing: 0.2,
    marginLeft: 8,
  },

  // WHATSAPP CONFIRMATION POPUP MODAL
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  confirmModalSheet: {
    backgroundColor: '#1E1B33',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  confirmHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  confirmHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  whatsappBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  confirmModalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.family.bold,
  },
  confirmModalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Fonts.family.regular,
  },
  confirmCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2E294A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmScrollBody: {
    marginBottom: 16,
  },
  recipientPill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: '#141224',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  recipientLabel: {
    color: '#A78BFA',
    fontSize: 12,
    fontFamily: Fonts.family.semiBold,
    marginRight: 6,
  },
  recipientName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.family.bold,
    marginRight: 4,
  },
  recipientCompany: {
    color: '#CBD5E1',
    fontSize: 12,
    marginRight: 6,
  },
  recipientPhone: {
    color: '#10B981',
    fontSize: 12,
    fontFamily: Fonts.family.medium,
  },
  confirmSectionBox: {
    backgroundColor: '#16142A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  confirmSectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.family.bold,
  },
  confirmSectionBadge: {
    color: '#C084FC',
    fontSize: 11,
    fontFamily: Fonts.family.medium,
    backgroundColor: '#2B1E48',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confirmSectionCount: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: Fonts.family.medium,
  },
  confirmMessageInput: {
    backgroundColor: '#0E0C1B',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D284D',
    color: '#F1F5F9',
    fontSize: 13,
    lineHeight: 18,
    padding: 10,
    minHeight: 76,
    maxHeight: 130,
    textAlignVertical: 'top',
  },
  attachmentsList: {
    gap: 8,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#100E20',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.15)',
  },
  attachmentThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginRight: 10,
  },
  attachmentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#241E3D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentName: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontFamily: Fonts.family.semiBold,
  },
  attachmentMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  attachedCheckBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  noAttachmentsBox: {
    paddingVertical: 10,
  },
  noAttachmentsText: {
    color: '#8F90A6',
    fontSize: 12,
    fontFamily: Fonts.family.regular,
    fontStyle: 'italic',
  },
  confirmActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#262242',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelBtnText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontFamily: Fonts.family.medium,
  },
  confirmProceedBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmProceedBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmProceedBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontFamily: Fonts.family.bold,
    marginLeft: 6,
  },

  // Dual Top Switcher (Networking Hub <-> Sales Agent)
  topSwitcherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0E21',
    borderRadius: 22,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#1D1A3B',
  },
  switcherTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherTabActive: {
    backgroundColor: '#1E193C',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  switcherTabText: {
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
    color: '#6F6A8E',
  },
  switcherTabTextActive: {
    color: '#FFFFFF',
    fontFamily: Fonts.family.bold,
  },

  infoCircleBtn: {
    width: 24,
    height: 24,
    borderRadius: 16,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  captureCardsRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
    marginBottom: 12,
  },
  captureCardBig: {
    flex: 1,
    backgroundColor: '#0B0A1F',
    borderWidth: 1.5,
    borderColor: '#26243A',
    borderRadius: 24,
    paddingVertical: 21,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 102,
  },
  captureCardBigTitle: {
    color: '#CBD5E1',
    fontSize: 12,
    fontFamily: Fonts.family.semiBold,
    marginTop: 14,
    letterSpacing: 0.2,
  },
  unsavedWarningText: {
    color: '#EF4444',
    fontSize: 12.5,
    fontFamily: Fonts.family.medium,
    marginTop: -4,
    marginBottom: 10,
    paddingHorizontal: 2,
    letterSpacing: 0.1,
  },
  selfieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  selfieLabelContainer: {
    flex: 1,
  },
  selfieLabel: {
    color: '#ADADAD',
    fontSize: 14,
    fontFamily: Fonts.family.regular,
  },
  selfieOptional: {
    color: '#64748B',
    fontStyle: 'italic',
    fontSize: 12,
  },
  selfieActionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selfieClearBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfieCaptureBtn: {
    backgroundColor: '#2E344E',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selfieCapturedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selfieThumb: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 6,
  },
  selfieCaptureBtnText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontFamily: Fonts.family.medium,
  },
  bottomActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    marginBottom: 20,
  },
  bottomResetBtn: {
    flex: 1,
    backgroundColor: '#121327',
    borderWidth: 1,
    borderColor: '#382D67',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomResetBtnText: {
    color: '#A855F7',
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
  },
  bottomSaveBtn: {
    flex: 2.3,
    backgroundColor: '#7C3AED',
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
    }),
  },
  bottomSaveBtnDisabled: {
    opacity: 0.6,
  },
  bottomSaveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontFamily: Fonts.family.bold,
    fontWeight: '700',
    marginRight: 9,
  },
  bottomSaveBtnWaWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 16, 0.85)',
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
    // justifyContent: 'flex-end',
    overflow: 'hidden',
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
    justifyContent: 'center',
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
    backgroundColor: '#7C3AED',
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
    marginBottom: 10,
  },
  instructionsHeaderText: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontFamily: Fonts.family.semiBold,
    marginLeft: 6,
  },
  instructionsItemsContainer: {
    gap: 8,
  },
  instructionsItemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  checkItemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkItemText: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontFamily: Fonts.family.regular,
    marginLeft: 4,
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
});

export default GuestHomeScreen;
