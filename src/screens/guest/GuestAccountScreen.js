import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Text from '../../components/common/AppText';
import { Colors } from '../../styles/Colors';
import { Fonts } from '../../styles/Fonts';
import { Spacing } from '../../styles/Spacing';
import Theme from '../../styles/Theme';
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  BuildingIcon,
  SparklesIcon,
  CheckIcon,
  LogoutIcon,
  ShieldCheckIcon,
  ZapIcon,
  ChevronRightIcon,
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>
            {user?.avatar || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'G')}
          </Text>
        </View>
        <Text style={styles.profileName}>{user?.name || 'User'}</Text>
        <View style={styles.guestBadge}>
          <SparklesIcon size={14} color="#9333EA" />
          <Text style={styles.guestBadgeText}>Active Account</Text>
        </View>
      </View>

      {/* Account Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Profile</Text>

        <View style={styles.infoRow}>
          <MailIcon size={18} color={Colors.textMuted} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <PhoneIcon size={18} color={Colors.textMuted} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user?.phone || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <BuildingIcon size={18} color={Colors.textMuted} />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Workspace</Text>
            <Text style={styles.infoValue}>
              {user?.organization?.name || 'SalesBuster Workspace'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <ShieldCheckIcon size={18} color="#10B981" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Cloud Storage</Text>
            <Text style={styles.infoValue}>
              Cloud-backed & Active (Isolated Tenant)
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.infoRowAction}
          onPress={() => navigation?.navigate('PermissionSetup')}
          activeOpacity={0.7}
        >
          <ShieldCheckIcon size={18} color="#7C3AED" />
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Device Permissions</Text>
            <Text style={styles.infoValue}>
              Manage Camera, Mic & Notifications
            </Text>
          </View>
          <ChevronRightIcon size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Upgrade Callout Card */}
      <View style={styles.upgradeCard}>
        <View style={styles.upgradeHeader}>
          <View style={styles.sparkleIconWrap}>
            <SparklesIcon size={20} color="#FFFFFF" />
          </View>
          <View style={styles.upgradeHeaderCol}>
            <Text style={styles.upgradeTitle}>Upgrade to Full CRM</Text>
            <Text style={styles.upgradeSubtitle}>
              Unlock enterprise sales automation
            </Text>
          </View>
        </View>

        <Text style={styles.upgradeDesc}>
          Your captured events, contacts, and voice notes remain safe and will seamlessly carry over when upgraded.
        </Text>

        <View style={styles.featureList}>
          {crmFeatures.map((feat, idx) => (
            <View key={idx} style={styles.featureItem}>
              <View style={styles.checkWrap}>
                <CheckIcon size={14} color="#9333EA" />
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

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <LogoutIcon size={18} color={Colors.danger} />
        <Text style={styles.logoutBtnText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 50,
    paddingBottom: Spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  avatarText: {
    fontSize: Fonts.sizes.xl,
    fontFamily: Fonts.family.bold,
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: Fonts.sizes.lg,
    fontFamily: Fonts.family.bold,
    color: Colors.text,
    marginBottom: 6,
  },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.25)',
  },
  guestBadgeText: {
    fontSize: Fonts.sizes.xs,
    fontFamily: Fonts.family.bold,
    color: '#9333EA',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Theme.borderRadius,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: Fonts.sizes.sm,
    fontFamily: Fonts.family.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoRowAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingTop: Spacing.md,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: Fonts.family.medium,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: Fonts.sizes.sm,
    fontFamily: Fonts.family.semiBold,
    color: Colors.text,
  },
  upgradeCard: {
    backgroundColor: Colors.card,
    borderRadius: Theme.borderRadius,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sparkleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9333EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  upgradeHeaderCol: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: Fonts.sizes.md,
    fontFamily: Fonts.family.bold,
    color: Colors.text,
  },
  upgradeSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.family.regular,
    color: '#9333EA',
  },
  upgradeDesc: {
    fontSize: Fonts.sizes.xs,
    fontFamily: Fonts.family.regular,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  featureList: {
    marginBottom: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  checkWrap: {
    marginTop: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Fonts.sizes.xs,
    fontFamily: Fonts.family.bold,
    color: Colors.text,
  },
  featureDesc: {
    fontSize: 11,
    fontFamily: Fonts.family.regular,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  upgradeActionBox: {
    backgroundColor: 'rgba(147, 51, 234, 0.06)',
    borderRadius: Theme.borderRadius,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.15)',
  },
  upgradeNotice: {
    fontSize: 11,
    fontFamily: Fonts.family.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Theme.borderRadius,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutBtnText: {
    fontSize: Fonts.sizes.sm,
    fontFamily: Fonts.family.bold,
    color: Colors.danger,
  },
});

export default GuestAccountScreen;

