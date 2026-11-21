import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/system/SplashScreen';
import OnboardingScreen, { APP_ONBOARDING_KEY } from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import GuestRegisterScreen from '../screens/auth/GuestRegisterScreen';
import GuestTabNavigator from './GuestTabNavigator';
import GuestHomeScreen from '../screens/guest/GuestHomeScreen';
import NewEventScreen from '../screens/guest/NewEventScreen';
import LeadCaptureSuccessScreen from '../screens/guest/LeadCaptureSuccessScreen';
import EventContactsScreen from '../screens/guest/EventContactsScreen';
import GuestAccountScreen from '../screens/guest/GuestAccountScreen';
import PermissionSetupScreen from '../screens/system/PermissionSetupScreen';
import SpeechRegistrationScreen from '../screens/auth/SpeechRegistrationScreen';
import { getPermissionSetupKey } from '../config/rolePermissions';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();
const ENABLE_ONBOARDING_FLOW = false;

const GuestAppNavigator = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const isGuest =
    user?.accountType === 'guest' || user?.organization?.accountType === 'guest';
  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState(null);
  const [hasCompletedPermissionSetup, setHasCompletedPermissionSetup] = React.useState(null);
  const [splashDone, setSplashDone] = React.useState(false);

  React.useEffect(() => {
    AsyncStorage.getItem(APP_ONBOARDING_KEY)
      .then((value) => setHasSeenOnboarding(value === 'true'))
      .catch(() => setHasSeenOnboarding(false));
  }, []);

  React.useEffect(() => {
    AsyncStorage.getItem(getPermissionSetupKey(null))
      .then((val) => {
        setHasCompletedPermissionSetup(val === 'true');
      })
      .catch(() => {
        setHasCompletedPermissionSetup(false);
      });
  }, []);

  React.useEffect(() => {
    if (isAuthenticated && !isLoading && !isGuest) {
      logout();
    }
  }, [isAuthenticated, isLoading, isGuest, logout]);

  if (
    !splashDone ||
    isLoading ||
    (ENABLE_ONBOARDING_FLOW && hasSeenOnboarding === null) ||
    hasCompletedPermissionSetup === null
  ) {
    return <SplashScreen onAnimationComplete={() => setSplashDone(true)} />;
  }

  const needsSpeechRegistration =
    isAuthenticated &&
    isGuest &&
    user?.isProfileComplete !== true &&
    (!user?.name || user.name.trim().length === 0 || user.name.startsWith('Guest_'));

  return (
    <View style={styles.root}>
      <NavigationContainer
        theme={{
          ...DarkTheme,
          colors: { ...DarkTheme.colors, background: '#0B0A1F' },
        }}
      >
        <Stack.Navigator
          key={isAuthenticated && isGuest ? 'guest-app' : 'auth-flow'}
          initialRouteName={
            isAuthenticated && isGuest
              ? needsSpeechRegistration
                ? 'SpeechRegistration'
                : 'Main'
              : ENABLE_ONBOARDING_FLOW && !hasSeenOnboarding
              ? 'Onboarding'
              : hasCompletedPermissionSetup
              ? 'Login'
              : 'PermissionSetupBeforeLogin'
          }
          screenOptions={{ headerShown: false }}
        >
          {isAuthenticated && isGuest ? (
            <>
              <Stack.Screen name="SpeechRegistration" component={SpeechRegistrationScreen} />
              <Stack.Screen name="Main" component={GuestTabNavigator} />
              <Stack.Screen name="GuestHome" component={GuestHomeScreen} />
              <Stack.Screen name="NewEvent" component={NewEventScreen} />
              <Stack.Screen name="EditEvent" component={NewEventScreen} />
              <Stack.Screen name="LeadCaptureSuccess" component={LeadCaptureSuccessScreen} />
              <Stack.Screen name="EventContacts" component={EventContactsScreen} />
              <Stack.Screen name="GuestAccount" component={GuestAccountScreen} />
            </>
          ) : (
            <>
              <Stack.Screen name="PermissionSetupBeforeLogin">
                {(props) => (
                  <PermissionSetupScreen
                    {...props}
                    beforeLogin
                    onComplete={() => setHasCompletedPermissionSetup(true)}
                  />
                )}
              </Stack.Screen>
              {ENABLE_ONBOARDING_FLOW ? <Stack.Screen name="Onboarding">
                {(props) => (
                  <OnboardingScreen
                    {...props}
                    onComplete={() => {
                      setHasSeenOnboarding(true);
                      props.navigation.replace(
                        hasCompletedPermissionSetup ? 'Login' : 'PermissionSetupBeforeLogin',
                      );
                    }}
                  />
                )}
              </Stack.Screen> : null}
              {ENABLE_ONBOARDING_FLOW ? <Stack.Screen name="OnboardingScreen">
                {(props) => (
                  <OnboardingScreen
                    {...props}
                    onComplete={() => {
                      setHasSeenOnboarding(true);
                      props.navigation.replace(
                        hasCompletedPermissionSetup ? 'Login' : 'PermissionSetupBeforeLogin',
                      );
                    }}
                  />
                )}
              </Stack.Screen> : null}
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="GuestRegister" component={GuestRegisterScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0A1F' },
});

export default GuestAppNavigator;
