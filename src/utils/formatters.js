import axios from 'axios';
import { API_ENDPOINTS } from './constants.js';

export const formatTime = dateStr => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Converts raw server errors, Axios errors, network codes, or technical exceptions
 * into clean, human-friendly messages suitable for UI popups.
 */
export const getFriendlyErrorMessage = (
  err,
  fallbackMessage = 'Unable to complete request. Please try again.',
) => {
  if (!err) return fallbackMessage;

  const rawMsg =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    (typeof err?.response?.data === 'string' &&
    !err.response.data.includes('<html')
      ? err.response.data
      : null) ||
    err?.message ||
    (typeof err === 'string' ? err : '');

  const statusCode = err?.response?.status || err?.status;
  const lowerMsg = String(rawMsg).toLowerCase();

  // 1. Network / connectivity / timeout
  if (
    err?.code === 'ERR_NETWORK' ||
    err?.code === 'ECONNABORTED' ||
    lowerMsg.includes('network error') ||
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('enotfound') ||
    lowerMsg.includes('failed to connect') ||
    lowerMsg.includes('timeout')
  ) {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  // 2. HTTP Status Code mappings
  if (
    statusCode === 401 ||
    lowerMsg.includes('jwt expired') ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('token required') ||
    lowerMsg.includes('please log in')
  ) {
    return 'Your session has expired. Please log in again to continue.';
  }
  if (
    statusCode === 403 ||
    lowerMsg.includes('forbidden') ||
    lowerMsg.includes('permission denied')
  ) {
    return 'You do not have permission to perform this action.';
  }
  if (statusCode === 404 || lowerMsg.includes('not found')) {
    return 'The requested event or details could not be found.';
  }
  if (
    statusCode === 409 ||
    lowerMsg.includes('e11000') ||
    lowerMsg.includes('duplicate key')
  ) {
    return 'An item with these details already exists. Please check and try again.';
  }
  if (
    statusCode === 413 ||
    lowerMsg.includes('too large') ||
    lowerMsg.includes('payload too large')
  ) {
    return 'The uploaded file or request is too large. Please select smaller files (under 2 MB).';
  }
  if (statusCode >= 500) {
    return 'Server is temporarily unavailable. Please try again in a few moments.';
  }

  // 3. Technical code or stack patterns to scrub
  const isTechnical =
    /status code \d+/i.test(rawMsg) ||
    /<!doctype/i.test(rawMsg) ||
    /<html/i.test(rawMsg) ||
    /objectid/i.test(rawMsg) ||
    /mongoose/i.test(rawMsg) ||
    /cast to/i.test(rawMsg) ||
    /e11000/i.test(rawMsg) ||
    /econn/i.test(rawMsg) ||
    /syntaxerror/i.test(rawMsg) ||
    /referenceerror/i.test(rawMsg) ||
    /typeerror/i.test(rawMsg) ||
    /internal server error/i.test(rawMsg) ||
    /bad gateway/i.test(rawMsg) ||
    /validation failed/i.test(rawMsg) ||
    /at\s+\w+\s+\(/i.test(rawMsg);

  if (isTechnical) {
    return fallbackMessage;
  }

  // 4. Clean up validation prefixes if present
  let cleanMsg = String(rawMsg).trim();
  if (cleanMsg.startsWith('ValidationError:')) {
    cleanMsg = cleanMsg.replace(/^ValidationError:\s*/i, '');
  }
  if (cleanMsg.startsWith('Error:')) {
    cleanMsg = cleanMsg.replace(/^Error:\s*/i, '');
  }

  if (
    !cleanMsg ||
    cleanMsg.length > 200 ||
    cleanMsg.includes('{') ||
    cleanMsg.includes('}')
  ) {
    return fallbackMessage;
  }

  return cleanMsg;
};

export const DEFAULT_CUSTOM_WHATSAPP_MESSAGE =
  "I'm {your_name} from {company_name}. Looking forward to staying connected and exploring potential business opportunities together.";

/**
 * Populates template placeholders ({name}, {there name}, {company}, {event name}, {venue}, {your_name}, {company_name})
 * with runtime contact, event, and sender details.
 */
export const populateWhatsAppMessage = (
  template,
  {
    contactName = '',
    contactCompany = '',
    eventName = '',
    venue = '',
    yourName = '',
    companyName = '',
  } = {},
) => {
  if (!template) return '';
  return template
    .replace(/\{there name\}|\{there_name\}|\{name\}/gi, contactName || 'there')
    .replace(/\{company\}/gi, contactCompany || 'your company')
    .replace(
      /\{event name\}|\{event_name\}|\{event\}/gi,
      eventName || 'the event',
    )
    .replace(/\{venue\}/gi, venue || '')
    .replace(/\{your_name\}|\{your name\}/gi, yourName || '')
    .replace(/\{company_name\}|\{company name\}/gi, companyName || '');
};

const urlCache = new Map();

/**
 * Shortens a URL using our own in-house backend URL shortener.
 * Falls back safely to the original URL if network request fails or times out.
 */
export const shortenUrl = async (rawUrl, token = null) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Check in-memory cache
  if (urlCache.has(trimmed)) {
    return urlCache.get(trimmed);
  }

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await axios.post(
      API_ENDPOINTS.SHORT_URL.SHORTEN,
      { url: trimmed },
      { headers, timeout: 4000 },
    );

    if (res.data?.success && res.data?.shortUrl) {
      const shortUrl = res.data.shortUrl;
      urlCache.set(trimmed, shortUrl);
      return shortUrl;
    }
  } catch (err) {
    console.warn(
      '[formatters] shortenUrl fallback to original:',
      err?.message || err,
    );
  }

  return trimmed;
};

/**
 * Formats a clean, executive business info tag for the link.
 */
export const formatBusinessInfoTag = () => {
  return `📁 *company details:*`;
};

/**
 * Appends the business info tag & link cleanly to the message text.
 * Strips 'https://' or 'http://' from the link for a clean, concise display.
 */
export const appendBusinessInfoLink = (
  messageText = '',
  linkUrl = '',
  { companyName = '' } = {},
) => {
  const cleanUrl = (linkUrl || '').trim();
  if (!cleanUrl) return (messageText || '').trim();

  // Strip https:// or http:// protocol
  const displayUrl = cleanUrl.replace(/^https?:\/\//i, '');

  let text = (messageText || '').trim();

  // If message already contains this link (with or without protocol), don't duplicate
  if (text.includes(cleanUrl) || text.includes(displayUrl)) {
    return text;
  }

  const tag = formatBusinessInfoTag({ companyName });
  const block = `${tag}\n${displayUrl}`;

  if (!text) return block;
  return `${text}\n\n${block}`;
};
