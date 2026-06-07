import React from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

const TAB_BAR_HEIGHT = 72;

/**
 * 모든 화면 공통 래퍼. Safe Area(노치·홈바)와 하단 탭바 회피 패딩을 한 곳에서 처리해
 * 화면마다 제각각이던 paddingBottom 하드코딩과 콘텐츠 잘림을 없앤다.
 *
 * props
 * - scroll   : ScrollView로 감쌀지 (기본 true). false면 고정 View
 * - tabBarPad: 하단 탭바가 있는 화면이면 true → 탭바+홈바 높이만큼 하단 패딩
 * - topInset : 헤더가 없는 화면(로그인 등)이면 true → 상단 Safe Area 패딩
 * - padded   : 좌우 기본 여백(spacing.lg) 적용 (기본 true)
 * - onRefresh/refreshing: 당겨서 새로고침
 */
export default function Screen({
  children,
  scroll = true,
  tabBarPad = false,
  topInset = false,
  padded = true,
  style,
  contentStyle,
  refreshing,
  onRefresh,
  ...props
}) {
  const insets = useSafeAreaInsets();
  const bottomPad =
    (tabBarPad ? TAB_BAR_HEIGHT + insets.bottom : insets.bottom) + spacing.lg;
  const topPad = (topInset ? insets.top : 0) + spacing.md;
  const horizontal = padded ? { paddingHorizontal: spacing.lg } : null;

  if (!scroll) {
    return (
      <View
        style={[
          { flex: 1, backgroundColor: colors.surface, paddingTop: topPad, paddingBottom: bottomPad },
          horizontal,
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: colors.surface }, style]}
      contentContainerStyle={[{ paddingTop: topPad, paddingBottom: bottomPad }, horizontal, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
      {...props}
    >
      {children}
    </ScrollView>
  );
}
