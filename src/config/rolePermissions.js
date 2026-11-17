export const PERMISSION_SETUP_STORAGE_PREFIX = '@permission_setup_completed';

export const USER_ROLE_KEYS = {
  GUEST: 'guest',
};

export const ROLE_LABELS = {
  [USER_ROLE_KEYS.GUEST]: 'Workspace',
};

/**
 * Resolve the normalized role key from the authenticated AuthContext user object.
 */
export const resolveUserRoleKey = (user) => {
  return USER_ROLE_KEYS.GUEST;
};

/**
 * Role-and-user-scoped AsyncStorage key so onboarding completion stays
 * isolated per user and role, while never replacing live OS checks.
 */
export const getPermissionSetupKey = (user) => {
  const identifier = user?.id || user?._id || user?.email || 'default';
  return `${PERMISSION_SETUP_STORAGE_PREFIX}:guest:${identifier}`;
};

const PERMISSION_CATALOG = {
  camera: {
    id: 'camera',
    title: 'Camera',
    icon: 'camera',
    isSpecialSetting: false,
    required: false,
    usageTag: 'Used On-Demand Only',
    description:
      'Used strictly to photograph attendee business cards and take lead selfies during events. Never accessed in the background.',
    rationaleTitle: 'Camera Access for Attendee Capture',
    rationaleMessage:
      'SalesBuster needs camera access so you can take attendee selfies and photograph business cards to attach to your event leads. Photos are stored securely in your workspace and never shared without your permission.',
  },
  microphone: {
    id: 'microphone',
    title: 'Microphone',
    icon: 'microphone',
    isSpecialSetting: false,
    required: false,
    usageTag: 'Active Only While Recording',
    description:
      'Powers on-demand AI voice capture to transcribe conversation notes and extract contact details when you tap the mic.',
    rationaleTitle: 'Microphone Access for Voice Notes',
    rationaleMessage:
      'SalesBuster needs microphone access to record your voice notes and extract attendee contact details using AI speech analysis. Audio is only recorded while you actively open or use voice capture.',
  },
  notifications: {
    id: 'notifications',
    title: 'Notifications',
    icon: 'notifications',
    isSpecialSetting: false,
    required: false,
    usageTag: 'Follow-ups & Sync Status',
    description:
      'Delivers timely follow-up reminders, attendee lead sync confirmations, and event updates directly to your screen.',
    rationaleTitle: 'Notification Alerts',
    rationaleMessage:
      'SalesBuster sends notifications to keep you informed of scheduled attendee follow-ups, cloud lead synchronization, and important event alerts.',
  },
  contacts: {
    id: 'contacts',
    title: 'Contacts',
    icon: 'contacts',
    isSpecialSetting: false,
    required: false,
    usageTag: 'Local Device Address Book',
    description:
      'Enables one-tap saving of verified event leads into your phone contacts book and prevents duplicate attendee entries.',
    rationaleTitle: 'Contacts Access for Lead Saving',
    rationaleMessage:
      'SalesBuster requests access to contacts so you can save captured event leads directly into your phone address book with a single tap.',
  },
};

export const GUEST_PERMISSIONS = [
  PERMISSION_CATALOG.camera,
  PERMISSION_CATALOG.microphone,
  PERMISSION_CATALOG.notifications,
  PERMISSION_CATALOG.contacts,
];

/**
 * Return the ordered list of permissions relevant to the Guest role.
 */
export const getPermissionsForRole = (user) => {
  return {
    roleKey: USER_ROLE_KEYS.GUEST,
    roleLabel: ROLE_LABELS[USER_ROLE_KEYS.GUEST],
    permissions: GUEST_PERMISSIONS,
  };
};
