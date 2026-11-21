import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Text from '../../components/common/AppText';
import BrandGradientBackground from '../../components/common/BrandGradientBackground';
import { Fonts } from '../../styles/Fonts';
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
  EditIcon,
  XIcon,
} from '../../icons/Icons';
import { useAuth } from '../../context/AuthContext';
import { openAppSettings } from '../../services/PermissionService';

export const GuestAccountScreen = ({ navigation }) => {
  const { user, logout, completeProfile } = useAuth();

  // Edit Profile Modal state
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenEditModal = () => {
    setEditName(user?.name || '');
    setEditCompany(user?.companyName || user?.organization?.name || '');
    setEditCity(user?.city || '');
    setEditRole(user?.role || '');
    const currentEmail =
      user?.email && !user.email.includes('@guest.salesbuster.ai')
        ? user.email
        : '';
    setEditEmail(currentEmail);
    setFormError('');
    setIsEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setFormError('Full name is required.');
      return;
    }

    if (editEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editEmail.trim())) {
        setFormError('Please enter a valid email address.');
        return;
      }
    }

    setFormError('');
    setIsSaving(true);

    try {
      const res = await completeProfile({
        name: editName.trim(),
        companyName: editCompany.trim(),
        role: editRole.trim(),
        city: editCity.trim(),
        email: editEmail.trim(),
      });

      setIsSaving(false);

      if (res?.success) {
        setIsEditModalVisible(false);
        Alert.alert(
          'Profile Updated',
          'Your profile details have been saved successfully.',
        );
      } else {
        setFormError(
          res?.message || 'Failed to update profile. Please try again.',
        );
      }
    } catch (err) {
      setIsSaving(false);
      setFormError(err?.message || 'Network error updating profile.');
    }
  };

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
      ],
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
      ],
    );
  };

  const handleOpenPrivacyPolicy = async () => {
    const url = 'https://salesbuster.ai/privacy-policy.html';
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.warn('Could not open privacy policy URL:', err);
      Alert.alert(
        'Unable to Open Browser',
        'Please visit https://salesbuster.ai/privacy-policy.html in your web browser.',
      );
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
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0B0A1F" />

      {/* 1. Header with Back button and Edit Profile button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backCircleBtn}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <BackIcon size={18} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={styles.editHeaderBtn}
          onPress={handleOpenEditModal}
          activeOpacity={0.7}
        >
          <EditIcon size={15} color="#C084FC" />
          <Text style={styles.editHeaderBtnText}>Edit</Text>
        </TouchableOpacity>
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
              {user?.avatar ||
                (user?.name ? user.name.slice(0, 2).toUpperCase() : 'G')}
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
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Profile Details</Text>
            <TouchableOpacity
              style={styles.cardEditPill}
              onPress={handleOpenEditModal}
              activeOpacity={0.7}
            >
              <EditIcon size={13} color="#C084FC" />
              <Text style={styles.cardEditPillText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Full Name */}
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <UserIcon size={16} color="#A78BFA" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>
                {user?.name || 'Not provided'}
              </Text>
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
                {user?.phone
                  ? user.phone.startsWith('+91')
                    ? user.phone
                    : `+91 ${user.phone}`
                  : 'Not provided'}
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
                {user?.email && !user.email.includes('@guest.salesbuster.ai')
                  ? user.email
                  : 'Not provided (Optional)'}
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
                {user?.companyName ||
                  user?.organization?.name ||
                  'SalesBuster Workspace'}
              </Text>
            </View>
          </View>

          {/* Role / Designation */}
          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <UserIcon size={16} color="#A78BFA" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Role / Designation</Text>
              <Text style={styles.infoValue}>
                {user?.role || 'Not provided (Optional)'}
              </Text>
            </View>
          </View>

          {/* City */}
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.iconCircle}>
              <LocationPinIcon size={16} color="#A78BFA" />
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>City</Text>
              <Text style={styles.infoValue}>
                {user?.city || 'Not provided (Optional)'}
              </Text>
            </View>
          </View>
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
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: 'rgba(124, 58, 237, 0.25)' },
              ]}
            >
              <ShieldCheckIcon size={17} color="#C084FC" />
            </View>
            <View style={styles.actionCol}>
              <Text style={styles.actionTitle}>Privacy Policy</Text>
              {/* <Text style={styles.actionDesc}>https://salesbuster.ai/privacy-policy.html</Text> */}
            </View>
            <ChevronRightIcon size={16} color="#8F90A6" />
          </TouchableOpacity>

          {/* Device Permissions */}
          <TouchableOpacity
            style={[styles.actionRow, styles.actionRowBorder]}
            onPress={openAppSettings}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
              ]}
            >
              <ShieldCheckIcon size={17} color="#34D399" />
            </View>
            <View style={styles.actionCol}>
              <Text style={styles.actionTitle}>Device Permissions</Text>
              <Text style={styles.actionDesc}>
                Manage Camera, Mic & Notifications
              </Text>
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
              <Text style={styles.upgradeSubtitle}>
                Unlock enterprise sales automation
              </Text>
            </View>
          </View>

          <Text style={styles.upgradeDesc}>
            Take your business to the next level with full CRM capabilities:
          </Text>

          <View style={styles.featureList}>
            {crmFeatures.map((feat, idx) => (
              <View key={idx} style={styles.featureItem}>
                <View style={styles.checkWrap}>
                  <CheckIcon size={12} color="#A78BFA" />
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
              Visit{' '}
              <Text style={{ color: '#C084FC', fontFamily: Fonts.family.bold }}>
                salesbuster.ai
              </Text>{' '}
              to upgrade your workspace to full CRM.
            </Text>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LogoutIcon size={18} color="#C084FC" />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>

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

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => !isSaving && setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <View style={styles.modalHeaderIconWrap}>
                    <EditIcon size={17} color="#C084FC" />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Edit Profile</Text>
                    <Text style={styles.modalSubtitle}>
                      Update your personal and business details
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setIsEditModalVisible(false)}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  <XIcon size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {formError ? (
                  <View style={styles.errorBanner}>
                    <Text style={styles.errorBannerText}>{formError}</Text>
                  </View>
                ) : null}

                {/* Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Full Name <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <View style={styles.inputWrap}>
                    <UserIcon size={16} color="#A78BFA" />
                    <TextInput
                      style={styles.textInput}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Enter your full name"
                      placeholderTextColor="#64748B"
                      editable={!isSaving}
                    />
                  </View>
                </View>

                {/* Company */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Company / Workspace</Text>
                  <View style={styles.inputWrap}>
                    <BuildingIcon size={16} color="#A78BFA" />
                    <TextInput
                      style={styles.textInput}
                      value={editCompany}
                      onChangeText={setEditCompany}
                      placeholder="Enter company or workspace name"
                      placeholderTextColor="#64748B"
                      editable={!isSaving}
                    />
                  </View>
                </View>

                {/* City */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>City</Text>
                  <View style={styles.inputWrap}>
                    <LocationPinIcon size={16} color="#A78BFA" />
                    <TextInput
                      style={styles.textInput}
                      value={editCity}
                      onChangeText={setEditCity}
                      placeholder="Enter city (e.g. Hyderabad, Mumbai)"
                      placeholderTextColor="#64748B"
                      editable={!isSaving}
                    />
                  </View>
                </View>

                {/* Role */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Role / Designation</Text>
                  <View style={styles.inputWrap}>
                    <UserIcon size={16} color="#A78BFA" />
                    <TextInput
                      style={styles.textInput}
                      value={editRole}
                      onChangeText={setEditRole}
                      placeholder="e.g. Sales Manager, Founder, Director"
                      placeholderTextColor="#64748B"
                      editable={!isSaving}
                    />
                  </View>
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrap}>
                    <MailIcon size={16} color="#A78BFA" />
                    <TextInput
                      style={styles.textInput}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      placeholder="e.g. name@company.com"
                      placeholderTextColor="#64748B"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isSaving}
                    />
                  </View>
                </View>

                {/* Phone Read-Only Notice */}
                <View style={styles.readOnlyPhoneBox}>
                  <PhoneIcon size={15} color="#818CF8" />
                  <View style={styles.readOnlyPhoneCol}>
                    <Text style={styles.readOnlyPhoneLabel}>
                      Registered Phone
                    </Text>
                    <Text style={styles.readOnlyPhoneValue}>
                      {user?.phone
                        ? user.phone.startsWith('+91')
                          ? user.phone
                          : `+91 ${user.phone}`
                        : 'Not available'}
                    </Text>
                    <Text style={styles.readOnlyPhoneHint}>
                      Phone number is permanently linked to OTP authentication
                      and cannot be edited.
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsEditModalVisible(false)}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSaveBtn,
                    isSaving && styles.modalSaveBtnDisabled,
                  ]}
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  activeOpacity={0.7}
                >
                  <BrandGradientBackground
                    id="edit_profile_save_grad"
                    borderRadius={14}
                  />
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckIcon size={16} color="#FFFFFF" />
                      <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  editHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  editHeaderBtnText: {
    color: '#DDD6FE',
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 12,
    fontFamily: Fonts.family.bold,
    color: '#DDD6FE',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardEditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  cardEditPillText: {
    color: '#DDD6FE',
    fontSize: 11,
    fontFamily: Fonts.family.semiBold,
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

  // ─────────────────────────────────────────────────────────────────────────────
  // EDIT PROFILE MODAL STYLES
  // ─────────────────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 2, 10, 0.78)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#131127',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    maxHeight: '90%',
    paddingBottom: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalHeaderIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: Fonts.family.bold,
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: Fonts.family.regular,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1B38',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  modalBody: {
    paddingHorizontal: 22,
  },
  modalBodyContent: {
    paddingTop: 18,
    paddingBottom: 20,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontFamily: Fonts.family.medium,
    lineHeight: 17,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: Fonts.family.medium,
    color: '#CBD5E1',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#F87171',
    fontSize: 12,
    fontFamily: Fonts.family.bold,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1736',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.22)',
    paddingHorizontal: 14,
    height: 51,
    gap: 10,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.regular,
    paddingVertical: 0,
  },
  readOnlyPhoneBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(30, 27, 56, 0.65)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  readOnlyPhoneCol: {
    flex: 1,
  },
  readOnlyPhoneLabel: {
    fontSize: 11,
    fontFamily: Fonts.family.medium,
    color: '#818CF8',
    marginBottom: 2,
  },
  readOnlyPhoneValue: {
    fontSize: 13,
    fontFamily: Fonts.family.semiBold,
    color: '#CBD5E1',
  },
  readOnlyPhoneHint: {
    fontSize: 10,
    fontFamily: Fonts.family.regular,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#1E1A38',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: Fonts.family.semiBold,
  },
  modalSaveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#4013C7',
    overflow: 'hidden',
    shadowColor: '#4013C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSaveBtnDisabled: {
    opacity: 0.65,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.family.bold,
  },
});

export default GuestAccountScreen;
