import { Platform, Linking, NativeModules, PermissionsAndroid } from 'react-native';

const { DefaultDialer } = NativeModules;

export const requestDefaultDialer = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.requestDefaultDialer) {
    try {
      return await DefaultDialer.requestDefaultDialer();
    } catch (error) {
      console.error('Failed to request default dialer:', error);
      return false;
    }
  }
  return false;
};

export const checkDefaultDialer = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.checkDefaultDialer) {
    try {
      return await DefaultDialer.checkDefaultDialer();
    } catch (error) {
      console.error('Failed to check default dialer:', error);
      return false;
    }
  }
  return false;
};

export const isXiaomiDevice = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.isXiaomiDevice) {
    try {
      return await DefaultDialer.isXiaomiDevice();
    } catch (error) {
      console.error('Failed to check if Xiaomi device:', error);
      return false;
    }
  }
  return false;
};

export const openAutostartSettings = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.openAutostartSettings) {
    try {
      return await DefaultDialer.openAutostartSettings();
    } catch (error) {
      console.error('Failed to open autostart settings:', error);
      return false;
    }
  }
  return false;
};

export const checkOverlayPermission = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.checkOverlayPermission) {
    try {
      return await DefaultDialer.checkOverlayPermission();
    } catch (error) {
      console.error('Failed to check overlay permission:', error);
      return false;
    }
  }
  return false;
};

export const requestOverlayPermission = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.requestOverlayPermission) {
    try {
      return await DefaultDialer.requestOverlayPermission();
    } catch (error) {
      console.error('Failed to request overlay permission:', error);
      return false;
    }
  }
  return false;
};

export const makeCall = async (phoneNumber) => {
  try {
    let cleanNumber = String(phoneNumber).replace(/[^\d+]/g, '');
    if (!cleanNumber.startsWith('+')) {
      if (cleanNumber.startsWith('91') && cleanNumber.length > 10) {
        cleanNumber = '+' + cleanNumber;
      } else if (cleanNumber.length === 10) {
        cleanNumber = '+91' + cleanNumber;
      }
    }
    const url = `tel:${cleanNumber}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    } else {
      console.warn('Phone dialer is not available');
      return false;
    }
  } catch (error) {
    console.error('Error making call:', error);
    return false;
  }
};

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

export const openOemAutostartSettings = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.openOemAutostartSettings) {
    try {
      return await DefaultDialer.openOemAutostartSettings();
    } catch (error) {
      console.error('Failed to open OEM autostart settings:', error);
      return false;
    }
  }
  return false;
};

export const getActiveSimCards = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.getActiveSimCards) {
    try {
      const sims = await DefaultDialer.getActiveSimCards();
      return Array.isArray(sims) ? sims : [];
    } catch (error) {
      console.error('Failed to get active SIM cards:', error);
      return [];
    }
  }
  return [];
};

export const getSelectedTrackingSim = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.getSelectedTrackingSim) {
    try {
      return await DefaultDialer.getSelectedTrackingSim();
    } catch (error) {
      console.error('Failed to get selected tracking SIM:', error);
      return { mode: 'ALL', selectedSimIds: [], isManager: false };
    }
  }
  return { mode: 'ALL', selectedSimIds: [], isManager: false };
};

export const setSelectedTrackingSim = async (mode = 'ALL', simIds = [], isManager = false) => {
  if (Platform.OS === 'android' && DefaultDialer?.setSelectedTrackingSim) {
    try {
      return await DefaultDialer.setSelectedTrackingSim(mode, simIds, isManager);
    } catch (error) {
      console.error('Failed to set selected tracking SIM:', error);
      return false;
    }
  }
  return false;
};

export const syncUserRole = async (isManager = false) => {
  if (Platform.OS === 'android' && DefaultDialer?.syncUserRole) {
    try {
      return await DefaultDialer.syncUserRole(isManager);
    } catch (error) {
      console.error('Failed to sync user role to native:', error);
      return false;
    }
  }
  return false;
};

export const getCallLogsWithSim = async (limit = 1000) => {
  if (Platform.OS === 'android' && DefaultDialer?.getCallLogsWithSim) {
    try {
      return await DefaultDialer.getCallLogsWithSim(limit);
    } catch (error) {
      console.error('Failed to get call logs with SIM info:', error);
      return [];
    }
  }
  return [];
};

export const getLatestSharedRecording = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.getLatestSharedRecording) {
    try {
      return await DefaultDialer.getLatestSharedRecording();
    } catch (error) {
      console.error('Failed to get latest shared recording:', error);
      return null;
    }
  }
  return null;
};

export const checkAllFilesAccess = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.checkAllFilesAccess) {
    try {
      return await DefaultDialer.checkAllFilesAccess();
    } catch (error) {
      console.error('Failed to check all files access:', error);
      return false;
    }
  }
  return true;
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

export const clearLatestSharedRecording = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.clearLatestSharedRecording) {
    try {
      return await DefaultDialer.clearLatestSharedRecording();
    } catch (error) {
      console.error('Failed to clear latest shared recording:', error);
      return false;
    }
  }
  return false;
};

export const getCaptureDiagnostics = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.getCaptureDiagnostics) {
    try {
      return await DefaultDialer.getCaptureDiagnostics();
    } catch (error) {
      console.error('Failed to get capture diagnostics:', error);
      return { logs: [], activeWatchers: [], watcherCount: 0 };
    }
  }
  return { logs: [], activeWatchers: [], watcherCount: 0 };
};

export const rebindRecordingWatchers = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.rebindRecordingWatchers) {
    try {
      return await DefaultDialer.rebindRecordingWatchers();
    } catch (error) {
      console.error('Failed to rebind recording watchers:', error);
      return false;
    }
  }
  return false;
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

export const getDeviceCapability = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.getDeviceCapability) {
    try {
      return await DefaultDialer.getDeviceCapability();
    } catch (error) {
      console.error('Failed to get device capability:', error);
      return { hasNativeRecordingSupport: true, recommendation: 'native' };
    }
  }
  return { hasNativeRecordingSupport: true, recommendation: 'native' };
};

export const getCustomRecordingFolder = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.getCustomRecordingFolder) {
    try {
      return await DefaultDialer.getCustomRecordingFolder();
    } catch (error) {
      console.error('Failed to get custom recording folder:', error);
      return null;
    }
  }
  return null;
};

export const setCustomRecordingFolder = async (path) => {
  if (Platform.OS === 'android' && DefaultDialer?.setCustomRecordingFolder) {
    try {
      return await DefaultDialer.setCustomRecordingFolder(path);
    } catch (error) {
      console.error('Failed to set custom recording folder:', error);
      return false;
    }
  }
  return false;
};

export const getCustomRecordingFolderInfo = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.getCustomRecordingFolderInfo) {
    try {
      return await DefaultDialer.getCustomRecordingFolderInfo();
    } catch (error) {
      console.error('Failed to get custom recording folder info:', error);
      return null;
    }
  }
  return null;
};

export const resolveAndSetCustomFolder = async (uri) => {
  if (Platform.OS === 'android' && DefaultDialer?.resolveAndSetCustomFolder) {
    try {
      return await DefaultDialer.resolveAndSetCustomFolder(uri);
    } catch (error) {
      console.error('Failed to resolve and set custom folder:', error);
      return null;
    }
  }
  return null;
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

export const registerManualRecording = async (filePath) => {
  if (Platform.OS === 'android' && DefaultDialer?.registerManualRecording) {
    try {
      return await DefaultDialer.registerManualRecording(filePath);
    } catch (error) {
      console.warn('Manual recording registration notice:', error?.message || error);
      return false;
    }
  }
  return false;
};

export const openDialerApp = async () => {
  try {
    await Linking.openURL('tel:');
    return true;
  } catch (error) {
    console.error('Failed to open phone dialer app:', error);
    return false;
  }
};

export const getStorageInfo = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.getStorageInfo) {
    try {
      return await DefaultDialer.getStorageInfo();
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }
  return null;
};

export const openStorageSettings = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.openStorageSettings) {
    try {
      return await DefaultDialer.openStorageSettings();
    } catch (error) {
      console.error('Failed to open storage settings:', error);
      return false;
    }
  }
  return false;
};

export const getCachedRecordingPath = async (filePath) => {
  if (Platform.OS === 'android' && DefaultDialer?.getCachedRecordingPath && filePath) {
    try {
      return await DefaultDialer.getCachedRecordingPath(filePath);
    } catch (error) {
    }
  }
  return filePath;
};

export const isSdCardInserted = async () => {
  if (Platform.OS === 'android' && DefaultDialer?.isSdCardInserted) {
    try {
      return await DefaultDialer.isSdCardInserted();
    } catch (error) {
      console.warn('Failed to check SD card status:', error);
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
    if (hasRead && hasWrite) return true;

    const results = await PermissionsAndroid.requestMultiple([readPerm, writePerm]);
    return (
      results[readPerm] === PermissionsAndroid.RESULTS.GRANTED &&
      results[writePerm] === PermissionsAndroid.RESULTS.GRANTED
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



