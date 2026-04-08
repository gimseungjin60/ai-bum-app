import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from '../components/Icon';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, fontSize } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import ReportScreen from '../screens/ReportScreen';
import GalleryScreen from '../screens/GalleryScreen';
import NotificationScreen from '../screens/NotificationScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EmergencyModal from '../screens/EmergencyModal';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Home: { label: '홈', icon: 'Home' },
  Report: { label: '리포트', icon: 'BarChart3' },
  Gallery: { label: '갤러리', icon: 'Image' },
  Notifications: { label: '알림', icon: 'Bell', badge: true },
  Settings: { label: '설정', icon: 'Settings' },
};

function TabBarIcon({ route, focused }) {
  const { label, icon, badge } = TAB_CONFIG[route.name];

  if (focused) {
    return (
      <View style={styles.activeTab}>
        <Icon name={icon} size={20} color="#FFFFFF" />
        <Text style={styles.activeLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.inactiveTab}>
      <Icon name={icon} size={22} color="#A8A29E" />
      <Text style={styles.inactiveLabel}>{label}</Text>
      {badge ? <View style={styles.badge} /> : null}
    </View>
  );
}

export default function TabNavigator() {
  const [emergencyVisible, setEmergencyVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: '#FFFFFF',
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            color: '#9A3412',
          },
          headerTitle: '오늘의 소중한 순간',
          headerRight: () => (
            <View style={styles.headerRight}>
              <View
                style={styles.emergencyBtn}
                onTouchEnd={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  setEmergencyVisible(true);
                }}
              >
                <Icon name="Home" size={20} color="#C2410C" />
              </View>
            </View>
          ),
          headerLeft: () => (
            <View style={styles.headerLeft}>
              <View style={styles.headerAvatar}>
                <Text style={{ fontSize: 18 }}>👵</Text>
              </View>
            </View>
          ),
          tabBarIcon: ({ focused }) => (
            <TabBarIcon route={route} focused={!!focused} />
          ),
          tabBarShowLabel: false,
          tabBarStyle: styles.tabBar,
        })}
        screenListeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Report" component={ReportScreen} />
        <Tab.Screen name="Gallery" component={GalleryScreen} />
        <Tab.Screen name="Notifications" component={NotificationScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
      <EmergencyModal
        visible={!!emergencyVisible}
        onClose={() => setEmergencyVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    height: 72,
    backgroundColor: '#FFFFFFEA',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 0,
    elevation: 20,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9999,
    backgroundColor: '#EA580C',
  },
  activeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inactiveTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  inactiveLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#A8A29E',
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#AE2F34',
  },
  headerRight: {
    marginRight: 16,
  },
  emergencyBtn: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeft: {
    marginLeft: 16,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    backgroundColor: '#F4EDE5',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
