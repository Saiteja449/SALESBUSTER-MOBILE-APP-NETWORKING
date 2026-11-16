export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

export const formatTalkTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} min`;
};

export const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getCallTypeColor = (type) => {
  const map = {
    incoming: '#2563EB',
    outgoing: '#16A34A',
    missed: '#DC2626',
    rejected: '#F59E0B',
    not_connected: '#94A3B8',
  };
  return map[type] || '#64748B';
};

export const getPriorityColor = (priority) => {
  const map = {
    high: '#DC2626',
    medium: '#F59E0B',
    low: '#16A34A',
  };
  return map[priority] || '#64748B';
};

export const getAvatarColor = (index) => {
  const colors = [
    '#2563EB',
    '#16A34A',
    '#DC2626',
    '#F59E0B',
    '#8B5CF6',
    '#EC4899',
    '#06B6D4',
    '#F97316',
  ];
  return colors[index % colors.length];
};

export const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Converts raw server errors, Axios errors, network codes, or technical exceptions
 * into clean, human-friendly messages suitable for UI popups.
 */
export const getFriendlyErrorMessage = (
  err,
  fallbackMessage = 'Unable to complete request. Please try again.'
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
