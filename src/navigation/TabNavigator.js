import React, { useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Home,
  BarChart3,
  Image as ImageIcon,
  Bell,
  Settings,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius, fontSize, fontWeight } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import ReportScreen from '../screens/ReportScreen';
import GalleryScreen from '../screens/GalleryScreen';
import NotificationScreen from '../screens/NotificationScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EmergencyModal from '../screens/EmergencyModal';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Home: { label: '홈', Icon: Home },
  Report: { label: '리포트', Icon: BarChart3 },
  Gallery: { label: '갤러리', Icon: ImageIcon },
  Notifications: { label: '알림', Icon: Bell, badge: true },
  Settings: { label: '설정', Icon: Settings },
};

function TabBarIcon({ route, focused }) {
  const { label, Icon, badge } = TAB_CONFIG[route.name];

  if (focused) {
    return (
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.activeTab}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Icon size={20} color={colors.white} />
        <Text style={styles.activeLabel}>{label}</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.inactiveTab}>
      <Icon size={22} color={colors.stone400} />
      <Text style={styles.inactiveLabel}>{label}</Text>
      {badge && (
        <View style={styles.badge} />
      )}
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
            backgroundColor: 'rgba(255,255,255,0.85)',
            elevation: 0,
            shadowColor: '#EA580C',
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
          },
          headerTitleStyle: {
            fontWeight: fontWeight.bold,
            fontSize: fontSize.xl,
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
                <Home size={20} color="#C2410C" />
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
            <TabBarIcon route={route} focused={focused} />
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
        visible={emergencyVisible}
        onClose={() => setEmergencyVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    height: 72,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 0,
    shadowColor: '#1E1B17',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
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
    borderRadius: borderRadius.full,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  activeLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  inactiveTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  inactiveLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.stone400,
    marginTop: 4,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primaryDark,
  },
  headerRight: {
    marginRight: 16,
  },
  emergencyBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeft: {
    marginLeft: 16,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
