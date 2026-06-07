import React from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HapticButton from './HapticButton';
import Icon from './Icon';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadow } from '../theme';

/**
 * 앱 전반에서 일관된 버튼. 화면마다 제각각이던 버튼 스타일을 대체한다.
 * variant: primary(오렌지 그라데이션) | secondary(연한 면) | tertiary(텍스트) | danger(빨강)
 */
const VARIANTS = {
  primary: { fg: colors.onPrimary },
  secondary: { bg: colors.surfaceContainerHigh, fg: colors.onSurface },
  tertiary: { bg: 'transparent', fg: colors.primary },
  danger: { bg: colors.error, fg: colors.onError },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  size = 'md', // md(54) | sm(44)
  style,
  textStyle,
  hapticType = 'medium',
  ...props
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;
  const minHeight = size === 'sm' ? 44 : 54;

  const inner = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={v.fg} /> : null}
          {title ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.text, { color: v.fg }, textStyle]}
            >
              {title}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );

  const base = [
    styles.base,
    { minHeight },
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
  ];

  // primary는 그라데이션 면, 나머지는 단색 면
  if (variant === 'primary') {
    return (
      <HapticButton
        onPress={isDisabled ? undefined : onPress}
        hapticType={hapticType}
        style={[fullWidth && styles.fullWidth, style]}
        {...props}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[base, shadow.sm]}
        >
          {inner}
        </LinearGradient>
      </HapticButton>
    );
  }

  return (
    <HapticButton
      onPress={isDisabled ? undefined : onPress}
      hapticType={hapticType}
      style={[base, { backgroundColor: v.bg }, variant !== 'tertiary' && shadow.sm, style]}
      {...props}
    >
      {inner}
    </HapticButton>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, flexShrink: 1 },
  text: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, flexShrink: 1 },
  disabled: { opacity: 0.5 },
});
