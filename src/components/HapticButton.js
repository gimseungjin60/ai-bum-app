import React, { useRef } from 'react';
import { Pressable, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function HapticButton({
  children,
  onPress,
  style,
  hapticType = 'light',
  scaleDown = 0.96,
  ...props
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleDown,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    const impactStyle =
      hapticType === 'medium'
        ? Haptics.ImpactFeedbackStyle.Medium
        : hapticType === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Light;

    Haptics.impactAsync(impactStyle);
    onPress?.();
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
