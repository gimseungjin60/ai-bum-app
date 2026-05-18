import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';

const PHONE_MAX_WIDTH = 430;
const isWeb = Platform.OS === 'web';

export default function App() {
  const content = (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" backgroundColor="#FFFAF5" />
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );

  if (isWeb) {
    return (
      <View style={styles.webRoot}>
        <View style={styles.webPhoneFrame}>{content}</View>
      </View>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  webRoot: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },
  webPhoneFrame: {
    width: '100%',
    maxWidth: PHONE_MAX_WIDTH,
    height: '100%',
    minHeight: '100vh',
    backgroundColor: '#FFFAF5',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
  },
});
