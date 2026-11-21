import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Image,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Circle, Path } from 'react-native-svg';
import Text from '../../components/common/AppText';
import BrandGradientBackground from '../../components/common/BrandGradientBackground';
import { Fonts } from '../../styles/Fonts';
import { Colors } from '../../styles/Colors';
import {
  CheckIcon,
  ChevronRightIcon,
  XIcon,
  PlayIcon,
} from '../../icons/Icons';
import { InlineVideoPlayer } from '../../components/common/InlineVideoPlayer';
import { eventService } from '../../services/api/eventService';
import { getFullMediaUrl } from '../../utils/constants';

// Default service cards definitions fallback
const DEFAULT_SERVICES = [
  {
    id: 'bi_analyst',
    title: 'BI Analyst',
    tag: 'Analytics',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=400&q=80',
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
    tag: 'Cloud API',
    imageUrl: 'https://images.unsplash.com/photo-1611746872915-64382b5c76da?w=400&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&q=80',
    fallbackBg: '#162338',
    description:
      'Launch high-conversion broadcast campaigns, promotional announcements, and contact follow-up reminders with enterprise-grade deliverability.',
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
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=400&q=80',
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

export const LeadCaptureSuccessScreen = ({ navigation, route }) => {
  const {
    name = 'Attendee',
    eventName = 'this category',
    phone,
    messageText,
  } = route?.params || {};

  // Selected service for the bottom sheet modal
  const [selectedService, setSelectedService] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [servicesList, setServicesList] = useState(DEFAULT_SERVICES);

  // Helper to resolve image URI from backend upload or external URL
  const resolveServiceImageUri = (imgUrl) => {
    if (!imgUrl || typeof imgUrl !== 'string') return '';
    if (imgUrl.startsWith('/uploads/')) {
      return getFullMediaUrl(imgUrl);
    }
    return imgUrl;
  };

  const isServiceVideo = (item) => {
    if (!item) return false;
    if (item.videoUrl) return true;
    if (item.hasVideo) return true;
    if (item.mediaType === 'video') return true;
    const url = item.videoUrl || item.mediaUrl || '';
    return /\.(mp4|webm|mov|mkv|avi|m3u8)(\?.*)?$/i.test(url);
  };

  // Fetch dynamic showcase services from Super Admin
  useEffect(() => {
    let isMounted = true;
    const fetchServices = async () => {
      try {
        const res = await eventService.getShowcaseServices();
        if (isMounted && res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setServicesList(res.data);
        }
      } catch (err) {
        // Fallback to DEFAULT_SERVICES
      }
    };
    fetchServices();
    return () => {
      isMounted = false;
    };
  }, []);

  // Success badge pulse & aura animation
  const glowAnim = useRef(new Animated.Value(0.75)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1.0,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.65,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const handleBackToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  const handleServicePress = (service) => {
    setSelectedService(service);
    setModalVisible(true);
  };

  const handleBookDemo = () => {
    const calendlyUrl = 'https://calendly.com/team-salesbuster/30min?month=2026-11';
    setModalVisible(false);

    Linking.openURL(calendlyUrl).catch(err => {
      console.warn('Error opening Calendly demo link:', err);
      Alert.alert(
        'Open Link Failed',
        'Could not open browser. Please visit https://calendly.com/team-salesbuster/30min?month=2026-11 to schedule your demo.'
      );
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0918" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. TOP SUCCESS BADGE WITH GLOWING HALO - EXACT MATCH */}
        <View style={styles.badgeSection}>
          <Animated.View
            style={[
              styles.badgeContainer,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Luminous Multi-stop Corona & Radial Glow Layer */}
            <Animated.View
              style={[
                styles.glowLayer,
                {
                  opacity: glowAnim,
                },
              ]}
              pointerEvents="none"
            >
              <Svg width={280} height={280} viewBox="0 0 280 280">
                <Defs>
                  <RadialGradient id="successCoronaGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#4338CA" stopOpacity="0.8" />
                    <Stop offset="34%" stopColor="#4F46E5" stopOpacity="0.95" />
                    <Stop offset="44%" stopColor="#607AFB" stopOpacity="0.85" />
                    <Stop offset="55%" stopColor="#7C3AED" stopOpacity="0.65" />
                    <Stop offset="68%" stopColor="#6D28D9" stopOpacity="0.35" />
                    <Stop offset="82%" stopColor="#3B0764" stopOpacity="0.14" />
                    <Stop offset="94%" stopColor="#1E1B4B" stopOpacity="0.04" />
                    <Stop offset="100%" stopColor="#0A0918" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx="140" cy="140" r="140" fill="url(#successCoronaGlow)" />
              </Svg>
            </Animated.View>

            {/* Central Dark Disc */}
            <View style={styles.centralDarkCircle}>
              {/* Bold Geometry White Checkmark */}
              <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
                <Path
                  d="M15 31.5 L28 44.5 L49 23.5"
                  stroke="#FFFFFF"
                  strokeWidth={9.5}
                  strokeLinecap="butt"
                  strokeLinejoin="bevel"
                />
              </Svg>
            </View>
          </Animated.View>

          {/* Titles */}
          <Text style={styles.title}>Saved Successfully</Text>
          <Text style={styles.subtitle}>
            {name} has been added to the {eventName} contact category.
          </Text>
        </View>

        {/* 2. BACK TO HOME BUTTON */}
        <TouchableOpacity
          style={styles.backHomeBtn}
          onPress={handleBackToHome}
          activeOpacity={0.85}
        >
          <BrandGradientBackground id="success_back_home_grad" borderRadius={18} />
          <Text style={styles.backHomeBtnText}>Back to Home</Text>
        </TouchableOpacity>

        {/* 3. EXPLORE OUR SERVICES SECTION */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionHeading}>Explore Our Services</Text>

          {/* 2-Column Grid */}
          <View style={styles.gridContainer}>
            {servicesList.map((item) => {
              const isVideo = isServiceVideo(item);
              const imageSourceUri = resolveServiceImageUri(
                item.bannerImageUrl || (!isVideo ? item.imageUrl : '') || item.imageUrl || item.mediaUrl
              );
              return (
                <TouchableOpacity
                  key={item.id || item._id || item.serviceKey}
                  style={styles.card}
                  onPress={() => handleServicePress(item)}
                  activeOpacity={0.82}
                >
                  {/* Clean Image / Video Banner */}
                  <View style={[styles.imageWrap, { backgroundColor: item.fallbackBg || '#1A1838' }]}>
                    {imageSourceUri ? (
                      <Image
                        source={{ uri: imageSourceUri }}
                        style={styles.cardImage}
                        resizeMode="cover"
                      />
                    ) : null}
                    {isVideo && (
                      <View style={styles.videoBadgeOverlay}>
                        <PlayIcon size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  {/* Card Title */}
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>

                  {/* Bottom Row: Pill Tag + Subtle Chevron */}
                  <View style={styles.cardFooter}>
                    <View style={styles.tagRow}>
                      <View style={styles.tagPill}>
                        <Text style={styles.tagText}>{item.tag || 'Analytics'}</Text>
                      </View>
                      {isVideo && (
                        <View style={styles.videoPill}>
                          <Text style={styles.videoPillText}>Video</Text>
                        </View>
                      )}
                    </View>
                    <ChevronRightIcon size={14} color="#8F90A6" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* 4. SERVICE DETAILS BOTTOM SHEET MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.sheetContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation?.()}
          >
            {/* Top Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header: Title & Close Button */}
            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetTitleCol}>
                <Text style={styles.sheetTitle}>{selectedService?.title}</Text>
                <View style={styles.tagRow}>
                  <View style={styles.sheetTagPill}>
                    <Text style={styles.sheetTagText}>{selectedService?.tag}</Text>
                  </View>
                  
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <XIcon size={14} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            {/* Inline Video Player or Banner Image inside the service banner */}
            {isServiceVideo(selectedService) ? (
              <InlineVideoPlayer
                videoUrl={resolveServiceImageUri(
                  selectedService?.videoUrl || selectedService?.mediaUrl
                )}
                posterUrl={resolveServiceImageUri(
                  selectedService?.bannerImageUrl || (!isServiceVideo(selectedService) ? selectedService?.imageUrl : '') || selectedService?.imageUrl
                )}
                fallbackBg={selectedService?.fallbackBg || '#1A1838'}
                title={selectedService?.title || 'Service Video'}
                containerStyle={styles.videoModalBanner}
              />
            ) : (
              (selectedService?.bannerImageUrl || selectedService?.imageUrl) ? (
                <View style={styles.videoModalBanner}>
                  <Image
                    source={{
                      uri: resolveServiceImageUri(
                        selectedService?.bannerImageUrl || selectedService?.imageUrl
                      ),
                    }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                  />
                </View>
              ) : null
            )}

            {/* Description */}
            <Text style={styles.sheetDescription}>{selectedService?.description}</Text>

            {/* Feature Checklist */}
            <View style={styles.checklist}>
              {selectedService?.features?.map((feature, idx) => (
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
              <BrandGradientBackground id="success_book_demo_grad" borderRadius={18} />
              <Text style={styles.bookDemoBtnText}>Book a Demo</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A0918',
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0918',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },

  // BADGE SECTION
  badgeSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  badgeContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  glowLayer: {
    position: 'absolute',
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centralDarkCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#0C0B1B',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: Fonts.family.bold,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: '#8F90A6',
    fontSize: 13.5,
    fontFamily: Fonts.family.regular,
    textAlign: 'center',
  },

  // BACK TO HOME BUTTON
  backHomeBtn: {
    backgroundColor: '#4013C7',
    overflow: 'hidden',
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#4013C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  backHomeBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.family.bold,
    letterSpacing: 0.2,
  },

  // SERVICES SECTION
  servicesSection: {
    marginTop: 4,
  },
  sectionHeading: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.family.bold,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#151327',
    borderRadius: 16,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.12)',
  },
  imageWrap: {
    width: '100%',
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontFamily: Fonts.family.bold,
    lineHeight: 18,
    minHeight: 36,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoBadgeOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  videoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    gap: 3,
  },
  videoPillText: {
    color: '#DDD6FE',
    fontSize: 10,
    fontFamily: Fonts.family.bold,
  },
  videoModalBanner: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: '#0F0E1E',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  videoModalBannerImg: {
    width: '100%',
    height: '100%',
  },
  videoModalOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoPlayCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  videoPlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.family.bold,
  },
  tagPill: {
    backgroundColor: '#231D3B',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
  },
  tagText: {
    color: '#A49ACD',
    fontSize: 11,
    fontFamily: Fonts.family.medium,
  },

  // SERVICE DETAILS BOTTOM SHEET
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#1E1B33',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#423C64',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sheetTitleCol: {
    flex: 1,
    marginRight: 12,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: Fonts.family.bold,
    marginBottom: 8,
  },
  sheetTagPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2E2650',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sheetTagText: {
    color: '#B0A3E8',
    fontSize: 11.5,
    fontFamily: Fonts.family.medium,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2E294A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDescription: {
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
    backgroundColor: '#4013C7',
    overflow: 'hidden',
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4013C7',
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
});

export default LeadCaptureSuccessScreen;
