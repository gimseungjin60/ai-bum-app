import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import Icon from '../components/Icon';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import Card from '../components/Card';
import HapticButton from '../components/HapticButton';
import { useCollection } from '../hooks/useFirestore';

const FILTER_CHIPS = [
  { label: '전체', icon: 'grid', active: true },
  { label: '긴급', icon: 'alert', color: colors.error },
  { label: '주의', icon: 'zap', color: colors.tertiary },
  { label: '일반', icon: 'bell', color: colors.secondary },
];

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'emergency',
    title: '24시간 얼굴 미감지',
    body: '24시간 동안 어르신의 얼굴이 감지되지 않았습니다. 신속한 확인이 필요합니다.',
    time: '방금 전',
  },
  {
    id: '2',
    type: 'warning',
    title: '얼굴 감지 빈도 감소',
    body: '평소보다 얼굴 감지 횟수가 40% 줄었습니다. 안부를 여쭈어보는 건 어떨까요?',
    time: '1시간 전',
    checkers: ['형준 님', '민아 님'],
  },
  {
    id: '3',
    type: 'general',
    title: '새로운 사진이 등록되었습니다',
    body: "강아지 '코코'와의 즐거운 산책 순간이 포착되었어요.",
    time: '2시간 전',
    imageUri: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200',
  },
];

function getFilterIcon(name, color) {
  const iconMap = { grid: 'LayoutGrid', alert: 'AlertTriangle', zap: 'Zap', bell: 'Bell' };
  const iconName = iconMap[name];
  if (!iconName) return null;
  return <Icon name={iconName} size={14} color={color || colors.white} />;
}

export default function NotificationScreen() {
  const [activeFilter, setActiveFilter] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Firestore에서 알림 데이터 가져오기
  const { data: notifications, loading } = useCollection('notifications', 'createdAt');

  const notifData = notifications.length > 0 ? notifications : MOCK_NOTIFICATIONS;

  const filteredData = activeFilter === 0
    ? notifData
    : notifData.filter((n) => {
        if (activeFilter === 1) return n.type === 'emergency';
        if (activeFilter === 2) return n.type === 'warning';
        if (activeFilter === 3) return n.type === 'general';
        return true;
      });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>알림 센터</Text>
          <Text style={styles.subtitle}>
            우리 가족의 안녕과 새로운 소식을 확인하세요.
          </Text>
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {FILTER_CHIPS.map((chip, i) => (
            <HapticButton
              key={chip.label}
              onPress={() => setActiveFilter(i)}
              style={[
                styles.chip,
                activeFilter === i && styles.chipActive,
              ]}
            >
              {getFilterIcon(
                chip.icon,
                activeFilter === i ? colors.white : chip.color
              )}
              <Text
                style={[
                  styles.chipText,
                  activeFilter === i && styles.chipTextActive,
                ]}
              >
                {chip.label}
              </Text>
            </HapticButton>
          ))}
        </ScrollView>

        {/* Notifications */}
        {filteredData.map((item) => {
          if (item.type === 'emergency') {
            return (
              <View key={item.id} style={styles.emergencyCard}>
                <View style={styles.emergencyHeader}>
                  <View style={styles.emergencyIconWrap}>
                    <Icon name="AlertTriangle" size={22} color={colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.emergencyLabel}>긴급 알림</Text>
                    <Text style={styles.emergencyTitle}>{item.title}</Text>
                  </View>
                  <Text style={styles.emergencyTime}>{item.time}</Text>
                </View>
                <Text style={styles.emergencyBody}>{item.body}</Text>
                <View style={styles.emergencyActions}>
                  <HapticButton
                    hapticType="heavy"
                    style={styles.emergencyBtn}
                  >
                    <Text style={styles.emergencyBtnText}>
                      가족에게 긴급 공유
                    </Text>
                  </HapticButton>
                  <HapticButton style={styles.emergencyDismissBtn}>
                    <Text style={styles.emergencyDismissText}>알겠습니다</Text>
                  </HapticButton>
                </View>
              </View>
            );
          }

          if (item.type === 'warning') {
            return (
              <View key={item.id} style={styles.warningCard}>
                <View style={styles.warningLabelRow}>
                  <Icon name="Zap" size={14} color={colors.tertiary} />
                  <Text style={styles.warningLabel}>주의 정보</Text>
                </View>
                <Text style={styles.warningTitle}>{item.title}</Text>
                <Text style={styles.warningBody}>{item.body}</Text>
                {item.checkers ? (
                  <View style={styles.checkersRow}>
                    <Text style={styles.checkersText}>
                      {item.checkers.join(', ')}이 확인 중
                    </Text>
                  </View>
                ) : null}
                <HapticButton hapticType="medium" style={styles.warningBtn}>
                  <Icon name="Phone" size={16} color={colors.white} />
                  <Text style={styles.warningBtnText}>안부 전화하기</Text>
                </HapticButton>
              </View>
            );
          }

          // General
          return (
            <View key={item.id} style={styles.generalCard}>
              <View style={styles.generalInner}>
                <View style={styles.generalRow}>
                  {!!item.imageUri && (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={styles.generalImage}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={styles.generalHeaderRow}>
                      <Text style={styles.generalLabel}>일반 소식</Text>
                      <Text style={styles.generalTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.generalTitle}>{item.title}</Text>
                    <Text style={styles.generalBody}>{item.body}</Text>
                    <View style={styles.generalActions}>
                      <HapticButton style={styles.generalActionBtn}>
                        <Icon name="Heart" size={14} color={colors.primaryDark} />
                        <Text style={styles.generalActionPrimary}>좋아요</Text>
                      </HapticButton>
                      <HapticButton style={styles.generalActionBtn}>
                        <Icon name="Share2" size={14} color={colors.onSurfaceVariant} />
                        <Text style={styles.generalActionText}>공유하기</Text>
                      </HapticButton>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {filteredData.length === 0 && (
          <View style={styles.empty}>
            <Icon name="Bell" size={32} color={colors.stone400} />
            <Text style={styles.emptyText}>알림이 없습니다</Text>
          </View>
        )}

        {/* Empty State */}
        <View style={styles.storyPlaceholder}>
          <Text style={styles.storyText}>
            함께 나눌 이야기가 기다리고 있어요
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: 100 },
  header: { marginBottom: spacing.lg },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.onSurfaceVariant,
    marginTop: 8,
    lineHeight: 24,
  },
  chipScroll: { marginBottom: spacing.xl },
  chipRow: { gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 9999,
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipActive: {
    backgroundColor: colors.gradientStart,
    shadowColor: colors.gradientStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  chipText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  chipTextActive: { color: colors.white },

  // Emergency
  emergencyCard: {
    backgroundColor: 'rgba(255,218,214,0.3)',
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: spacing.md,
  },
  emergencyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.error,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emergencyTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.onErrorContainer,
    marginTop: 2,
  },
  emergencyTime: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.error,
  },
  emergencyBody: {
    fontSize: fontSize.lg,
    color: 'rgba(147,0,10,0.8)',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  emergencyActions: { flexDirection: 'row', gap: 8 },
  emergencyBtn: {
    flex: 1,
    backgroundColor: colors.error,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  emergencyBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.lg,
  },
  emergencyDismissBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
  },
  emergencyDismissText: {
    color: colors.onErrorContainer,
    fontWeight: '600',
  },

  // Warning
  warningCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 8,
    borderLeftColor: colors.tertiary,
  },
  warningLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  warningLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.tertiary,
  },
  warningTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  warningBody: {
    fontSize: fontSize.md,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  checkersRow: {
    backgroundColor: colors.surfaceContainerLow,
    padding: 12,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  checkersText: {
    fontSize: fontSize.xs,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  warningBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.tertiary,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
  },
  warningBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.lg,
  },

  // General
  generalCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xxl,
    padding: 4,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  generalInner: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 28,
    padding: spacing.lg,
  },
  generalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  generalImage: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
  },
  generalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  generalLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.secondary,
  },
  generalTime: { fontSize: fontSize.xs, color: colors.stone400 },
  generalTitle: {
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  generalBody: {
    fontSize: fontSize.md,
    color: colors.onSurfaceVariant,
    marginBottom: 12,
  },
  generalActions: { flexDirection: 'row', gap: spacing.md },
  generalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  generalActionPrimary: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  generalActionText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: { color: colors.stone400, fontWeight: '500' },

  storyPlaceholder: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  storyText: {
    color: colors.stone500,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
