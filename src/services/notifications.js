import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

// 알림 수신 시 동작 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('푸시 알림은 실제 기기에서만 동작합니다.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('푸시 알림 권한이 거부되었습니다.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'AI-bum 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  // 백엔드에 토큰 등록
  try {
    await api.request('/api/notifications/register', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  } catch (e) {
    console.warn('FCM 토큰 등록 실패:', e);
  }

  return token;
}

export function addNotificationListener(callback) {
  const sub = Notifications.addNotificationReceivedListener(callback);
  return () => sub.remove();
}

export function addNotificationResponseListener(callback) {
  const sub = Notifications.addNotificationResponseReceivedListener(callback);
  return () => sub.remove();
}
