import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GuestAppProvider from './src/context/GuestAppProvider';
import GuestAppNavigator from './src/navigation/GuestAppNavigator';
import { Colors } from './src/styles/Colors';
import { Fonts } from './src/styles/Fonts';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(state.isConnected === false || state.isInternetReachable === false);
    });
    return unsubscribe;
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={Colors.card}
        />
        {isOffline && (
          <View accessibilityRole="alert" style={styles.offlineBanner}>
            <Text style={styles.offlineText}>No internet connection</Text>
          </View>
        )}
        <GuestAppProvider>
          <GuestAppNavigator />
        </GuestAppProvider>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  offlineBanner: {
    backgroundColor: '#B42318',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  offlineText: { color: Colors.white, fontSize: 13, fontWeight: '600',fontFamily:Fonts.regular },
});

export default App;
