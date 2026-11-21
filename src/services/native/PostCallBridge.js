import { NativeModules } from 'react-native';

const { PostCallBridge } = NativeModules;

/**
 * Enable or disable post-call popups.
 * @param {boolean} enabled
 * @returns {Promise<boolean>}
 */
export const setPostCallPopupEnabled = (enabled) => {
  if (PostCallBridge && PostCallBridge.setPostCallPopupEnabled) {
    return PostCallBridge.setPostCallPopupEnabled(enabled);
  }
  return Promise.resolve(false);
};

export default {
  setPostCallPopupEnabled,
};
