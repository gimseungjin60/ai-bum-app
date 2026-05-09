import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 포그라운드에서도 알림을 표시하도록 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * iOS/Android 실기기에서 Expo 푸시 토큰을 요청합니다.
 * @returns {Promise<string|null>} 푸시 토큰 또는 null
 */
export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'AI-bum 알림',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log('[Notifications] Expo 푸시 토큰:', token);
    return token;
  } catch (e) {
    // 알림 토큰 취득 실패해도 앱 동작에 영향 없음
    console.warn('[Notifications] 토큰 발급 실패 (무시):', e.message);
    return null;
  }
}

export function addNotificationListener(callback) {
  const sub = Notifications.addNotificationReceivedListener(callback);
  return () => sub.remove();
}

export function addNotificationResponseListener(callback) {
  const sub = Notifications.addNotificationResponseReceivedListener(callback);
  return () => sub.remove();
}
