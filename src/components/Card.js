import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, shadow } from '../theme';

export default function Card({ children, style, variant = 'default', ...props }) {
  const bgColor =
    variant === 'lowest'
      ? colors.surfaceContainerLowest
      : variant === 'low'
      ? colors.surfaceContainerLow
      : variant === 'high'
      ? colors.surfaceContainerHigh
      : colors.surfaceContainerLowest;

  return (
    <View style={[styles.card, { backgroundColor: bgColor }, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    ...shadow.md,
  },
});
