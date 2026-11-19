export const BASE_URL = 'https://api.salesbuster.ai/api';
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
    PAGINATED: `${BASE_URL}/leads/paginated`,
    INBOUND_CALL: `${BASE_URL}/leads/inbound-call`,
    UPLOAD_RECORDING: id => `${BASE_URL}/leads/${id}/recordings`,
  },
  USERS: {
    BASE: `${BASE_URL}/users`,
  },
  FOLLOWUPS: {
    BASE: `${BASE_URL}/followups`,
    AI: `${BASE_URL}/followups/ai`,
    HANDLE_AI: id => `${BASE_URL}/followups/ai/${id}/handle`,
  },
  ANALYTICS: {
    LOG_CALL: `${BASE_URL}/analytics/log-call`,
    TODAY: `${BASE_URL}/analytics/today`,
    BY_USER: salespersonId => `${BASE_URL}/analytics/${salespersonId}`,
  },
  SHOWCASE_SERVICES: `${BASE_URL}/showcase-services`,
  APP_GUIDE_VIDEO: `${BASE_URL}/app-guide-video`,
  ORGANIZATION: {
    SERVICES: `${BASE_URL}/organization/services`,
    SETTINGS: `${BASE_URL}/organization/settings`,
  },
  WHATSAPP: {
    SETTINGS: `${BASE_URL}/whatsapp/settings`,
    AI_TOGGLE: `${BASE_URL}/whatsapp/ai/toggle`,
    STATUS: `${BASE_URL}/whatsapp/status`,
    TEAM_STATUS: `${BASE_URL}/whatsapp/team-status`,
    CONVERSATIONS: `${BASE_URL}/whatsapp/conversations`,
    CONVERSATION: leadId => `${BASE_URL}/whatsapp/conversation/${leadId}`,
    SEND_MESSAGE: `${BASE_URL}/whatsapp/message/send`,
    SUMMARIZE: leadId =>
      `${BASE_URL}/whatsapp/conversation/${leadId}/summarize`,
    LIVE_VOICE_SEND: `${BASE_URL}/whatsapp/manager/live-voice-send`,
    // Backward-compatible aliases
    CHATS: `${BASE_URL}/whatsapp/conversations`,
    MESSAGES: `${BASE_URL}/whatsapp/conversation`,
    SEND: `${BASE_URL}/whatsapp/message/send`,
    SOCKET_URL: SERVER_ORIGIN,
  },
  AI_ASSISTANT: {
    CHAT: `${BASE_URL}/ai-assistant/chat`,
    SESSIONS: `${BASE_URL}/ai-assistant/sessions`,
    SESSION: chatId => `${BASE_URL}/ai-assistant/sessions/${chatId}`,
    CLEAR_ALL: `${BASE_URL}/ai-assistant/sessions`,
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
    SUMMARIZE_TEXT: `${BASE_URL}/events/summarize-text`,
    ANALYZE_VOICE_AUDIO: `${BASE_URL}/events/analyze-voice-audio`,
    SCAN_CARD: `${BASE_URL}/events/scan-card`,
  },
  SHORT_URL: {
    SHORTEN: `${BASE_URL}/s/shorten`,
  },
};

export const paramToTab = {
  new: 'New',
  missedcalls: 'MissedCalls',
  missedcall: 'MissedCalls',
  'missed call': 'MissedCalls',
  todayfollowups: 'TodayFollowup',
  upcomingfollowups: 'UpcomingFollowup',
  notattended: 'NotAttended',
  converted: 'Converted',
  lost: 'Lost',
  oldleads: 'OldLeads',
};

export const tabToParam = {
  New: 'new',
  MissedCalls: 'missedcalls',
  MissedCall: 'missedcalls',
  TodayFollowup: 'todayfollowups',
  UpcomingFollowup: 'upcomingfollowups',
  NotAttended: 'notattended',
  Converted: 'converted',
  Lost: 'lost',
  OldLeads: 'oldleads',
};

export const LEAD_STATUSES = [
  'New',
  'Missed Call',
  'Follow Up',
  'Not Interested',
  'Not Attended',
  'Price Issue',
  'Converted',
];

export const LEAD_STATUS = {
  NEW: 'New',
  MISSED_CALL: 'Missed Call',
  FOLLOW_UP: 'Follow Up',
  NOT_INTERESTED: 'Not Interested',
  NOT_ATTENDED: 'Not Attended',
  PRICE_ISSUE: 'Price Issue',
  CONVERTED: 'Converted',
};

export const normalizeLeadStatus = rawStatus => {
  if (!rawStatus || typeof rawStatus !== 'string') return 'New';
  const clean = rawStatus.trim().toLowerCase().replace(/[_-]/g, ' ');
  if (clean === 'new') return 'New';
  if (clean === 'missed call' || clean === 'missedcall' || clean === 'missed')
    return 'Missed Call';
  if (clean === 'follow up' || clean === 'followup') return 'Follow Up';
  if (
    clean === 'not interested' ||
    clean === 'notinterested' ||
    clean === 'lost'
  )
    return 'Not Interested';
  if (clean === 'not attended' || clean === 'notattended')
    return 'Not Attended';
  if (clean === 'price issue' || clean === 'priceissue') return 'Price Issue';
  if (clean === 'converted' || clean === 'won') return 'Converted';
  const match = LEAD_STATUSES.find(s => s.toLowerCase() === clean);
  return match || rawStatus;
};

export const LEAD_TABS = [
  { key: 'New', label: 'New' },
  { key: 'MissedCalls', label: 'Missed Calls' },
  { key: 'TodayFollowup', label: 'Today Follow-up' },
  { key: 'UpcomingFollowup', label: 'Upcoming Follow-up' },
  { key: 'NotAttended', label: 'Not Attended' },
  { key: 'Converted', label: 'Converted' },
  { key: 'Lost', label: 'Lost' },
  { key: 'OldLeads', label: 'Old Leads' },
];
