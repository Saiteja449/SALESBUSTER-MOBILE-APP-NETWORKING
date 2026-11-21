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
import Text from '../../components/common/AppText';
import BrandGradientBackground from '../../components/common/BrandGradientBackground';
import {
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
  XIcon,
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

const PALETTE = {
  bgDeep: '#0A0D14',
  bgStatusBar: '#0A0D14',
  cardBg: '#111827',
  cardBorder: 'rgba(255, 255, 255, 0.06)',
  cardGrantedBorder: 'rgba(16, 185, 129, 0.28)',
  cardBlockedBorder: 'rgba(239, 68, 68, 0.3)',
  purpleAccent: '#8B5CF6',
  purpleBright: '#A78BFA',
  emerald: '#10B981',
  amber: '#F59E0B',
  coral: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
};

const renderPermissionIcon = (iconKey, color) => {
  switch (iconKey) {
    case 'notifications':
      return <BellIcon size={18} color={color} />;
    case 'microphone':
      return <MicIcon size={18} color={color} />;
    case 'contacts':
      return <ContactsIcon size={18} color={color} />;
    case 'camera':
      return <CameraIcon size={18} color={color} />;
    case 'background':
      return <ZapIcon size={18} color={color} />;
    default:
      return <ShieldCheckIcon size={18} color={color} />;
  }
};

const getStatusMeta = status => {
  switch (status) {
    case PERMISSION_STATUS.GRANTED:
      return {
        label: 'Enabled',
        color: PALETTE.emerald,
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.25)',
      };
    case PERMISSION_STATUS.BLOCKED:
      return {
        label: 'Not enabled',
        color: PALETTE.coral,
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.25)',
      };
    case PERMISSION_STATUS.UNAVAILABLE:
      return {
        label: 'Unavailable',
        color: PALETTE.textMuted,
        bg: 'rgba(100, 116, 139, 0.12)',
        border: 'rgba(100, 116, 139, 0.2)',
      };
    case PERMISSION_STATUS.DENIED:
    default:
      return {
        label: 'Not enabled',
        color: PALETTE.textSecondary,
        bg: 'rgba(148, 163, 184, 0.1)',
        border: 'rgba(148, 163, 184, 0.18)',
      };
  }
};

const PermissionSetupScreen = ({
  onComplete,
  onClose,
  isModal = false,
  beforeLogin = false,
  navigation,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompact = height < 700 || width < 360;

  const { permissions } = useMemo(() => getPermissionsForRole(user), [user]);

  const permissionIds = useMemo(
    () => permissions.map(item => item.id),
    [permissions],
  );

  const [statuses, setStatuses] = useState({});
  const [hasAttemptedMap, setHasAttemptedMap] = useState({});
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [requestingId, setRequestingId] = useState(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isAllowingAll, setIsAllowingAll] = useState(false);

  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(10)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const refreshStatuses = useCallback(async () => {
    try {
      const next = await checkPermissionsBatch(permissionIds, statuses);
      setStatuses(next);
      return next;
    } catch (error) {
      console.warn('Failed to refresh permission statuses:', error);
      return statuses;
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

    const sub = AppState.addEventListener('change', nextState => {
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
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    entrance.start();
    return () => entrance.stop();
  }, [contentOpacity, contentTranslateY]);

  const handleEnablePermission = async item => {
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
      setHasAttemptedMap(prev => ({ ...prev, [item.id]: true }));
      setStatuses(prev => ({ ...prev, [item.id]: result }));
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
      } else if (beforeLogin) {
        if (navigation?.reset) {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        } else if (navigation?.replace) {
          navigation.replace('Login');
        } else {
          navigation?.navigate?.('Login');
        }
      } else {
        const needsProfile =
          user?.isProfileComplete !== true &&
          (!user?.name || user.name.trim().length === 0 || user.name.startsWith('Guest_'));
        const nextRoute = needsProfile ? 'SpeechRegistration' : 'Main';

        if (navigation?.reset) {
          try {
            navigation.reset({ index: 0, routes: [{ name: nextRoute }] });
          } catch {
            if (navigation?.replace) {
              try {
                navigation.replace(nextRoute);
              } catch {
                navigation.navigate?.(nextRoute);
              }
            } else if (navigation?.navigate) {
              navigation.navigate(nextRoute);
            }
          }
        } else if (navigation?.replace) {
          try {
            navigation.replace(nextRoute);
          } catch {
            navigation.navigate?.(nextRoute);
          }
        } else if (navigation?.navigate) {
          navigation.navigate(nextRoute);
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
    let updatedStatuses = { ...statuses };
    try {
      const pendingList = permissions.filter(
        p =>
          statuses[p.id] !== PERMISSION_STATUS.GRANTED &&
          statuses[p.id] !== PERMISSION_STATUS.UNAVAILABLE,
      );

      for (const item of pendingList) {
        const current = updatedStatuses[item.id] || PERMISSION_STATUS.DENIED;
        if (current === PERMISSION_STATUS.BLOCKED) {
          continue;
        }
        setRequestingId(item.id);
        const result = await requestPermissionById(item.id, current);
        setHasAttemptedMap(prev => ({ ...prev, [item.id]: true }));
        updatedStatuses[item.id] = result;
        setStatuses(prev => ({ ...prev, [item.id]: result }));
      }
    } finally {
      setRequestingId(null);
      setIsAllowingAll(false);
      const latest = await refreshStatuses();
      const finalStatuses = latest || updatedStatuses;
      const allDone = permissions.every(
        p =>
          finalStatuses[p.id] === PERMISSION_STATUS.GRANTED ||
          finalStatuses[p.id] === PERMISSION_STATUS.UNAVAILABLE,
      );
      if (allDone) {
        handleContinue();
      }
    }
  };

  const enabledCount = permissions.filter(
    p => statuses[p.id] === PERMISSION_STATUS.GRANTED,
  ).length;
  const totalCount = permissions.length;
  const progressPercent =
    totalCount > 0 ? Math.round((enabledCount / totalCount) * 100) : 100;

  const allPermissionsGranted =
    totalCount > 0 &&
    permissions.every(
      p =>
        statuses[p.id] === PERMISSION_STATUS.GRANTED ||
        statuses[p.id] === PERMISSION_STATUS.UNAVAILABLE,
    );

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PALETTE.bgStatusBar}
      />

      <Animated.View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top + (isCompact ? 8 : 14), 16),
            paddingBottom: Math.max(insets.bottom + 12, 16),
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          {isModal && onClose ? (
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, isCompact && styles.titleCompact]}>
                  Let's get you ready!
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <XIcon size={16} color={PALETTE.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.title, isCompact && styles.titleCompact]}>
              Let's get you ready!
            </Text>
          )}

          <Text style={styles.subtitle}>
            Enable permissions to capture leads faster and use SalesBuster
            features.
          </Text>
        </View>

        {/* Content Body */}
        {isInitialLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={PALETTE.purpleBright} />
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
            {/* Privacy Notice Card */}
            <View style={styles.privacyCard}>
              <View style={styles.privacyHeader}>
                <ShieldCheckIcon size={15} color={PALETTE.purpleBright} />
                <Text style={styles.privacyTitle}>Your privacy matters</Text>
              </View>
              <Text style={styles.privacyDescription}>
                SalesBuster uses permissions only to provide the features you
                choose. You can manage access anytime in your device settings.
              </Text>
            </View>

            {/* Permission Cards */}
            {permissions.map(item => {
              const status = statuses[item.id] || PERMISSION_STATUS.DENIED;
              const isGranted = status === PERMISSION_STATUS.GRANTED;
              const isBlocked = status === PERMISSION_STATUS.BLOCKED;
              const isUnavailable = status === PERMISSION_STATUS.UNAVAILABLE;
              const statusMeta = getStatusMeta(status);
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
                  <View style={styles.cardMainRow}>
                    <View
                      style={[
                        styles.cardIconBox,
                        isGranted && styles.cardIconBoxGranted,
                      ]}
                    >
                      {renderPermissionIcon(
                        item.icon,
                        isGranted ? PALETTE.emerald : PALETTE.purpleBright,
                      )}
                    </View>

                    <View style={styles.cardInfo}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: statusMeta.bg,
                              borderColor: statusMeta.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: statusMeta.color },
                            ]}
                          >
                            {statusMeta.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.cardDescription} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardActionRow}>
                    <View style={styles.reqTagWrapper}>
                      {item.required ? (
                        <View style={styles.requiredPill}>
                          <Text style={styles.requiredPillText}>Required</Text>
                        </View>
                      ) : (
                        <Text style={styles.optionalText}>Optional</Text>
                      )}
                    </View>

                    {isGranted ? (
                      <View style={styles.grantedPill}>
                        <CheckIcon size={13} color={PALETTE.emerald} />
                        <Text style={styles.grantedPillText}>Enabled</Text>
                      </View>
                    ) : isUnavailable ? (
                      <Text style={styles.unavailableText}>Unavailable</Text>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          isBlocked && styles.settingsActionBtn,
                        ]}
                        onPress={() => handleEnablePermission(item)}
                        disabled={
                          Boolean(requestingId) || isContinuing || isAllowingAll
                        }
                        activeOpacity={0.8}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.actionBtnText}>
                            {isBlocked ? 'Open Settings' : 'Enable'}
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

        {/* Bottom Action Section */}
        <View style={styles.footer}>
          {allPermissionsGranted ? (
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                onPress={handleContinue}
                onPressIn={() =>
                  Animated.spring(buttonScale, {
                    toValue: 0.98,
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
                <BrandGradientBackground
                  id="perm_continue_btn_grad"
                  borderRadius={16}
                />
                {isContinuing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.continueBtnText}>Continue</Text>
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
                <Text style={styles.skipBtnText}>
                  {enabledCount < 1 ? 'Skip for now' : 'Skip Rest'}
                </Text>
              </TouchableOpacity>

              {/* Allow All */}
              <TouchableOpacity
                onPress={handleAllowAll}
                disabled={isContinuing || isAllowingAll}
                activeOpacity={0.85}
                style={styles.continueBtnPrimary}
              >
                <BrandGradientBackground
                  id="perm_allow_all_primary_grad"
                  borderRadius={16}
                />
                {isAllowingAll ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.continueBtnText}>Allow All</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.footerHint}>
            You can change permissions anytime in Settings.
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
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.family.bold,
    color: PALETTE.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  titleCompact: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: Fonts.family.regular,
    color: PALETTE.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  progressCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  progressTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontFamily: Fonts.family.medium,
    color: PALETTE.textSecondary,
  },
  allowAllQuickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  allowAllQuickBtnText: {
    fontSize: 11.5,
    fontFamily: Fonts.family.bold,
    color: PALETTE.purpleBright,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: PALETTE.purpleAccent,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingStateText: {
    fontSize: 13.5,
    fontFamily: Fonts.family.medium,
    color: PALETTE.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 12,
    gap: 10,
  },
  privacyCard: {
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.16)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 2,
  },
  privacyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  privacyTitle: {
    fontSize: 12.5,
    fontFamily: Fonts.family.bold,
    color: PALETTE.textPrimary,
  },
  privacyDescription: {
    fontSize: 11.5,
    fontFamily: Fonts.family.regular,
    color: PALETTE.textSecondary,
    lineHeight: 16.5,
  },
  card: {
    backgroundColor: PALETTE.cardBg,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    borderRadius: 14,
    padding: 13,
  },
  cardGranted: {
    borderColor: PALETTE.cardGrantedBorder,
  },
  cardBlocked: {
    borderColor: PALETTE.cardBlockedBorder,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  cardIconBoxGranted: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  cardInfo: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 14.5,
    fontFamily: Fonts.family.bold,
    color: PALETTE.textPrimary,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontFamily: Fonts.family.semiBold,
  },
  cardDescription: {
    fontSize: 12,
    fontFamily: Fonts.family.regular,
    color: PALETTE.textSecondary,
    lineHeight: 16.5,
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  reqTagWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requiredPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  requiredPillText: {
    fontSize: 10,
    fontFamily: Fonts.family.semiBold,
    color: PALETTE.amber,
  },
  optionalText: {
    fontSize: 11,
    fontFamily: Fonts.family.regular,
    color: PALETTE.textMuted,
  },
  grantedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  grantedPillText: {
    fontSize: 11.5,
    fontFamily: Fonts.family.semiBold,
    color: PALETTE.emerald,
  },
  unavailableText: {
    fontSize: 11.5,
    fontFamily: Fonts.family.medium,
    color: PALETTE.textMuted,
  },
  actionBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 7,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsActionBtn: {
    backgroundColor: '#334155',
  },
  actionBtnText: {
    fontSize: 12.5,
    fontFamily: Fonts.family.bold,
    color: '#FFFFFF',
  },
  footer: {
    paddingTop: 10,
  },
  continueBtn: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#4013C7',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#4013C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  continueBtnPrimary: {
    flex: 1.4,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#4013C7',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#4013C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  continueBtnDisabled: {
    opacity: 0.65,
  },
  continueBtnText: {
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  dualButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skipBtn: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
    color: '#94A3B8',
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
