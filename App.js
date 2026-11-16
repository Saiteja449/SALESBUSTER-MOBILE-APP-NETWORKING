import React from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import GuestAppProvider from './src/context/GuestAppProvider';
import GuestAppNavigator from './src/navigation/GuestAppNavigator';
import { Colors } from './src/styles/Colors';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={Colors.card}
        />
        <GuestAppProvider>
          <GuestAppNavigator />
        </GuestAppProvider>
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({ container: { flex: 1 } });

export default App;
