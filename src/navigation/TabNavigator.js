import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import HapticButton from '../components/HapticButton';
import * as Haptics from 'expo-haptics';
import { colors, fontSize, fontWeight } from '../theme';

import HomeScreen from '../screens/HomeScreen';
import ReportScreen from '../screens/ReportScreen';
import GalleryScreen from '../screens/GalleryScreen';
import NotificationScreen from '../screens/NotificationScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EmergencyModal from '../screens/EmergencyModal';

const Tab = createBottomTabNavigator();

const TAB_CONFIG = {
  Home: { label: '홈', icon: 'Home', headerTitle: '오늘의 소중한 순간' },
  Report: { label: '리포트', icon: 'BarChart3', headerTitle: '리포트' },
  Gallery: { label: '갤러리', icon: 'Image', headerTitle: '갤러리' },
  Notifications: { label: '알림', icon: 'Bell', badge: true, headerTitle: '알림' },
  Settings: { label: '설정', icon: 'Settings', headerTitle: '설정' },
};

// 커스텀 탭바 — RN 기본 tabBarIcon 영역 제약(가로 pill 잘림)을 피해 직접 렌더
function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const cfg = TAB_CONFIG[route.name];
        if (!cfg) return null;
        const focused = state.index === index;

        const onPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
            <View style={[styles.tabInner, focused && styles.tabInnerActive]}>
              <View>
                <Icon
                  name={cfg.icon}
                  size={focused ? 20 : 22}
                  color={focused ? colors.onPrimary : colors.stone400}
                />
                {cfg.badge && !focused ? <View style={styles.badge} /> : null}
              </View>
              <Text style={[styles.tabLabel, focused ? styles.tabLabelActive : null]}>
                {cfg.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabNavigator() {
  const [emergencyVisible, setEmergencyVisible] = useState(false);

  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={({ route }) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.surfaceContainerLowest,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTitleStyle: {
            fontWeight: fontWeight.bold,
            fontSize: fontSize.xl,
            color: colors.secondary,
          },
          headerTitle: TAB_CONFIG[route.name]?.headerTitle || '오늘의 소중한 순간',
          headerRight: () => (
            <HapticButton
              hapticType="heavy"
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setEmergencyVisible(true);
              }}
              style={styles.emergencyBtn}
            >
              <Icon name="AlertTriangle" size={22} color={colors.error} />
            </HapticButton>
          ),
          headerLeft: () => (
            <View style={styles.headerLeft}>
              <View style={styles.headerAvatar}>
                <Text style={{ fontSize: fontSize.xl }}>👵</Text>
              </View>
            </View>
          ),
        })}
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
    flexDirection: 'row',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  tabInnerActive: {
    backgroundColor: colors.gradientStart,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: colors.stone400,
  },
  tabLabelActive: {
    color: colors.onPrimary,
    fontWeight: fontWeight.bold,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryDark,
  },
  emergencyBtn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: colors.errorContainer,
  },
  headerLeft: {
    marginLeft: 16,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
