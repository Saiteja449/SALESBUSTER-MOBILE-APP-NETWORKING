const PERMISSION_SETUP_STORAGE_PREFIX = '@permission_setup_completed';

const USER_ROLE_KEYS = {
  GUEST: 'guest',
};

const ROLE_LABELS = {
  [USER_ROLE_KEYS.GUEST]: 'Workspace',
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
    description: 'Used to capture attendee selfies and business card photos.',
    rationaleTitle: 'Camera Access',
    rationaleMessage:
      'Allows you to capture attendee photos and business cards and attach them to leads.',
  },

  microphone: {
    id: 'microphone',
    title: 'Microphone',
    icon: 'microphone',
    isSpecialSetting: false,
    required: false,
    description: 'Used for voice recording, AI transcription, and contact extraction.',
    rationaleTitle: 'Microphone Access',
    rationaleMessage:
      'Allows you to record voice notes and use AI to extract conversation details and contact information.',
  },

  notifications: {
    id: 'notifications',
    title: 'Notifications',
    icon: 'notifications',
    isSpecialSetting: false,
    required: false,
    usageTag: 'Reminders & Updates',
    description: 'Provides follow-up reminders, lead sync updates, and event alerts.',
    rationaleTitle: 'Notification Access',
    rationaleMessage:
      'Keeps you updated with follow-up reminders, lead synchronization, and important alerts.',
  },

  contacts: {
    id: 'contacts',
    title: 'Contacts',
    icon: 'contacts',
    isSpecialSetting: false,
    required: false,
    usageTag: 'Save Leads to Contacts',
    description: 'Used to save verified leads directly to your phone contacts.',
    rationaleTitle: 'Contacts Access',
    rationaleMessage:
      'Allows you to save captured leads to your phone contacts and avoid duplicate entries.',
  },
};

const GUEST_PERMISSIONS = [
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
