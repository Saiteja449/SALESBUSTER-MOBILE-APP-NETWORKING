import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Easing,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import Text from '../../components/common/AppText';
import {
  USER_ROLE_KEYS,
  getPermissionSetupKey,
  getPermissionsForRole,
} from '../../config/rolePermissions';
import { useAuth } from '../../context/AuthContext';
import {
  BellIcon,
  CameraIcon,
  CheckIcon,
  ContactsIcon,
  MicIcon,
  ShieldCheckIcon,
  ZapIcon,
} from '../../icons/Icons';
import {
  PERMISSION_STATUS,
  checkPermissionsBatch,
  openAppSettings,
  requestPermissionById,
} from '../../services/PermissionService';
import { Fonts } from '../../styles/Fonts';
import { Spacing } from '../../styles/Spacing';
import { SalesBusterLogo } from '../../components/common/BrandLogo';

const PALETTE = {
  bgDeep: 'rgba(4, 5, 15, 1)',
  bgStatusBar: '#04050F',
  cardBg: '#17162A',
  cardGrantedBg: 'rgba(23, 22, 42, 0.96)',
  cardBorder: '#363252',
  cardGrantedBorder: 'rgba(52, 211, 153, 0.4)',
  cardBlockedBorder: 'rgba(248, 113, 113, 0.42)',
  electricBlue: '#7C3AED',
  electricBlueBright: '#A78BFA',
  orangeAccent: '#A855F7',
  orangeSoft: '#C4B5FD',
  emerald: '#34D399',
  amber: '#FBBF24',
  coral: '#F87171',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
};

const renderPermissionIcon = (iconKey, color) => {
  switch (iconKey) {
    case 'notifications':
      return <BellIcon size={20} color={color} />;
    case 'microphone':
      return <MicIcon size={20} color={color} />;
    case 'contacts':
      return <ContactsIcon size={20} color={color} />;
    case 'camera':
      return <CameraIcon size={20} color={color} />;
    case 'background':
      return <ZapIcon size={20} color={color} />;
    default:
      return <ShieldCheckIcon size={20} color={color} />;
  }
};

const getStatusMeta = (status) => {
  switch (status) {
    case PERMISSION_STATUS.GRANTED:
      return {
        label: 'Enabled',
        color: PALETTE.emerald,
        bg: 'rgba(16, 185, 129, 0.14)',
        border: 'rgba(52, 211, 153, 0.3)',
      };
    case PERMISSION_STATUS.BLOCKED:
      return {
        label: 'Blocked',
        color: PALETTE.coral,
        bg: 'rgba(239, 68, 68, 0.14)',
        border: 'rgba(248, 113, 113, 0.35)',
      };
    case PERMISSION_STATUS.UNAVAILABLE:
      return {
        label: 'Unavailable',
        color: PALETTE.textMuted,
        bg: 'rgba(100, 116, 139, 0.14)',
        border: 'rgba(100, 116, 139, 0.25)',
      };
    case PERMISSION_STATUS.DENIED:
    default:
      return {
        label: 'Pending',
        color: PALETTE.textSecondary,
        bg: 'rgba(148, 163, 184, 0.12)',
        border: 'rgba(148, 163, 184, 0.22)',
      };
  }
};

const PermissionSetupScreen = ({
  onComplete,
  onClose,
  isModal = false,
  navigation,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = height < 700 || width < 360;

  const { roleKey, roleLabel, permissions } = useMemo(
    () => getPermissionsForRole(user),
    [user],
  );

  const permissionIds = useMemo(
    () => permissions.map((item) => item.id),
    [permissions],
  );

  const [statuses, setStatuses] = useState({});
  const [hasAttemptedMap, setHasAttemptedMap] = useState({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [requestingId, setRequestingId] = useState(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isAllowingAll, setIsAllowingAll] = useState(false);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(12)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const refreshStatuses = useCallback(async () => {
    try {
      const next = await checkPermissionsBatch(permissionIds, statuses);
      setStatuses(next);
    } catch (error) {
      console.warn('Failed to refresh permission statuses:', error);
    } finally {
      setIsInitialLoading(false);
    }
  }, [permissionIds, statuses]);

  useEffect(() => {
    let isMounted = true;

    const loadInitial = async () => {
      try {
        const next = await checkPermissionsBatch(permissionIds);
        if (isMounted) {
          setStatuses(next);
        }
      } catch (error) {
        console.warn('Initial permission check failed:', error);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    loadInitial();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshStatuses();
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, [permissionIds]);

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, [contentOpacity, contentTranslateY]);

  const handleEnablePermission = async (item) => {
    if (requestingId || isContinuing) return;

    const current = statuses[item.id];
    if (current === PERMISSION_STATUS.GRANTED) return;

    setRequestingId(item.id);
    try {
      if (current === PERMISSION_STATUS.BLOCKED) {
        await openAppSettings();
        return;
      }

      const result = await requestPermissionById(item.id, current);
      setHasAttemptedMap((prev) => ({ ...prev, [item.id]: true }));
      setStatuses((prev) => ({ ...prev, [item.id]: result }));
    } finally {
      setRequestingId(null);
    }
  };

  const handleContinue = async () => {
    if (isContinuing) return;
    setIsContinuing(true);

    try {
      await AsyncStorage.setItem(getPermissionSetupKey(user), 'true');
    } catch (error) {
      console.warn('Failed to persist permission setup completion:', error);
    }

    try {
      if (onComplete) {
        onComplete();
      }
      if (isModal) {
        if (onClose) {
          onClose();
        } else if (navigation?.canGoBack?.()) {
          navigation.goBack();
        }
      } else {
        if (navigation?.replace) {
          navigation.replace('Main');
        } else if (navigation?.navigate) {
          navigation.navigate('Main');
        }
      }
    } catch (navError) {
      console.warn('Navigation error in handleContinue:', navError);
    } finally {
      setIsContinuing(false);
    }
  };

  const handleAllowAll = async () => {
    if (isAllowingAll || isContinuing) return;
    setIsAllowingAll(true);
    try {
      const pendingList = permissions.filter(
        (p) =>
          statuses[p.id] !== PERMISSION_STATUS.GRANTED &&
          statuses[p.id] !== PERMISSION_STATUS.UNAVAILABLE
      );

      for (const item of pendingList) {
        const current = statuses[item.id] || PERMISSION_STATUS.DENIED;
        if (current === PERMISSION_STATUS.BLOCKED) {
          continue;
        }
        setRequestingId(item.id);
        const result = await requestPermissionById(item.id, current);
        setHasAttemptedMap((prev) => ({ ...prev, [item.id]: true }));
        setStatuses((prev) => ({ ...prev, [item.id]: result }));
      }
    } finally {
      setRequestingId(null);
      setIsAllowingAll(false);
      await refreshAllStatuses();
    }
  };

  const enabledCount = permissions.filter(
    (p) => statuses[p.id] === PERMISSION_STATUS.GRANTED,
  ).length;
  const totalCount = permissions.length;
  const progressPercent =
    totalCount > 0 ? Math.round((enabledCount / totalCount) * 100) : 100;

  const missingRequiredCount = permissions.filter(
    (p) => p.required && statuses[p.id] !== PERMISSION_STATUS.GRANTED,
  ).length;

  const allPermissionsGranted =
    totalCount > 0 &&
    permissions.every(
      (p) =>
        statuses[p.id] === PERMISSION_STATUS.GRANTED ||
        statuses[p.id] === PERMISSION_STATUS.UNAVAILABLE
    );

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PALETTE.bgStatusBar}
      />

      {/* Guest-matched dark backdrop & soft purple radial glow */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="permTopGlow" cx="50%" cy="10%" r="48%">
              <Stop offset="0" stopColor="#8B5CF6" stopOpacity="0.26" />
              <Stop offset="0.6" stopColor="#6D28D9" stopOpacity="0.09" />
              <Stop offset="1" stopColor="#04050F" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={width}
            height={height}
            fill="url(#permTopGlow)"
          />
        </Svg>
      </View>

      <Animated.View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top + 12, 20),
            paddingBottom: Math.max(insets.bottom + 14, 20),
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.logoBadge}>
              <SalesBusterLogo width={100} height={24} />
            </View>

            <View style={styles.headerRight}>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{roleLabel}</Text>
              </View>
              {isModal && onClose && (
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Text style={[styles.title, isCompact && styles.titleCompact]}>
            Set Up Your SalesBuster
          </Text>
          <Text style={styles.subtitle}>
            Enable permissions for seamless event lead capture, live AI voice, and visiting card scanning.
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressText}>
                {enabledCount} of {totalCount} permissions enabled
              </Text>
              <Text style={styles.progressPercent}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>
          </View>
        </View>

        {/* Permission Cards List */}
        {isInitialLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator
              size="large"
              color={PALETTE.electricBlueBright}
            />
            <Text style={styles.loadingStateText}>
              Checking device permissions...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Prominent Play Store Transparency & Privacy Notice */}
            <View style={styles.privacyNoticeCard}>
              <View style={styles.privacyNoticeHeader}>
                <ShieldCheckIcon size={18} color="#34D399" />
                <Text style={styles.privacyNoticeTitle}>
                  Play Store Privacy & Data Transparency
                </Text>
              </View>
              <Text style={styles.privacyNoticeDesc}>
                SalesBuster accesses device permissions strictly to power on-demand event lead capture requested by you. Voice and camera are only active while you actively record or take a photo. Your data stays securely in your private workspace and is never sold or shared with third-party advertisers.
              </Text>
            </View>

            {permissions.map((item) => {
              const status = statuses[item.id] || PERMISSION_STATUS.DENIED;
              const isGranted = status === PERMISSION_STATUS.GRANTED;
              const isBlocked = status === PERMISSION_STATUS.BLOCKED;
              const isUnavailable = status === PERMISSION_STATUS.UNAVAILABLE;
              const wasAttemptedAndDenied =
                hasAttemptedMap[item.id] && status === PERMISSION_STATUS.DENIED;

              const statusMeta = isGranted
                ? getStatusMeta(PERMISSION_STATUS.GRANTED)
                : isBlocked
                ? getStatusMeta(PERMISSION_STATUS.BLOCKED)
                : isUnavailable
                ? getStatusMeta(PERMISSION_STATUS.UNAVAILABLE)
                : wasAttemptedAndDenied
                ? {
                    label: 'Denied',
                    color: PALETTE.amber,
                    bg: 'rgba(251, 191, 36, 0.14)',
                    border: 'rgba(251, 191, 36, 0.3)',
                  }
                : getStatusMeta(PERMISSION_STATUS.DENIED);

              const iconColor = isGranted
                ? PALETTE.emerald
                : isBlocked
                ? PALETTE.coral
                : PALETTE.electricBlueBright;

              const isBusy = requestingId === item.id;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    isGranted && styles.cardGranted,
                    isBlocked && styles.cardBlocked,
                  ]}
                >
                  <View style={styles.cardTopRow}>
                    <View
                      style={[
                        styles.cardIconBox,
                        isGranted && styles.cardIconBoxGranted,
                      ]}
                    >
                      {renderPermissionIcon(item.icon, iconColor)}
                    </View>

                    <View style={styles.cardTitleBlock}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <View
                          style={[
                            styles.reqBadge,
                            item.required
                              ? styles.reqBadgeRequired
                              : styles.reqBadgeOptional,
                          ]}
                        >
                          <Text
                            style={[
                              styles.reqBadgeText,
                              item.required
                                ? styles.reqBadgeTextRequired
                                : styles.reqBadgeTextOptional,
                            ]}
                          >
                            {item.required ? 'Required' : 'Optional'}
                          </Text>
                        </View>
                      </View>
                      {item.usageTag ? (
                        <Text style={styles.cardUsageTag}>• {item.usageTag}</Text>
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: statusMeta.bg,
                          borderColor: statusMeta.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: statusMeta.color },
                        ]}
                      >
                        {statusMeta.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardDescription}>{item.description}</Text>

                  {(isBlocked || wasAttemptedAndDenied) && (
                    <Text style={styles.helperNotice}>
                      {isBlocked
                        ? 'Permission was permanently denied. Open Settings to enable it manually.'
                        : item.required
                        ? 'This feature cannot run fully until this permission is enabled.'
                        : 'You can enable this now or skip and turn it on later.'}
                    </Text>
                  )}

                  <View style={styles.cardFooter}>
                    {isGranted ? (
                      <View style={styles.enabledBadgeRow}>
                        <CheckIcon size={16} color={PALETTE.emerald} />
                        <Text style={styles.enabledConfirmText}>
                          Confirmed by device
                        </Text>
                      </View>
                    ) : isUnavailable ? (
                      <Text style={styles.unavailableText}>
                        Not required on this device
                      </Text>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.enableBtn,
                          isBlocked && styles.settingsBtn,
                        ]}
                        onPress={() => handleEnablePermission(item)}
                        disabled={Boolean(requestingId) || isContinuing}
                        activeOpacity={0.8}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.enableBtnText}>
                            {isBlocked
                              ? 'Open Settings'
                              : wasAttemptedAndDenied
                              ? 'Try Again'
                              : 'Enable'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Bottom CTA */}
        <View style={styles.footer}>
          {missingRequiredCount > 0 && !isInitialLoading && (
            <Text style={styles.missingRequiredNote}>
              {missingRequiredCount} required{' '}
              {missingRequiredCount === 1 ? 'permission is' : 'permissions are'}{' '}
              still pending — some features may be limited until enabled.
            </Text>
          )}

          {allPermissionsGranted ? (
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                onPress={handleContinue}
                onPressIn={() =>
                  Animated.spring(buttonScale, {
                    toValue: 0.975,
                    useNativeDriver: true,
                  }).start()
                }
                onPressOut={() =>
                  Animated.spring(buttonScale, {
                    toValue: 1,
                    friction: 6,
                    useNativeDriver: true,
                  }).start()
                }
                disabled={isContinuing}
                activeOpacity={0.85}
                style={[
                  styles.continueBtn,
                  isContinuing && styles.continueBtnDisabled,
                ]}
              >
                {isContinuing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.continueBtnText}>
                    Continue to SalesBuster
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={styles.dualButtonRow}>
              {/* Skip for now */}
              <TouchableOpacity
                onPress={handleContinue}
                disabled={isContinuing || isAllowingAll}
                activeOpacity={0.8}
                style={styles.skipBtn}
              >
                <Text style={styles.skipBtnText}>Skip for now</Text>
              </TouchableOpacity>

              {/* Allow all */}
              <TouchableOpacity
                onPress={handleAllowAll}
                disabled={isContinuing || isAllowingAll}
                activeOpacity={0.85}
                style={[
                  styles.allowAllBtn,
                  isAllowingAll && styles.allowAllBtnDisabled,
                ]}
              >
                {isAllowingAll ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.allowAllBtnText}>Allow all</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.footerHint}>
            You can update permissions anytime in your device settings.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PALETTE.bgDeep,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  logoBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    width: 120,
    height: 40,
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    backgroundColor: 'rgba(23, 22, 42, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(221, 214, 254, 0.38)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  rolePillText: {
    fontSize: 11.5,
    fontFamily: Fonts.family.semiBold,
    color: PALETTE.orangeSoft,
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(148, 163, 184, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: PALETTE.textPrimary,
    fontSize: 14,
    fontFamily: Fonts.family.bold,
  },
  title: {
    fontSize: 25,
    fontFamily: Fonts.family.extraBold,
    color: PALETTE.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  titleCompact: {
    fontSize: 22,
  },
  subtitle: {
    fontSize: 13.5,
    fontFamily: Fonts.family.regular,
    color: PALETTE.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  progressSection: {
    backgroundColor: 'rgba(13, 25, 51, 0.72)',
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    borderRadius: 14,
    padding: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12.5,
    fontFamily: Fonts.family.semiBold,
    color: PALETTE.textPrimary,
  },
  progressPercent: {
    fontSize: 12.5,
    fontFamily: Fonts.family.bold,
    color: PALETTE.electricBlueBright,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: PALETTE.electricBlueBright,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingStateText: {
    fontSize: 14,
    fontFamily: Fonts.family.medium,
    color: PALETTE.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 4,
    paddingBottom: 12,
    gap: 12,
  },
  privacyNoticeCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.28)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 4,
  },
  privacyNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  privacyNoticeTitle: {
    fontSize: 13,
    fontFamily: Fonts.family.bold,
    color: '#34D399',
  },
  privacyNoticeDesc: {
    fontSize: 12,
    fontFamily: Fonts.family.regular,
    color: '#CBD5E1',
    lineHeight: 17,
  },
  card: {
    backgroundColor: PALETTE.cardBg,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    borderRadius: 18,
    padding: 15,
  },
  cardGranted: {
    backgroundColor: PALETTE.cardGrantedBg,
    borderColor: PALETTE.cardGrantedBorder,
  },
  cardBlocked: {
    borderColor: PALETTE.cardBlockedBorder,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(29, 99, 235, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIconBoxGranted: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(52, 211, 153, 0.28)',
  },
  cardTitleBlock: {
    flex: 1,
    marginRight: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: Fonts.family.bold,
    color: PALETTE.textPrimary,
  },
  cardUsageTag: {
    fontSize: 11,
    fontFamily: Fonts.family.medium,
    color: PALETTE.orangeSoft,
    marginTop: 2,
  },
  reqBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  reqBadgeRequired: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  reqBadgeOptional: {
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
  },
  reqBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.family.semiBold,
    letterSpacing: 0.3,
  },
  reqBadgeTextRequired: {
    color: PALETTE.orangeSoft,
  },
  reqBadgeTextOptional: {
    color: PALETTE.textSecondary,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: Fonts.family.semiBold,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: Fonts.family.regular,
    color: PALETTE.textSecondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  helperNotice: {
    fontSize: 12,
    fontFamily: Fonts.family.medium,
    color: PALETTE.amber,
    lineHeight: 17,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  enabledBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  enabledConfirmText: {
    fontSize: 12.5,
    fontFamily: Fonts.family.semiBold,
    color: PALETTE.emerald,
  },
  unavailableText: {
    fontSize: 12,
    fontFamily: Fonts.family.medium,
    color: PALETTE.textMuted,
  },
  enableBtn: {
    backgroundColor: PALETTE.electricBlue,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsBtn: {
    backgroundColor: 'rgba(249, 115, 22, 0.85)',
  },
  enableBtnText: {
    fontSize: 13,
    fontFamily: Fonts.family.bold,
    color: '#FFFFFF',
  },
  footer: {
    paddingTop: 10,
  },
  missingRequiredNote: {
    fontSize: 11.5,
    fontFamily: Fonts.family.medium,
    color: PALETTE.orangeSoft,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 16,
  },
  continueBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    borderWidth: 1,
    borderColor: 'rgba(221, 214, 254, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#2E087A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  continueBtnDisabled: {
    opacity: 0.72,
  },
  continueBtnText: {
    fontSize: 15.5,
    fontFamily: Fonts.family.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  dualButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skipBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1C1A36',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 14.5,
    fontFamily: Fonts.family.bold,
    color: '#94A3B8',
  },
  allowAllBtn: {
    flex: 1.3,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    borderWidth: 1,
    borderColor: 'rgba(221, 214, 254, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#2E087A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  allowAllBtnDisabled: {
    opacity: 0.72,
  },
  allowAllBtnText: {
    fontSize: 15,
    fontFamily: Fonts.family.bold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  footerHint: {
    fontSize: 11.5,
    fontFamily: Fonts.family.regular,
    color: PALETTE.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default PermissionSetupScreen;
