import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_ENDPOINTS } from '../utils/constants';
import { setPostCallPopupEnabled } from '../services/native/PostCallBridge';
import { saveAuthToken, saveUserPhoneNumber } from '../services/native/DefaultDialer';
import { whatsappSocketService } from '../services/socket/whatsappSocketService';

const AuthContext = createContext(null);

let globalSetSuspendedHandler = null;

export const triggerGlobalSuspension = (message) => {
  if (globalSetSuspendedHandler) {
    globalSetSuspendedHandler(
      message ||
      'Your organization workspace (Demo CRM) is currently suspended. Please contact SalesBuster administrator.'
    );
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspensionMessage, setSuspensionMessage] = useState('');

  const logout = useCallback(async () => {
    setUser(null);
    setIsAuthenticated(false);
    setIsSuspended(false);
    setSuspensionMessage('');
    whatsappSocketService.disconnect();
    await AsyncStorage.removeItem('mysalespilot_token');
    await AsyncStorage.removeItem('mysalespilot_session_user');
    await setPostCallPopupEnabled(false);
    await saveAuthToken(null);
    await saveUserPhoneNumber(null);
  }, []);

  const handleSuspension = useCallback((message) => {
    const displayMsg =
      message ||
      'Your organization workspace (Demo CRM) is currently suspended. Please contact SalesBuster administrator.';
    setIsSuspended(true);
    setSuspensionMessage(displayMsg);
  }, []);

  useEffect(() => {
    globalSetSuspendedHandler = handleSuspension;
    return () => {
      globalSetSuspendedHandler = null;
    };
  }, [handleSuspension]);

  // Check organization status and unsuspended state
  const checkOrganizationStatus = useCallback(async () => {
    try {
      const isGuestUser = Boolean(
        user?.accountType === 'guest' ||
        user?.organization?.accountType === 'guest'
      );
      if (isGuestUser) {
        return { success: true, suspended: false };
      }

      const savedToken = (await AsyncStorage.getItem('mysalespilot_token')) || user?.token;
      if (!savedToken) {
        return { success: false, suspended: false, message: 'No active session' };
      }

      const res = await axios.get(
        `${API_ENDPOINTS.LEADS.BASE}/paginated?limit=1&leadTypeTab=New`,
        {
          headers: { Authorization: `Bearer ${savedToken}` },
        }
      );

      const data = res.data;
      if (
        data &&
        (data.organizationStatus === 'suspended' ||
          data.accountSuspended === true ||
          (typeof data.message === 'string' &&
            data.message.toLowerCase().includes('organization') &&
            data.message.toLowerCase().includes('suspended')))
      ) {
        setIsSuspended(true);
        setSuspensionMessage(
          data.message ||
          'Your organization workspace (Demo CRM) is currently suspended. Please contact SalesBuster administrator.'
        );
        return { success: false, suspended: true, message: data.message };
      }

      // Workspace is active
      setIsSuspended(false);
      setSuspensionMessage('');
      return { success: true, suspended: false };
    } catch (error) {
      const errData = error?.response?.data;
      if (
        errData &&
        (errData.organizationStatus === 'suspended' ||
          errData.accountSuspended === true ||
          (typeof errData.message === 'string' &&
            errData.message.toLowerCase().includes('organization') &&
            errData.message.toLowerCase().includes('suspended')))
      ) {
        setIsSuspended(true);
        setSuspensionMessage(
          errData.message ||
          'Your organization workspace (Demo CRM) is currently suspended. Please contact SalesBuster administrator.'
        );
        return { success: false, suspended: true, message: errData.message };
      }

      return {
        success: false,
        suspended: isSuspended,
        message: errData?.message || error.message,
      };
    }
  }, [user?.token, isSuspended]);

  // Setup Axios global response & error interceptors to catch suspended org status across ALL APIs
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => {
        const data = response?.data;
        if (
          data &&
          (data.organizationStatus === 'suspended' ||
            data.accountSuspended === true ||
            (typeof data.message === 'string' &&
              data.message.toLowerCase().includes('organization') &&
              data.message.toLowerCase().includes('suspended')))
        ) {
          handleSuspension(data.message);
        }
        return response;
      },
      (error) => {
        const errorData = error?.response?.data;
        if (
          errorData &&
          (errorData.organizationStatus === 'suspended' ||
            errorData.accountSuspended === true ||
            (typeof errorData.message === 'string' &&
              errorData.message.toLowerCase().includes('organization') &&
              errorData.message.toLowerCase().includes('suspended')))
        ) {
          handleSuspension(errorData.message);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [handleSuspension]);

  // Check for saved session on app start
  useEffect(() => {
    const loadSession = async () => {
      try {
        const savedSession = await AsyncStorage.getItem('mysalespilot_session_user');
        const savedToken = await AsyncStorage.getItem('mysalespilot_token');
        if (savedSession) {
          const parsedUser = JSON.parse(savedSession);
          if (savedToken && !parsedUser.token) {
            parsedUser.token = savedToken;
          }
          const isGuest = parsedUser.accountType === 'guest' || parsedUser.organization?.accountType === 'guest';
          const isProfileComplete = Boolean(
            parsedUser.isProfileComplete ||
            (parsedUser.name && parsedUser.name.trim().length > 0 && !parsedUser.name.startsWith('Guest_'))
          );
          parsedUser.isProfileComplete = isProfileComplete;
          const isManager = Boolean(
            parsedUser.isManager ||
            parsedUser.rawRole === 'sales manager' ||
            parsedUser.role?.toLowerCase() === 'sales manager' ||
            parsedUser.role === 'Sales Manager' ||
            parsedUser.isOrgOwner ||
            parsedUser.organization?.isOrgOwner
          );
          setUser(parsedUser);
          setIsAuthenticated(true);
          setIsLoading(false);

          // Sync native bridge state in parallel without blocking initial render
          const tokenPromise = parsedUser.token && !isGuest
            ? saveAuthToken(parsedUser.token)
            : isGuest
            ? saveAuthToken(null)
            : Promise.resolve();
          const phonePromise = (parsedUser.phone || parsedUser.mobile) && !isGuest
            ? saveUserPhoneNumber(parsedUser.phone || parsedUser.mobile)
            : isGuest
            ? saveUserPhoneNumber(null)
            : Promise.resolve();
          Promise.allSettled([
            setPostCallPopupEnabled(!isManager && !isGuest),
            tokenPromise,
            phonePromise,
          ]).catch(() => {});
        } else {
          setIsLoading(false);
          Promise.allSettled([
            setPostCallPopupEnabled(false),
            saveAuthToken(null),
            saveUserPhoneNumber(null),
          ]).catch(() => {});
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);



  const login = useCallback(async (email, password) => {
    try {
      const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN, { email, password });
      const data = response.data;

      if (data.success === false && !data.organizationStatus && !data.accountSuspended) {
        return { success: false, message: data.message || 'Login failed' };
      }

      const accountType = data.accountType || data.organization?.accountType || 'crm';
      if (accountType !== 'guest') {
        return {
          success: false,
          message: 'This app is for guest accounts. Create or use a guest account to continue.',
        };
      }

      const roleMap = {
        'sales manager': 'Sales Manager',
        'sales person': 'Sales Representative',
        user: 'User',
      };

      const rawRole = (data.role || '').toLowerCase();
      const isManager = rawRole === 'sales manager' || data.organization?.isOrgOwner || data.isOrgOwner;

      const userWithToken = {
        id: data._id,
        _id: data._id,
        name: data.name || email.split('@')[0],
        email: data.email,
        phone: data.phone || data.mobile,
        role: roleMap[rawRole] || data.role,
        rawRole: rawRole,
        accountType,
        isOrgOwner: !!(data.organization?.isOrgOwner || data.isOrgOwner),
        isManager: isManager,
        token: data.token,
        tenantDbName: data.tenantDbName,
        organization: data.organization,
        services: (data.organization?.services || []).map(s => (typeof s === 'string' ? s : s.name)),
        avatar: data.name
          ? data.name.substring(0, 2).toUpperCase()
          : email.substring(0, 2).toUpperCase(),
      };

      setUser(userWithToken);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('mysalespilot_token', data.token);
      await AsyncStorage.setItem('mysalespilot_session_user', JSON.stringify(userWithToken));
      await setPostCallPopupEnabled(!isManager);
      if (data.token) {
        await saveAuthToken(data.token);
      }
      if (data.phone || data.mobile) {
        await saveUserPhoneNumber(data.phone || data.mobile);
      }

      if (data.organizationStatus === 'suspended' || data.accountSuspended === true) {
        handleSuspension(data.message);
        return {
          success: true,
          accountSuspended: true,
          organizationStatus: 'suspended',
          message:
            data.message ||
            'Your organization workspace (Demo CRM) is currently suspended. Please contact SalesBuster administrator.',
          user: userWithToken,
        };
      }

      setIsSuspended(false);
      setSuspensionMessage('');
      return { success: data.success ?? true, user: userWithToken };
    } catch (error) {
      console.error('Login error:', error);
      const errData = error.response?.data;
      if (errData && (errData.organizationStatus === 'suspended' || errData.accountSuspended === true)) {
        handleSuspension(errData.message);
      }
      const message = errData?.message || 'Network error connecting to server.';
      const success = errData?.success ?? false;
      return { success, message };
    }
  }, [handleSuspension]);

  const registerGuest = useCallback(async (name, email, phone, password) => {
    try {
      const response = await axios.post(API_ENDPOINTS.AUTH.GUEST_REGISTER, {
        name,
        email,
        phone,
        password,
      });
      const data = response.data;

      if (!data.success) {
        return { success: false, message: data.message || 'Registration failed' };
      }

      const userWithToken = {
        id: data._id,
        _id: data._id,
        name: data.name || email.split('@')[0],
        email: data.email,
        phone: data.phone,
        role: 'Sales Manager',
        rawRole: 'sales manager',
        accountType: 'guest',
        isOrgOwner: true,
        isManager: true,
        token: data.token,
        tenantDbName: data.tenantDbName,
        organization: data.organization,
        services: [],
        avatar: data.name
          ? data.name.substring(0, 2).toUpperCase()
          : email.substring(0, 2).toUpperCase(),
      };

      setUser(userWithToken);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('mysalespilot_token', data.token);
      await AsyncStorage.setItem('mysalespilot_session_user', JSON.stringify(userWithToken));
      await setPostCallPopupEnabled(false);
      if (data.token) {
        await saveAuthToken(data.token);
      }
      if (data.phone) {
        await saveUserPhoneNumber(data.phone);
      }

      setIsSuspended(false);
      setSuspensionMessage('');
      return { success: true, user: userWithToken };
    } catch (error) {
      console.error('Guest registration error:', error);
      const errData = error.response?.data;
      const message = errData?.message || 'Network error connecting to server.';
      const code = errData?.code || 'REGISTRATION_ERROR';
      return { success: false, message, code };
    }
  }, []);

  const sendOtp = useCallback(async (phone) => {
    try {
      const response = await axios.post(API_ENDPOINTS.AUTH.SEND_OTP, { phone });
      const data = response.data;
      return {
        success: data.success ?? true,
        message: data.message || 'OTP sent successfully',
        debugOtp: data.debugOtp,
      };
    } catch (error) {
      console.error('Send OTP error:', error);
      const errData = error.response?.data;
      const message = errData?.message || 'Failed to send OTP. Please try again.';
      return { success: false, message };
    }
  }, []);

  const verifyOtp = useCallback(async (phone, otp) => {
    try {
      const response = await axios.post(API_ENDPOINTS.AUTH.VERIFY_OTP, { phone, otp });
      const data = response.data;

      if (!data.success) {
        return { success: false, message: data.message || 'OTP verification failed' };
      }

      const isProfileComplete = Boolean(
        data.isProfileComplete ||
        (data.name && data.name.trim().length > 0 && !data.name.startsWith('Guest_') && data.companyName && !data.companyName.includes("'s Workspace"))
      );
      const userWithToken = {
        id: data._id || data.id,
        _id: data._id || data.id,
        name: isProfileComplete ? (data.name || '') : '',
        phone: data.phone || phone,
        email: data.email || '',
        companyName: isProfileComplete ? (data.companyName || '') : '',
        role: isProfileComplete ? (data.role || '') : '',
        city: isProfileComplete ? (data.city || '') : '',
        accountType: 'guest',
        isOrgOwner: true,
        isManager: true,
        isProfileComplete,
        token: data.token,
        tenantDbName: data.tenantDbName,
        organization: data.organization,
        services: (data.organization?.services || []).map(s => (typeof s === 'string' ? s : s.name)),
        avatar: data.name ? data.name.substring(0, 2).toUpperCase() : 'G',
      };

      setUser(userWithToken);
      setIsAuthenticated(true);
      await AsyncStorage.setItem('mysalespilot_token', data.token);
      await AsyncStorage.setItem('mysalespilot_session_user', JSON.stringify(userWithToken));
      await setPostCallPopupEnabled(false);
      if (data.token) {
        await saveAuthToken(data.token);
      }
      if (data.phone) {
        await saveUserPhoneNumber(data.phone);
      }

      setIsSuspended(false);
      setSuspensionMessage('');
      return {
        success: true,
        user: userWithToken,
        isProfileComplete,
      };
    } catch (error) {
      console.error('Verify OTP error:', error);
      const errData = error.response?.data;
      const message = errData?.message || 'Invalid or expired OTP. Please try again.';
      return { success: false, message };
    }
  }, []);

  const completeProfile = useCallback(async ({ name, companyName, role, city, email }) => {
    try {
      const savedToken = (await AsyncStorage.getItem('mysalespilot_token')) || user?.token;
      const response = await axios.post(
        API_ENDPOINTS.AUTH.COMPLETE_PROFILE,
        { name, companyName, role, city, email },
        {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        }
      );
      const data = response.data;

      if (!data.success) {
        return { success: false, message: data.message || 'Profile completion failed' };
      }

      const updatedUser = {
        ...user,
        name: data.name !== undefined ? data.name : name,
        companyName: data.companyName !== undefined ? data.companyName : (companyName || ''),
        role: data.role !== undefined ? data.role : (role || ''),
        city: data.city !== undefined ? data.city : (city || ''),
        email: data.email !== undefined ? data.email : (email || ''),
        isProfileComplete: true,
        organization: data.organization || user?.organization,
        avatar: (data.name || name || 'Guest').substring(0, 2).toUpperCase(),
      };

      setUser(updatedUser);
      await AsyncStorage.setItem('mysalespilot_session_user', JSON.stringify(updatedUser));
      if (data.token) {
        await AsyncStorage.setItem('mysalespilot_token', data.token);
      }

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Complete Profile error:', error);
      const errData = error.response?.data;
      const message = errData?.message || 'Failed to complete profile registration.';
      return { success: false, message };
    }
  }, [user]);

  const updateProfile = useCallback((updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  }, []);

  const isGuest = Boolean(
    user?.accountType === 'guest' ||
    user?.organization?.accountType === 'guest'
  );

  const token = user?.token || null;

  const value = useMemo(
    () => ({
      user,
      isGuest,
      token,
      isAuthenticated,
      isLoading,
      isSuspended,
      suspensionMessage,
      checkOrganizationStatus,
      setIsSuspended,
      login,
      registerGuest,
      sendOtp,
      verifyOtp,
      completeProfile,
      logout,
      updateProfile,
    }),
    [
      user,
      isGuest,
      token,
      isAuthenticated,
      isLoading,
      isSuspended,
      suspensionMessage,
      checkOrganizationStatus,
      login,
      registerGuest,
      sendOtp,
      verifyOtp,
      completeProfile,
      logout,
      updateProfile,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
