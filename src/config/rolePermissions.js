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
    description: 'Capture business cards and attendee selfies during event leads capture.',
  },
  microphone: {
    id: 'microphone',
    title: 'Microphone',
    icon: 'microphone',
    isSpecialSetting: false,
    required: false,
    description: 'Power live AI voice capture and attendee conversation transcription.',
  },
  notifications: {
    id: 'notifications',
    title: 'Notifications',
    icon: 'notifications',
    isSpecialSetting: false,
    required: false,
    description: 'Receive event reminders, lead sync notifications, and follow-up updates.',
  },
  contacts: {
    id: 'contacts',
    title: 'Contacts',
    icon: 'contacts',
    isSpecialSetting: false,
    required: false,
    description: 'Select or save event contacts when you use contact capture features.',
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
