import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../../components/common/AppText';
import { Fonts } from '../../styles/Fonts';
import { Spacing } from '../../styles/Spacing';
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  BuildingIcon,
  LocationPinIcon,
  SparklesIcon,
  CheckIcon,
  LogoutIcon,
  ShieldCheckIcon,
  TrashIcon,
  ChevronRightIcon,
  BackIcon,
} from '../../icons/Icons';
import { useAuth } from '../../context/AuthContext';

export const GuestAccountScreen = ({ navigation }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? You will be immediately logged out of this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleOpenPrivacyPolicy = async () => {
    const url = 'https://salesbuster.ai/#/privacy';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Privacy Policy',
          'Please visit https://salesbuster.ai/#/privacy in your web browser.'
        );
      }
    } catch {
      Linking.openURL(url).catch(() => {});
    }
  };

  const crmFeatures = [
    {
      title: 'Full Leads & Deal Pipeline',
      desc: 'Track opportunities, lead status stages, and conversion metrics.',
    },
    {
      title: 'Automatic Call Recording',
      desc: 'Record business calls, audio playback, and SalesBuster AI speech analysis.',
    },
    {
      title: 'AI Scheduled Follow-ups',
      desc: 'Smart reminder queues, overdue warnings, and missed call handling.',
    },
    {
      title: 'WhatsApp Marketing Campaigns',
      desc: 'Bulk outreach, Meta Cloud API, approved templates & opt-out controls.',
    },
    {
      title: 'Multi-User Team Management',
      desc: 'Invite sales reps, assign lead quotas, and track telecaller analytics.',
    },
    {
      title: 'BI Analyst & Target Prospecting',
      desc: 'Conversational business analytics and verified B2B prospect discovery.',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0A1F" />

      {/* 1. Header with Back button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backCircleBtn}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <BackIcon size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>
              {user?.avatar || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'G')}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.name || 'Guest User'}</Text>
          {user?.role ? (
            <Text style={styles.profileRole}>{user.role}</Text>
          ) : null}
          <View style={styles.guestBadge}>
            <SparklesIcon size={13} color="#C084FC" />
            <Text style={styles.guestBadgeText}>Active Account</Text>
          </View>
        </View>

        {/* Profile Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Profile Details</Text>

          {/* Full Name */}
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <UserIcon size={16} color="#A78BFA" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{user?.name || 'Not provided'}</Text>
            </View>
          </View>

          {/* Phone */}
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <PhoneIcon size={16} color="#A78BFA" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>
                {user?.phone ? (user.phone.startsWith('+91') ? user.phone : `+91 ${user.phone}`) : 'Not provided'}
              </Text>
            </View>
          </View>

          {/* Email */}
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <MailIcon size={16} color="#A78BFA" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>
                {user?.email && !user.email.includes('@guest.salesbuster.ai') ? user.email : 'Not provided (Optional)'}
              </Text>
            </View>
          </View>

          {/* Company / Workspace */}
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <BuildingIcon size={16} color="#A78BFA" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Company / Workspace</Text>
              <Text style={styles.infoValue}>
                {user?.companyName || user?.organization?.name || 'SalesBuster Workspace'}
              </Text>
            </View>
          </View>

          {/* Role / Designation */}
          {user?.role ? (
            <View style={styles.infoRow}>
              <View style={styles.iconCircle}>
                <UserIcon size={16} color="#A78BFA" />
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Role / Designation</Text>
                <Text style={styles.infoValue}>{user.role}</Text>
              </View>
            </View>
          ) : null}

          {/* City */}
          {user?.city ? (
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={styles.iconCircle}>
                <LocationPinIcon size={16} color="#A78BFA" />
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>City</Text>
                <Text style={styles.infoValue}>{user.city}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Security & Policies Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Security & Policies</Text>

          {/* Privacy Policy */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleOpenPrivacyPolicy}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(124, 58, 237, 0.25)' }]}>
              <ShieldCheckIcon size={17} color="#C084FC" />
            </View>
            <View style={styles.actionCol}>
              <Text style={styles.actionTitle}>Privacy Policy</Text>
              <Text style={styles.actionDesc}>https://salesbuster.ai/#/privacy</Text>
            </View>
            <ChevronRightIcon size={16} color="#8F90A6" />
          </TouchableOpacity>

          {/* Device Permissions */}
          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowBorder]}
            onPress={() => navigation?.navigate('PermissionSetup')}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <ShieldCheckIcon size={17} color="#34D399" />
            </View>
            <View style={styles.actionCol}>
              <Text style={styles.actionTitle}>Device Permissions</Text>
              <Text style={styles.actionDesc}>Manage Camera, Mic & Notifications</Text>
            </View>
            <ChevronRightIcon size={16} color="#8F90A6" />
          </TouchableOpacity>
        </View>

        {/* Upgrade Callout Card */}
        <View style={styles.upgradeCard}>
          <View style={styles.upgradeHeader}>
            <View style={styles.sparkleIconWrap}>
              <SparklesIcon size={18} color="#FFFFFF" />
            </View>
            <View style={styles.upgradeHeaderCol}>
              <Text style={styles.upgradeTitle}>Upgrade to Full CRM</Text>
              <Text style={styles.upgradeSubtitle}>Unlock enterprise sales automation</Text>
            </View>
          </View>

          <Text style={styles.upgradeDesc}>
            Your captured events, contacts, and voice notes remain safe and will seamlessly carry over when upgraded.
          </Text>

          <View style={styles.featureList}>
            {crmFeatures.map((feat, idx) => (
              <View key={idx} style={styles.featureItem}>
                <View style={styles.checkWrap}>
                  <CheckIcon size={12} color="#C084FC" />
                </View>
                <View style={styles.featureCol}>
                  <Text style={styles.featureTitle}>{feat.title}</Text>
                  <Text style={styles.featureDesc}>{feat.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.upgradeActionBox}>
            <Text style={styles.upgradeNotice}>
              Upgrades are managed by your SalesBuster Administrator. Contact your account manager or support team to activate CRM.
            </Text>
          </View>
        </View>

        {/* Action Buttons: Log Out and Delete Account */}
        <View style={styles.actionsContainer}>
          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LogoutIcon size={18} color="#C084FC" />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>

          {/* Delete Account Button */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
          >
            <TrashIcon size={18} color="#F87171" />
            <Text style={styles.deleteBtnText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0A1F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C1A36',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.family.bold,
    letterSpacing: 0.2,
  },
  headerRightSpacer: {
    width: 38,
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0A1F',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#A78BFA',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: Fonts.family.bold,
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 22,
    fontFamily: Fonts.family.bold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    fontFamily: Fonts.family.medium,
    color: '#C084FC',
    marginBottom: 10,
  },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  guestBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.family.bold,
    color: '#DDD6FE',
  },
  card: {
    backgroundColor: '#15132B',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: Fonts.family.bold,
    color: '#DDD6FE',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#201C3D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: Fonts.family.medium,
    color: '#8F90A6',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  actionRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 11,
    fontFamily: Fonts.family.regular,
    color: '#8F90A6',
  },
  upgradeCard: {
    backgroundColor: '#191433',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.28)',
    padding: 18,
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  sparkleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeHeaderCol: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontFamily: Fonts.family.bold,
    color: '#FFFFFF',
  },
  upgradeSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.family.regular,
    color: '#DDD6FE',
  },
  upgradeDesc: {
    fontSize: 12,
    fontFamily: Fonts.family.regular,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 14,
  },
  featureList: {
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  checkWrap: {
    marginTop: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2B2050',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13,
    fontFamily: Fonts.family.bold,
    color: '#FFFFFF',
  },
  featureDesc: {
    fontSize: 11,
    fontFamily: Fonts.family.regular,
    color: '#94A3B8',
    lineHeight: 15,
  },
  upgradeActionBox: {
    backgroundColor: '#110E26',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.16)',
  },
  upgradeNotice: {
    fontSize: 11,
    fontFamily: Fonts.family.regular,
    color: '#A49ACD',
    textAlign: 'center',
    lineHeight: 16,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  logoutBtnText: {
    fontSize: 14,
    fontFamily: Fonts.family.bold,
    color: '#DDD6FE',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  deleteBtnText: {
    fontSize: 14,
    fontFamily: Fonts.family.bold,
    color: '#FCA5A5',
  },
});

export default GuestAccountScreen;
