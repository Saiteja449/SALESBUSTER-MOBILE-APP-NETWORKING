import axios from 'axios';
import { Linking, Alert, Platform, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, getFullMediaUrl } from '../../utils/constants';
import {
  getFriendlyErrorMessage,
  shortenUrl,
  appendBusinessInfoLink,
} from '../../utils/formatters';
import { shareToWhatsAppSmart } from '../native/DefaultDialer';

const toFriendlyError = (err, fallback) => {
  const friendly = getFriendlyErrorMessage(err, fallback);
  const friendlyErr = new Error(friendly);
  friendlyErr.status = err?.response?.status;
  friendlyErr.response = err?.response;
  friendlyErr.originalError = err;
  return friendlyErr;
};

/**
 * Resolves active authentication token from passed parameter or AsyncStorage
 */
const resolveToken = async (passedToken) => {
  if (passedToken && typeof passedToken === 'string' && passedToken.trim()) {
    return passedToken.trim();
  }
  try {
    const stored = await AsyncStorage.getItem('mysalespilot_token');
    if (stored && typeof stored === 'string' && stored.trim()) {
      return stored.trim();
    }
  } catch (e) {
    console.warn('[eventService] AsyncStorage token fallback error:', e);
  }
  return null;
};

/**
 * Normalizes an attachment object or string into a standard shape for native sharing.
 * Preserves existing metadata, supports diverse key names (url/uri/fileUrl/path,
 * name/fileName/originalName/filename, type/mimeType/contentType), and resolves
 * server paths via getFullMediaUrl while leaving local URIs intact.
 */
const normalizeAttachment = (att) => {
  if (!att) return null;

  // Handle bare string URL or URI
  if (typeof att === 'string') {
    const raw = att.trim();
    if (!raw) return null;
    const isLocal =
      /^(content|file|data):/i.test(raw) ||
      (raw.startsWith('/') && !raw.startsWith('/uploads/')) ||
      /^[A-Za-z]:[\\/]/.test(raw);
    const resolved = isLocal ? raw : getFullMediaUrl(raw.replace(/\\/g, '/'));
    const cleanPath = raw.split('?')[0].split('#')[0];
    const inferredName = cleanPath.split('/').pop() || 'attachment';
    return {
      uri: resolved,
      url: resolved,
      name: inferredName,
      fileName: inferredName,
      type: 'application/octet-stream',
      mimeType: 'application/octet-stream',
    };
  }

  if (typeof att !== 'object') return null;

  const rawSource = att.url || att.uri || att.fileUrl || att.path;
  if (!rawSource || typeof rawSource !== 'string' || !rawSource.trim()) {
    return null;
  }
  const source = rawSource.trim();

  // Keep local content://, file://, data:, or device root paths unmodified
  const isLocalUri =
    /^(content|file|data):/i.test(source) ||
    (source.startsWith('/') && !source.startsWith('/uploads/')) ||
    /^[A-Za-z]:[\\/]/.test(source);

  const normalizedSource = source.replace(/\\/g, '/');
  const resolvedUri = isLocalUri ? source : getFullMediaUrl(normalizedSource);

  // Extract best name across all possible keys
  const rawName = att.name || att.fileName || att.originalName || att.filename;
  let finalName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : '';
  if (!finalName) {
    const cleanPath = normalizedSource.split('?')[0].split('#')[0];
    finalName = cleanPath.split('/').pop() || 'attachment';
  }

  // Extract best MIME type across all possible keys
  const rawType = att.type || att.mimeType || att.contentType;
  const finalType =
    typeof rawType === 'string' && rawType.trim() ? rawType.trim() : 'application/octet-stream';

  return {
    ...att,
    uri: resolvedUri,
    url: resolvedUri,
    name: finalName,
    fileName: finalName,
    type: finalType,
    mimeType: finalType,
    size: typeof att.size === 'number' ? att.size : Number(att.size) || 0,
  };
};

export const WATERMARK_SEPARATOR = '----------------------------------';
export const WATERMARK_TAGLINE = '-Smart networking through';
export const WATERMARK_URL = 'salesbuster.ai';

export const WHATSAPP_WATERMARK = `${WATERMARK_SEPARATOR}\n${WATERMARK_TAGLINE}\n${WATERMARK_URL}`;

/**
 * Appends the standard SalesBuster AI watermark to WhatsApp messages if not already present.
 */
export const appendWhatsAppWatermark = (text = '') => {
  const clean = (text || '').trim();
  if (!clean) return WHATSAPP_WATERMARK;

  // If text already has the full formatted watermark, return as is
  if (clean.includes(WHATSAPP_WATERMARK)) {
    return clean;
  }

  // If text has the legacy single-line watermark, upgrade it to the new 3-part watermark
  if (clean.includes(WATERMARK_TAGLINE)) {
    return clean.replace(WATERMARK_TAGLINE, WHATSAPP_WATERMARK);
  }
  if (/smart\s+networking\s+through\s+salesbuster\s+ai/i.test(clean)) {
    return clean.replace(
      /[-–—]?\s*smart\s+networking\s+through\s+salesbuster\s+ai/i,
      WHATSAPP_WATERMARK
    );
  }

  return `${clean}\n\n${WHATSAPP_WATERMARK}`;
};

export const eventService = {
  async analyzeVoiceAudio(token, { audioUri, eventName }) {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');
    if (!audioUri) throw new Error('Audio recording file is required.');
    const formData = new FormData();
    if (eventName) formData.append('eventName', eventName);
    const cleanUri = audioUri.startsWith('file://') ? audioUri : `file://${audioUri}`;
    formData.append('audio', { uri: cleanUri, name: cleanUri.split('/').pop() || 'guest_voice.wav', type: 'audio/wav' });
    const response = await axios.post(API_ENDPOINTS.EVENTS.ANALYZE_VOICE_AUDIO, formData, {
      headers: { Authorization: `Bearer ${activeToken}`, 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data;
  },

  /**
   * Summarize speech transcript using Gemini AI
   * Extracts: name, phone, companyName, summary, messageText
   */
  async summarizeTranscript(token, { transcript, eventName }) {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');
    if (!transcript || !transcript.trim()) {
      throw new Error('Transcript text is required');
    }

    const res = await axios.post(
      API_ENDPOINTS.EVENTS.SUMMARIZE_TEXT,
      {
        transcript: transcript.trim(),
        eventName: eventName || '',
      },
      {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    return res.data;
  },

  /**
   * Scan visiting / business card photo using Gemini AI
   * Extracts: name, phone, companyName, designation, email, website, address, summary
   */
  async scanBusinessCard(token, { imageBase64, mimeType = 'image/jpeg' }) {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');
    if (!imageBase64 || !imageBase64.trim()) {
      throw new Error('Card image data is required');
    }

    const res = await axios.post(
      API_ENDPOINTS.EVENTS.SCAN_CARD || `${API_ENDPOINTS.EVENTS.BASE}/scan-card`,
      {
        imageBase64: imageBase64.trim(),
        mimeType: mimeType || 'image/jpeg',
      },
      {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 35000,
      }
    );

    return res.data;
  },

  /**
   * Fetch all events for current organization
   */
  async getEvents(token, status = 'active') {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');

    try {
      const res = await axios.get(API_ENDPOINTS.EVENTS.BASE, {
        headers: { Authorization: `Bearer ${activeToken}` },
        params: { status },
        timeout: 15000,
      });

      return res.data;
    } catch (err) {
      console.warn('[eventService] getEvents error:', err?.response?.data || err?.message);
      throw toFriendlyError(err, 'Unable to load events. Please pull down to refresh.');
    }
  },

  /**
   * Create a new event
   */
  async createEvent(token, payload) {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');
    if (!payload?.name || !payload.name.trim()) {
      throw new Error('Event name is required');
    }

    const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
    const localFiles = attachments.filter((att) => att?.uri && !att?.url);
    let data = payload;
    let headers = {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    };

    if (localFiles.length > 0) {
      const form = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (key === 'attachments' || value === undefined || value === null) return;
        form.append(key, value instanceof Date ? value.toISOString() : String(value));
      });
      const remoteAttachments = attachments.filter((att) => att?.url);
      if (remoteAttachments.length > 0) {
        form.append('attachments', JSON.stringify(remoteAttachments));
      }
      localFiles.forEach((file) => {
        form.append('attachments', {
          uri: file.uri,
          type: file.type || 'application/octet-stream',
          name: file.name || 'event-attachment',
        });
      });
      data = form;
      headers = {
        Authorization: `Bearer ${activeToken}`,
        // Omit Content-Type so Axios & React Native set multipart/form-data with the correct boundary
      };
    }

    try {
      const res = await axios.post(API_ENDPOINTS.EVENTS.BASE, data, { headers, timeout: 120000 });
      return res.data;
    } catch (err) {
      console.warn('[eventService] createEvent error:', err?.response?.data || err?.message);
      throw toFriendlyError(err, 'Unable to save event. Please check the details and try again.');
    }
  },

  /**
   * Get event details by ID
   */
  async getEventById(token, eventId) {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');

    const res = await axios.get(API_ENDPOINTS.EVENTS.BY_ID(eventId), {
      headers: { Authorization: `Bearer ${activeToken}` },
      timeout: 15000,
    });

    return res.data;
  },

  /**
   * Update an existing event
   */
  async updateEvent(token, eventId, payload) {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');
    if (!eventId) throw new Error('Event ID is required');

    const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
    const localFiles = attachments.filter((att) => att?.uri && !att?.url);
    let data = payload;
    let headers = {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    };

    if (localFiles.length > 0) {
      const form = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (key === 'attachments' || value === undefined || value === null) return;
        form.append(key, value instanceof Date ? value.toISOString() : String(value));
      });
      const remoteAttachments = attachments.filter((att) => att?.url);
      form.append('replaceAttachments', 'true');
      form.append('existingAttachments', JSON.stringify(remoteAttachments));
      form.append('attachments', JSON.stringify(remoteAttachments));

      localFiles.forEach((file) => {
        let fileName = file.name || 'attachment';
        const fileType = file.type || 'application/octet-stream';
        form.append('attachments', {
          uri: file.uri,
          type: fileType,
          name: fileName,
        });
      });
      data = form;
      headers = {
        Authorization: `Bearer ${activeToken}`,
      };
    }

    try {
      const res = await axios.put(
        API_ENDPOINTS.EVENTS.BY_ID(eventId),
        data,
        {
          headers,
          timeout: 120000,
        }
      );

      return res.data;
    } catch (err) {
      console.warn('[eventService] updateEvent error:', err?.response?.data || err?.message);
      throw toFriendlyError(err, 'Unable to update event. Please check the details and try again.');
    }
  },

  /**
   * Delete or archive an event
   */
  async deleteEvent(token, eventId) {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');

    const res = await axios.delete(API_ENDPOINTS.EVENTS.BY_ID(eventId), {
      headers: { Authorization: `Bearer ${activeToken}` },
      timeout: 15000,
    });

    return res.data;
  },

  /**
   * Fetch contacts under an event
   */
  async getEventContacts(token, eventId, params = {}) {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');

    const res = await axios.get(API_ENDPOINTS.EVENTS.CONTACTS(eventId), {
      headers: { Authorization: `Bearer ${activeToken}` },
      params,
      timeout: 15000,
    });

    return res.data;
  },

  /**
   * Save a captured contact strictly under an Event
   */
  async saveEventContact(token, eventId, contactData) {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');
    if (!eventId) throw new Error('Event ID is required');

    try {
      const res = await axios.post(
        API_ENDPOINTS.EVENTS.CONTACTS(eventId),
        contactData,
        {
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      return res.data;
    } catch (err) {
      console.warn('[eventService] saveEventContact error:', err?.response?.data || err?.message);
      throw toFriendlyError(err, 'Unable to save contact details. Please try again.');
    }
  },

  /**
   * Update contact status (e.g. to 'whatsapp_opened' or 'completed')
   */
  async updateContactStatus(token, eventId, contactId, status) {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');

    const res = await axios.patch(
      API_ENDPOINTS.EVENTS.UPDATE_CONTACT_STATUS(eventId, contactId),
      { status },
      {
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    return res.data;
  },

  /**
   * Fetch platform showcase services managed by Super Admin
   */
  async getShowcaseServices(token) {
    try {
      const activeToken = await resolveToken(token);
      const headers = { 'Content-Type': 'application/json' };
      if (activeToken) {
        headers.Authorization = `Bearer ${activeToken}`;
      }
      const res = await axios.get(API_ENDPOINTS.SHOWCASE_SERVICES, {
        headers,
        timeout: 8000,
      });
      return res.data;
    } catch (err) {
      console.warn('[eventService] getShowcaseServices error:', err.message);
      return { success: false, fallback: true, error: err.message };
    }
  },

  /**
   * Fetch app walkthrough guide video managed by Super Admin (for Info Popup)
   */
  async getAppGuideVideo(token) {
    try {
      const activeToken = await resolveToken(token);
      const headers = { 'Content-Type': 'application/json' };
      if (activeToken) {
        headers.Authorization = `Bearer ${activeToken}`;
      }
      const res = await axios.get(API_ENDPOINTS.APP_GUIDE_VIDEO, {
        headers,
        timeout: 8000,
      });
      return res.data;
    } catch (err) {
      console.warn('[eventService] getAppGuideVideo error:', err.message);
      return { success: false, fallback: true, error: err.message };
    }
  },

  /**
   * Update an existing contact saved under an event
   */
  async updateEventContact(token, eventId, contactId, contactData) {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');

    try {
      const res = await axios.put(
        API_ENDPOINTS.EVENTS.UPDATE_CONTACT(eventId, contactId),
        contactData,
        {
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      return res.data;
    } catch (err) {
      throw toFriendlyError(err, 'Failed to update contact. Please verify your connection.');
    }
  },

  /**
   * Soft delete a contact saved under an event (never hard deleted from database)
   */
  async deleteEventContact(token, eventId, contactId) {
    const activeToken = await resolveToken(token);
    if (!activeToken) throw new Error('Authentication token required. Please log in.');

    try {
      const res = await axios.delete(
        API_ENDPOINTS.EVENTS.DELETE_CONTACT(eventId, contactId),
        {
          headers: {
            Authorization: `Bearer ${activeToken}`,
          },
          timeout: 10000,
        }
      );
      return res.data;
    } catch (err) {
      throw toFriendlyError(err, 'Failed to remove contact. Please try again.');
    }
  },

  /**
   * Open native WhatsApp directly on the mobile phone
   * Launches `whatsapp://send?phone=...&text=...` directly.
   * Does NOT touch SalesBuster CRM connected WhatsApp.
   */
  async openWhatsAppDirect(phone, messageText = '') {
    if (!phone || !phone.trim()) {
      throw new Error('Phone number is required to send WhatsApp message.');
    }

    const cleanDigits = phone.replace(/\D/g, '');
    const intlPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
    const watermarkedText = appendWhatsAppWatermark(messageText || '');
    const encodedText = encodeURIComponent(watermarkedText);

    const directUrl = `whatsapp://send?phone=${intlPhone}&text=${encodedText}`;
    const webFallbackUrl = `https://wa.me/${intlPhone}?text=${encodedText}`;

    try {
      const canOpen = await Linking.canOpenURL(directUrl);
      if (canOpen) {
        await Linking.openURL(directUrl);
      } else {
        await Linking.openURL(webFallbackUrl);
      }
      return { success: true, phone: intlPhone };
    } catch (err) {
      console.warn('[eventService] openWhatsAppDirect Linking error, using fallback:', err);
      try {
        await Linking.openURL(webFallbackUrl);
        return { success: true, phone: intlPhone };
      } catch (fallbackErr) {
        Alert.alert(
          'WhatsApp Not Installed',
          'Could not launch WhatsApp. Please make sure WhatsApp is installed on your phone.'
        );
        throw fallbackErr;
      }
    }
  },

  /**
   * Shares a single image directly to WhatsApp for a recipient phone.
   * On Android, uses sync-aware contact saving (`shareToWhatsAppSmart`) so `ACTION_SEND`
   * only fires once WhatsApp has indexed the contact, otherwise falls back cleanly to
   * `openWhatsAppDirect` with the image URI copied to the clipboard.
   * Strictly enforces: Only one image share. No multiple images, no documents.
   */
  async shareEventFilesToWhatsApp(
    phone,
    messageText = '',
    attachments = [],
    contactMeta = {}
  ) {
    if (!phone || !phone.trim()) {
      throw new Error('Phone number is required to send WhatsApp message.');
    }

    // Ensure sharable link is formatted with professional business info tag if passed in meta
    let finalMessage = messageText || '';
    if (contactMeta?.sharableLink) {
      finalMessage = appendBusinessInfoLink(
        finalMessage,
        contactMeta.sharableLink,
        {
          companyName: contactMeta.companyName || contactMeta.senderCompany,
          fileName: contactMeta.eventFileName,
        }
      );
    }
    finalMessage = appendWhatsAppWatermark(finalMessage);

    const rawAttachments = Array.isArray(attachments)
      ? attachments
      : attachments
      ? [attachments]
      : [];

    const normalizedAttachments = [];
    for (const item of rawAttachments) {
      const normalized = normalizeAttachment(item);
      if (normalized) {
        normalizedAttachments.push(normalized);
      }
    }

    // Keep only image attachments (e.g. attendee selfie)
    const imageAttachments = normalizedAttachments.filter((att) => {
      const type = (att.type || att.mimeType || '').toLowerCase();
      if (type.startsWith('image/')) return true;
      const name = (att.name || att.fileName || att.uri || att.url || '').toLowerCase();
      return /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(name);
    });

    // Enforce strictly ONE image share: only attendee selfie is sent as media.
    // Event files are sent as sharable links in text form.
    const singleImageAttachment = imageAttachments.slice(0, 1);

    if (singleImageAttachment.length === 0) {
      console.log('[eventService] No selfie image attachment to share as media. Opening WhatsApp with text & sharable link.');
      return this.openWhatsAppDirect(phone, finalMessage);
    }

    const { DefaultDialer } = NativeModules;
    if (
      Platform.OS !== 'android' ||
      (!DefaultDialer?.shareToWhatsAppSmart && !DefaultDialer?.shareToWhatsAppWithFiles)
    ) {
      return this.openWhatsAppDirect(phone, finalMessage);
    }

    const cleanDigits = phone.replace(/\D/g, '');
    const intlPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

    try {
      if (DefaultDialer?.shareToWhatsAppSmart) {
        const smartResult = await shareToWhatsAppSmart({
          phone,
          name: contactMeta?.name || '',
          companyName: contactMeta?.companyName || '',
          eventName: contactMeta?.eventName || '',
          messageText: finalMessage,
          files: singleImageAttachment,
          syncTimeoutMs: contactMeta?.syncTimeoutMs || 4500,
        });

        if (smartResult?.launched) {
          return {
            success: true,
            phone: intlPhone,
            sharedFilesCount: 1,
            mode: smartResult.mode || 'action_send_media',
            package: smartResult.package,
            contactSaved: Boolean(smartResult.contactSaved),
            imageCopiedToClipboard: false,
          };
        }

        // Secondary media fallback: Attempt direct ACTION_SEND if smart sync didn't launch
        if (DefaultDialer?.shareToWhatsAppWithFiles) {
          try {
            await DefaultDialer.shareToWhatsAppWithFiles(phone, finalMessage, singleImageAttachment);
            return {
              success: true,
              phone: intlPhone,
              sharedFilesCount: 1,
              mode: 'action_send_media',
            };
          } catch (filesErr) {
            console.warn('[eventService] shareToWhatsAppWithFiles secondary fallback error:', filesErr);
          }
        }

        await this.openWhatsAppDirect(phone, finalMessage);
        return {
          success: true,
          phone: intlPhone,
          sharedFilesCount: 0,
          mode: smartResult?.mode || 'fallback_direct_link',
          contactSaved: Boolean(smartResult?.contactSaved),
          imageCopiedToClipboard: Boolean(smartResult?.imageCopiedToClipboard),
        };
      }

      await DefaultDialer.shareToWhatsAppWithFiles(phone, finalMessage, singleImageAttachment);
      return { success: true, phone: intlPhone, sharedFilesCount: 1, mode: 'action_send_media' };
    } catch (nativeErr) {
      console.warn('[eventService] Native attachment share failed, falling back to direct WhatsApp:', nativeErr);
      // Fallback: If image cannot be opened due to Android permissions (e.g. expired picker URI)
      // or unavailable files, seamlessly open WhatsApp with the message text so lead capture is NEVER blocked!
      await this.openWhatsAppDirect(phone, finalMessage);
      return {
        success: true,
        phone: intlPhone,
        sharedFilesCount: 0,
        mode: 'fallback_direct_link',
        warning: nativeErr?.message || 'Could not attach image due to file permissions.',
      };
    }
  },

  /**
   * Shortens a URL using SalesBuster in-house URL shortener
   */
  async shortenUrl(rawUrl, token) {
    const activeToken = await resolveToken(token);
    return shortenUrl(rawUrl, activeToken);
  },
};
