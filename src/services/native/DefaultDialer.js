import { Platform, NativeModules, PermissionsAndroid } from 'react-native';

const { DefaultDialer } = NativeModules;

export const checkBatteryOptimizationExempt = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.checkBatteryOptimizationExempt) {
    try {
      return await DefaultDialer.checkBatteryOptimizationExempt();
    } catch (error) {
      console.error('Failed to check battery optimization exemption:', error);
      return true;
    }
  }
  return true;
};

export const requestBatteryOptimizationExempt = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.requestBatteryOptimizationExempt) {
    try {
      return await DefaultDialer.requestBatteryOptimizationExempt();
    } catch (error) {
      console.error('Failed to request battery optimization exemption:', error);
      return false;
    }
  }
  return false;
};

export const requestAllFilesAccess = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.requestAllFilesAccess) {
    try {
      return await DefaultDialer.requestAllFilesAccess();
    } catch (error) {
      console.error('Failed to request all files access:', error);
      return false;
    }
  }
  return true;
};

export const checkPermissionHealth = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.checkPermissionHealth) {
    try {
      return await DefaultDialer.checkPermissionHealth();
    } catch (error) {
      console.error('Failed to check permission health:', error);
      return { isAllHealthy: true };
    }
  }
  return { isAllHealthy: true };
};

export const saveAuthToken = async (token) => {
  if (Platform.OS === 'android' && DefaultDialer?.saveAuthToken) {
    try {
      return await DefaultDialer.saveAuthToken(token);
    } catch (error) {
      console.error('Failed to save auth token to native storage:', error);
      return false;
    }
  }
  return false;
};

export const saveUserPhoneNumber = async (phone) => {
  if (Platform.OS === 'android' && DefaultDialer?.saveUserPhoneNumber) {
    try {
      return await DefaultDialer.saveUserPhoneNumber(phone);
    } catch (error) {
      console.warn('Failed to save user phone number to native storage:', error);
      return false;
    }
  }
  return false;
};

/**
 * Ensures READ_CONTACTS and WRITE_CONTACTS permissions are granted on Android
 * before saving a captured event visitor locally for WhatsApp media sync.
 */
export const ensureContactWritePermissions = async () => {
  if (Platform.OS !== 'android') return false;
  try {
    const readPerm = PermissionsAndroid.PERMISSIONS.READ_CONTACTS;
    const writePerm = PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS;
    const [hasRead, hasWrite] = await Promise.all([
      PermissionsAndroid.check(readPerm),
      PermissionsAndroid.check(writePerm),
    ]);
    if (hasRead || hasWrite) return true;

    const readRes = await PermissionsAndroid.request(readPerm);
    try {
      await PermissionsAndroid.request(writePerm);
    } catch (_) {}

    const [recheckRead, recheckWrite] = await Promise.all([
      PermissionsAndroid.check(readPerm),
      PermissionsAndroid.check(writePerm),
    ]);
    return (
      recheckRead ||
      recheckWrite ||
      readRes === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (error) {
    console.warn('Contact permission request failed:', error);
    return false;
  }
};

/**
 * Sync-aware WhatsApp media + text share on Android.
 * Saves the contact locally if not yet indexed by WhatsApp, waits briefly for
 * WhatsApp SyncAdapter, and only launches ACTION_SEND + jid once synced.
 */
export const shareToWhatsAppSmart = async ({
  phone,
  name = '',
  companyName = '',
  eventName = '',
  messageText = '',
  files = [],
  syncTimeoutMs = 4500,
}) => {
  if (Platform.OS !== 'android' || !DefaultDialer?.shareToWhatsAppSmart) {
    return { launched: false, mode: 'unsupported', synced: false, imageCopiedToClipboard: false };
  }
  await ensureContactWritePermissions();
  return DefaultDialer.shareToWhatsAppSmart(
    phone,
    name || '',
    companyName || '',
    eventName || '',
    messageText || '',
    files,
    syncTimeoutMs
  );
};

export default {
  checkBatteryOptimizationExempt,
  requestBatteryOptimizationExempt,
  requestAllFilesAccess,
  checkPermissionHealth,
  saveAuthToken,
  saveUserPhoneNumber,
  ensureContactWritePermissions,
  shareToWhatsAppSmart,
};
