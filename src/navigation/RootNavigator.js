import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { SeniorProvider } from '../contexts/SeniorContext';
import { colors } from '../theme';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import PairingScreen from '../screens/PairingScreen';
import VoiceMessageScreen from '../screens/VoiceMessageScreen';
import MedicationScreen from '../screens/MedicationScreen';
import { registerForPushNotifications } from '../services/notifications';

const Stack = createNativeStackNavigator();

function MainApp() {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  return (
    <SeniorProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen
          name="VoiceMessage"
          component={VoiceMessageScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Medication"
          component={MedicationScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </SeniorProvider>
  );
}

export default function RootNavigator() {
  const { loading, isAuthenticated, isPaired } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.gradientStart} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  if (!isPaired) {
    return <PairingScreen />;
  }

  return <MainApp />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
});
