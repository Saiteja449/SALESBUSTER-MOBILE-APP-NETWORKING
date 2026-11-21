import { io } from 'socket.io-client';
import { API_ENDPOINTS, SERVER_ORIGIN } from '../../utils/constants';

/**
 * Singleton Socket.io Service for WhatsApp Live Updates
 * Prevents multiple competing connections and manages unified room subscriptions.
 */
class WhatsAppSocketService {
  constructor() {
    this.socket = null;
    this.token = null;
    this.organizationId = null;
    this.userId = null;
    this.listeners = new Map();
    this.isConnecting = false;
  }

  getSocketUrl() {
    const raw = API_ENDPOINTS.WHATSAPP.SOCKET_URL || SERVER_ORIGIN || 'https://api.salesbuster.ai';
    try {
      const parsed = new URL(raw);
      return parsed.origin;
    } catch (e) {
      return String(raw).replace(/\/api\/?$/, '');
    }
  }

  connect({ token, organizationId, userId, user } = {}) {
    const effectiveToken = token || user?.token;
    if (!effectiveToken) {
      console.log('🔌 [WhatsApp Socket] Cannot connect: No token provided');
      return;
    }

    // Resolve Organization ID (handle object vs string)
    let orgId =
      organizationId ||
      user?.organization?._id ||
      user?.organization?.id ||
      (typeof user?.organization === 'string' ? user.organization : '') ||
      user?.organizationId ||
      user?.tenantDbName ||
      '';
    if (typeof orgId === 'object' && orgId !== null) {
      orgId = orgId._id || orgId.id || '';
    }
    orgId = String(orgId).trim();

    // Resolve User ID
    const uId = String(userId || user?.id || user?._id || '').trim();

    // If already connected with the same token, update credentials and rooms if needed
    if (this.socket && this.socket.connected && this.token === effectiveToken) {
      const orgChanged = orgId && this.organizationId !== orgId;
      const userChanged = uId && this.userId !== uId;
      if (orgChanged || userChanged) {
        if (orgId) this.organizationId = orgId;
        if (uId) this.userId = uId;
        console.log('🔌 [WhatsApp Socket] Credentials updated on existing connection, rejoining rooms:', {
          orgId: this.organizationId,
          userId: this.userId,
        });
        this.joinRooms();
      } else {
        console.log('🔌 [WhatsApp Socket] Already connected with active session');
      }
      return;
    }

    // If reconnecting with new token/credentials, clean up previous socket
    if (this.socket) {
      console.log('🔌 [WhatsApp Socket] Disconnecting existing socket before re-establishing');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.token = effectiveToken;
    this.organizationId = orgId;
    this.userId = uId;
    this.isConnecting = true;

    const socketUrl = this.getSocketUrl();
    console.log('🔌 [WhatsApp Socket] Initializing connection to:', socketUrl, {
      orgId,
      userId: uId,
      hasToken: Boolean(effectiveToken),
    });

    const authPayload = {
      token: effectiveToken,
      ...(orgId ? { organizationId: orgId, orgId } : {}),
      ...(uId ? { userId: uId, uId } : {}),
    };

    const socket = io(socketUrl, {
      transports: ['websocket'],
      path: '/socket.io/',
      auth: authPayload,
      query: authPayload,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
      timeout: 20000,
    });

    this.socket = socket;

    socket.on('connect', () => {
      this.isConnecting = false;
      console.log('✅ 🔌 [WhatsApp Socket] Connected successfully! Socket ID:', socket.id);
      this.joinRooms();
    });

    socket.on('connect_error', (error) => {
      this.isConnecting = false;
      console.warn('⚠️ 🔌 [WhatsApp Socket] Connection error:', error?.message || error);
    });

    socket.on('disconnect', (reason) => {
      this.isConnecting = false;
      console.log('🔌 [WhatsApp Socket] Disconnected. Reason:', reason);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 🔌 [WhatsApp Socket] Reconnected after attempt:', attemptNumber);
      this.joinRooms();
    });

    // Wire global event handlers (dispatch each server event to subscribers exactly once)
    const forwardEvent = (eventName, data) => {
      const callbacks = this.listeners.get(eventName);
      if (!callbacks || callbacks.size === 0) return;
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in socket listener for ${eventName}:`, e);
        }
      });
    };

    const onConversationUpdated = (data) => {
      forwardEvent('conversation_updated', data);
    };

    const onMessageReceived = (data) => {
      forwardEvent('new_message', data);
    };

    const onStatusReceived = (data) => {
      forwardEvent('whatsapp_status', data);
    };

    const onQrReceived = (data) => {
      forwardEvent('whatsapp_qr', data);
    };

    const onPairingCodeReceived = (data) => {
      forwardEvent('whatsapp_pairing_code', data);
    };

    // Conversation event names
    const conversationEvents = [
      'conversation_updated_rich',
      'conversation_updated',
      'conversation_update',
      'conversations_updated',
      'conversation',
    ];
    conversationEvents.forEach((evt) => socket.on(evt, onConversationUpdated));

    // Message event names
    const messageEvents = [
      'new_message',
      'whatsapp_message',
      'whatsapp_new_message',
      'message',
      'chat_message',
      'message_received',
      'incoming_message',
    ];
    messageEvents.forEach((evt) => socket.on(evt, onMessageReceived));

    // Status event names
    const statusEvents = [
      'whatsapp_status',
      'session_status',
      'status_update',
      'whatsapp_connected',
      'whatsapp_disconnected',
      'connection_update',
    ];
    statusEvents.forEach((evt) => socket.on(evt, onStatusReceived));

    // Pairing / QR events
    ['whatsapp_qr', 'qr'].forEach((evt) => socket.on(evt, onQrReceived));
    ['whatsapp_pairing_code', 'pairing_code'].forEach((evt) => socket.on(evt, onPairingCodeReceived));

    // Fallback wildcard listener for unknown server event names (dispatches once, no logging)
    const knownEvents = new Set([
      ...conversationEvents,
      ...messageEvents,
      ...statusEvents,
      'whatsapp_qr',
      'qr',
      'whatsapp_pairing_code',
      'pairing_code',
    ]);
    if (socket.onAny) {
      socket.onAny((event, ...args) => {
        if (knownEvents.has(event)) return;
        const lower = String(event).toLowerCase();
        if (lower.includes('conversation')) {
          onConversationUpdated(args[0]);
        } else if (lower.includes('message')) {
          onMessageReceived(args[0]);
        } else if (lower.includes('status') || lower.includes('connect')) {
          onStatusReceived(args[0]);
        } else {
          forwardEvent(event, args[0]);
        }
      });
    }
  }

  joinRooms() {
    if (!this.socket || !this.socket.connected) return;

    const org = this.organizationId ? String(this.organizationId).replace(/^org_/, '') : '';
    const uid = this.userId ? String(this.userId).replace(/^user_/, '') : '';

    const rooms = new Set();

    if (org) {
      rooms.add(`org_${org}`);
      rooms.add(org);
    }
    if (uid) {
      rooms.add(`user_${uid}`);
      rooms.add(uid);
    }
    if (org && uid) {
      rooms.add(`org_${org}_user_${uid}`);
      rooms.add(`${org}_${uid}`);
    }

    rooms.forEach((room) => {
      console.log('🚪 🔌 [WhatsApp Socket] Joining room:', room);
      this.socket.emit('join', room);
      this.socket.emit('join_room', room);
      this.socket.emit('joinRoom', room);
      this.socket.emit('subscribe', room);
    });
  }

  getSocket() {
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 [WhatsApp Socket] Manual disconnect requested');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.token = null;
    this.organizationId = null;
    this.userId = null;
    this.isConnecting = false;
  }
}

export const whatsappSocketService = new WhatsAppSocketService();
export default whatsappSocketService;
