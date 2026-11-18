import { Linking, PermissionsAndroid, Platform } from 'react-native';
import {
  checkBatteryOptimizationExempt,
  checkPermissionHealth,
  rebindRecordingWatchers,
  requestAllFilesAccess,
  requestBatteryOptimizationExempt,
} from './native/DefaultDialer';
import { startCallMonitorService } from './native/PostCallBridge';

export const PERMISSION_STATUS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  BLOCKED: 'blocked',
  UNAVAILABLE: 'unavailable',
};

const getAndroidApiLevel = () => {
  if (Platform.OS !== 'android') return 0;
  return typeof Platform.Version === 'number'
    ? Platform.Version
    : parseInt(String(Platform.Version), 10) || 0;
};

const mapAndroidResult = (result) => {
  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return PERMISSION_STATUS.GRANTED;
  }
  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return PERMISSION_STATUS.BLOCKED;
  }
  return PERMISSION_STATUS.DENIED;
};

/**
 * Check the real-time OS status of a single permission ID.
 */
export const checkPermissionStatus = async (permissionId) => {
  if (Platform.OS !== 'android') {
    // On iOS, native runtime modules for these specific Android flows are not configured
    return PERMISSION_STATUS.UNAVAILABLE;
  }

  const apiLevel = getAndroidApiLevel();

  try {
    switch (permissionId) {
      case 'notifications': {
        if (apiLevel < 33) {
          return PERMISSION_STATUS.GRANTED;
        }
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        return granted ? PERMISSION_STATUS.GRANTED : PERMISSION_STATUS.DENIED;
      }

      case 'microphone': {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );
        return granted ? PERMISSION_STATUS.GRANTED : PERMISSION_STATUS.DENIED;
      }

      case 'phone': {
        const [pState, pCall, pLog] = await Promise.all([
          PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE),
          PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CALL_PHONE),
          PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG),
        ]);
        return pState && pCall && pLog
          ? PERMISSION_STATUS.GRANTED
          : PERMISSION_STATUS.DENIED;
      }

      case 'contacts': {
        const [readGranted, writeGranted] = await Promise.all([
          PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS),
          PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS),
        ]);
        return (readGranted || writeGranted)
          ? PERMISSION_STATUS.GRANTED
          : PERMISSION_STATUS.DENIED;
      }

      case 'camera': {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        return granted ? PERMISSION_STATUS.GRANTED : PERMISSION_STATUS.DENIED;
      }

      case 'storage': {
        const health = await checkPermissionHealth();
        if (health?.allFilesAccess) {
          return PERMISSION_STATUS.GRANTED;
        }
        if (apiLevel >= 33) {
          const audioGranted = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
          );
          return audioGranted ? PERMISSION_STATUS.GRANTED : PERMISSION_STATUS.DENIED;
        }
        const storageGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );
        return storageGranted ? PERMISSION_STATUS.GRANTED : PERMISSION_STATUS.DENIED;
      }

      case 'background': {
        const exempt = await checkBatteryOptimizationExempt();
        return exempt ? PERMISSION_STATUS.GRANTED : PERMISSION_STATUS.DENIED;
      }

      default:
        return PERMISSION_STATUS.UNAVAILABLE;
    }
  } catch (error) {
    console.warn(`Permission check failed for ${permissionId}:`, error);
    return PERMISSION_STATUS.DENIED;
  }
};

/**
 * Check multiple permission IDs against the OS and preserve known blocked flags
 * until the OS reports the permission as granted.
 */
export const checkPermissionsBatch = async (permissionIds, previousStatuses = {}) => {
  const entries = await Promise.all(
    permissionIds.map(async (id) => {
      const osStatus = await checkPermissionStatus(id);
      if (
        osStatus === PERMISSION_STATUS.DENIED &&
        previousStatuses[id] === PERMISSION_STATUS.BLOCKED
      ) {
        return [id, PERMISSION_STATUS.BLOCKED];
      }
      return [id, osStatus];
    }),
  );

  return Object.fromEntries(entries);
};

/**
 * Open the device app settings screen so the user can manually enable blocked permissions.
 */
export const openAppSettings = async () => {
  try {
    await Linking.openSettings();
    return true;
  } catch (error) {
    console.warn('Failed to open device settings:', error);
    return false;
  }
};

/**
 * Request a single permission by ID.
 * Checks OS state first and opens Settings if permanently denied / blocked.
 */
export const requestPermissionById = async (permissionId, currentStatus) => {
  const liveStatus = await checkPermissionStatus(permissionId);
  if (liveStatus === PERMISSION_STATUS.GRANTED) {
    return PERMISSION_STATUS.GRANTED;
  }

  if (
    currentStatus === PERMISSION_STATUS.BLOCKED ||
    liveStatus === PERMISSION_STATUS.BLOCKED
  ) {
    await openAppSettings();
    return PERMISSION_STATUS.BLOCKED;
  }

  if (Platform.OS !== 'android') {
    return PERMISSION_STATUS.UNAVAILABLE;
  }

  const apiLevel = getAndroidApiLevel();

  try {
    switch (permissionId) {
      case 'notifications': {
        if (apiLevel < 33) {
          return PERMISSION_STATUS.GRANTED;
        }
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'Notification Alerts',
            message:
              'SalesBuster sends notifications to keep you informed of scheduled attendee follow-ups, cloud lead synchronization, and important event alerts.',
            buttonPositive: 'Allow',
            buttonNegative: 'Not Now',
          },
        );
        return mapAndroidResult(res);
      }

      case 'microphone': {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Access for Voice Notes',
            message:
              'SalesBuster needs microphone access to record your voice notes and extract attendee contact details using AI speech analysis. Audio is only recorded while you actively open or use voice capture.',
            buttonPositive: 'Allow',
            buttonNegative: 'Not Now',
          },
        );
        return mapAndroidResult(res);
      }

      case 'phone': {
        const perms = [
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
        ];
        const results = await PermissionsAndroid.requestMultiple(perms);
        const values = Object.values(results);
        if (values.every((v) => v === PermissionsAndroid.RESULTS.GRANTED)) {
          return PERMISSION_STATUS.GRANTED;
        }
        if (values.some((v) => v === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) {
          return PERMISSION_STATUS.BLOCKED;
        }
        return PERMISSION_STATUS.DENIED;
      }

      case 'contacts': {
        const readPerm = PermissionsAndroid.PERMISSIONS.READ_CONTACTS;
        const writePerm = PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS;

        const readRes = await PermissionsAndroid.request(readPerm, {
          title: 'Contacts Access',
          message:
            'SalesBuster needs contacts access to recognize WhatsApp contacts and sync event attendees.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not Now',
        });

        // Also attempt WRITE_CONTACTS in case the OS supports separate grant for local contact storage
        try {
          await PermissionsAndroid.request(writePerm);
        } catch (_) {
          // Ignore if OS manages WRITE under the same permission group
        }

        const [hasRead, hasWrite] = await Promise.all([
          PermissionsAndroid.check(readPerm),
          PermissionsAndroid.check(writePerm),
        ]);

        if (hasRead || hasWrite || readRes === PermissionsAndroid.RESULTS.GRANTED) {
          return PERMISSION_STATUS.GRANTED;
        }

        if (readRes === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          return PERMISSION_STATUS.BLOCKED;
        }

        return PERMISSION_STATUS.DENIED;
      }

      case 'camera': {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Access for Attendee Capture',
            message:
              'SalesBuster needs camera access so you can take attendee selfies and photograph business cards to attach to your event leads. Photos are stored securely in your workspace and never shared without your permission.',
            buttonPositive: 'Allow',
            buttonNegative: 'Not Now',
          },
        );
        return mapAndroidResult(res);
      }

      case 'storage': {
        if (apiLevel >= 30) {
          await requestAllFilesAccess();
          return await checkPermissionStatus('storage');
        }
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );
        return mapAndroidResult(res);
      }

      case 'background': {
        await requestBatteryOptimizationExempt();
        return await checkPermissionStatus('background');
      }

      default:
        return PERMISSION_STATUS.UNAVAILABLE;
    }
  } catch (error) {
    console.warn(`Permission request failed for ${permissionId}:`, error);
    return PERMISSION_STATUS.DENIED;
  }
};

/**
 * Initialize background call/recording watchers for Sales Representatives when permitted.
 */
export const initializeSalesRepServices = async () => {
  if (Platform.OS !== 'android') return;
  try {
    await rebindRecordingWatchers();
    await startCallMonitorService();
  } catch (error) {
    console.warn('Error initializing call monitor services:', error);
  }
};

