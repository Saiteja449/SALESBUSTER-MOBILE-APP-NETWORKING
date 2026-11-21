export const BASE_URL = 'https://betaapi.salesbuster.ai/api';
export const SERVER_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

/**
 * Resolves a media path or relative URL into a full valid URI
 */
export const getFullMediaUrl = url => {
  if (!url || typeof url !== 'string') return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('file://')
  ) {
    return url;
  }
  const cleanBase = SERVER_ORIGIN.replace(/\/+$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${BASE_URL}/auth/login`,
    GUEST_REGISTER: `${BASE_URL}/auth/guest-register`,
    SEND_OTP: `${BASE_URL}/auth/send-otp`,
    VERIFY_OTP: `${BASE_URL}/auth/verify-otp`,
    COMPLETE_PROFILE: `${BASE_URL}/auth/complete-profile`,
  },
  LEADS: {
    BASE: `${BASE_URL}/leads`,
  },
  SHOWCASE_SERVICES: `${BASE_URL}/showcase-services`,
  APP_GUIDE_VIDEO: `${BASE_URL}/app-guide-video`,
  WHATSAPP: {
    SOCKET_URL: SERVER_ORIGIN,
  },
  EVENTS: {
    BASE: `${BASE_URL}/events`,
    BY_ID: id => `${BASE_URL}/events/${id}`,
    CONTACTS: id => `${BASE_URL}/events/${id}/contacts`,
    UPDATE_CONTACT_STATUS: (eventId, contactId) =>
      `${BASE_URL}/events/${eventId}/contacts/${contactId}/status`,
    UPDATE_CONTACT: (eventId, contactId) =>
      `${BASE_URL}/events/${eventId}/contacts/${contactId}`,
    DELETE_CONTACT: (eventId, contactId) =>
      `${BASE_URL}/events/${eventId}/contacts/${contactId}`,
    ANALYZE_VOICE_AUDIO: `${BASE_URL}/events/analyze-voice-audio`,
    SCAN_CARD: `${BASE_URL}/events/scan-card`,
  },
  SHORT_URL: {
    SHORTEN: `${BASE_URL}/s/shorten`,
  },
};

