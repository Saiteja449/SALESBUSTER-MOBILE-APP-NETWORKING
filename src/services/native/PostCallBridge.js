import { NativeModules } from 'react-native';

const { PostCallBridge } = NativeModules;

/**
 * JS wrapper for the PostCallBridge native module.
 * Exposes Room DB call event queue to React Native.
 */

/**
 * Get all pending (unsubmitted) call events, FIFO ordered.
 * @returns {Promise<Array>} Array of call event objects
 */
export const getPendingEvents = () => {
  return PostCallBridge.getPendingEvents();
};

/**
 * Get count of pending (unsubmitted) events.
 * @returns {Promise<number>}
 */
export const getEventCount = () => {
  return PostCallBridge.getEventCount();
};

/**
 * Get the next event in the FIFO queue.
 * @returns {Promise<Object|null>}
 */
export const getNextPendingEvent = () => {
  return PostCallBridge.getNextPendingEvent();
};

/**
 * Mark an event as popup shown to user.
 * @param {number} eventId
 * @returns {Promise<boolean>}
 */
export const markPopupShown = (eventId) => {
  return PostCallBridge.markPopupShown(eventId);
};

/**
 * Mark an event as submitted with form data.
 * Pass null for formDataJson to mark as skipped.
 * @param {number} eventId
 * @param {string|null} formDataJson - JSON string of form data, or null if skipped
 * @returns {Promise<boolean>}
 */
export const markSubmitted = (eventId, formDataJson) => {
  return PostCallBridge.markSubmitted(eventId, formDataJson);
};

/**
 * Update sync status after API call.
 * @param {number} eventId
 * @param {string} status - "SYNCED" | "FAILED"
 * @returns {Promise<boolean>}
 */
export const updateSyncStatus = (eventId, status) => {
  return PostCallBridge.updateSyncStatus(eventId, status);
};

/**
 * Purge old synced events (older than 30 days).
 * @returns {Promise<boolean>}
 */
export const purgeOldEvents = () => {
  return PostCallBridge.purgeOldEvents();
};

/**
 * Start the background CallMonitorService (Foreground Service).
 * @returns {Promise<boolean>}
 */
export const startCallMonitorService = () => {
  return PostCallBridge.startCallMonitorService();
};

/**
 * Stop the background CallMonitorService.
 * @returns {Promise<boolean>}
 */
export const stopCallMonitorService = () => {
  return PostCallBridge.stopCallMonitorService();
};

/**
 * Check if the background CallMonitorService is running.
 * @returns {Promise<boolean>}
 */
export const isCallMonitorServiceRunning = () => {
  return PostCallBridge.isCallMonitorServiceRunning();
};

/**
 * Enable or disable post-call popups (e.g. disabled for Sales Managers).
 * @param {boolean} enabled
 * @returns {Promise<boolean>}
 */
export const setPostCallPopupEnabled = (enabled) => {
  if (PostCallBridge && PostCallBridge.setPostCallPopupEnabled) {
    return PostCallBridge.setPostCallPopupEnabled(enabled);
  }
  return Promise.resolve(false);
};

/**
 * Check if post-call popups are enabled.
 * @returns {Promise<boolean>}
 */
export const isPostCallPopupEnabled = () => {
  if (PostCallBridge && PostCallBridge.isPostCallPopupEnabled) {
    return PostCallBridge.isPostCallPopupEnabled();
  }
  return Promise.resolve(true);
};

/**
 * Link backend lead ID and auth token to call event for decoupled background audio upload.
 * @param {number} eventId
 * @param {string} leadBackendId
 * @param {string|null} authToken
 * @returns {Promise<boolean>}
 */
export const setLeadBackendInfo = (eventId, leadBackendId, authToken) => {
  if (PostCallBridge && PostCallBridge.setLeadBackendInfo) {
    return PostCallBridge.setLeadBackendInfo(eventId, leadBackendId, authToken);
  }
  return Promise.resolve(false);
};

/**
 * Retrieve matched recording for a call event from Room DB.
 * @param {number} eventId
 * @returns {Promise<{uri: string, name: string}|null>}
 */
export const getCallRecording = (eventId) => {
  if (PostCallBridge && PostCallBridge.getCallRecording) {
    return PostCallBridge.getCallRecording(eventId);
  }
  return Promise.resolve(null);
};
