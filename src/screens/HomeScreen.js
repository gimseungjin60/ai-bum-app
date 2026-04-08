import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Camera,
  MessageCircle,
  History,
  Heart,
  Activity,
  Users,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import Card from '../components/Card';
import HapticButton from '../components/HapticButton';

const WEEKLY_DATA = [
  { day: '월', value: 0.4 },
  { day: '화', value: 0.65 },
  { day: '수', value: 0.55 },
  { day: '목', value: 0.85, active: true },
  { day: '금', value: 0.3 },
  { day: '토', value: 0.45 },
  { day: '일', value: 0.5 },
];

export default function HomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* Hero Profile Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <View style={styles.statusRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.heroName}>김정숙 어르신</Text>
              </View>
              <Text style={styles.heroSub}>온라인 상태</Text>
            </View>
            <View style={styles.lastActiveChip}>
              <History size={14} color={colors.onSurface} />
              <Text style={styles.lastActiveText}>30분 전 활동 감지</Text>
            </View>
          </View>
          <View style={styles.heroBottom}>
            <View style={styles.familyIcons}>
              <View style={styles.familyIcon}>
                <Users size={14} color={colors.onSurface} />
              </View>
              <View style={[styles.familyIcon, { marginLeft: -8 }]}>
                <Heart size={14} color={colors.primary} />
              </View>
            </View>
            <HapticButton hapticType="medium">
              <LinearGradient
                colors={[colors.primaryDark, colors.primaryContainer]}
                style={styles.checkBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.checkBtnText}>안부 확인하기</Text>
              </LinearGradient>
            </HapticButton>
          </View>
        </View>

        {/* Summary Grid */}
        <View style={styles.gridRow}>
          {/* Mood Score */}
          <Card style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridLabel}>기분 점수</Text>
              <Text style={{ fontSize: 24 }}>😊</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreValue}>92</Text>
              <Text style={styles.scoreUnit}>점</Text>
            </View>
            <Text style={styles.gridDesc}>
              평소보다 더 밝은 표정을 지으셨어요
            </Text>
          </Card>

          {/* Activity Stats */}
          <Card style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridLabel}>활동 통계</Text>
              <Activity size={20} color={colors.tertiary} />
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>감지 시간</Text>
              <Text style={styles.statValue}>12시간 40분</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>웃음 횟수</Text>
              <Text style={styles.statValue}>18회</Text>
            </View>
          </Card>
        </View>

        {/* Weekly Chart */}
        <Card style={styles.chartCard} variant="low">
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>주간 활동 추이</Text>
            <Text style={styles.chartSub}>지난 7일간</Text>
          </View>
          <View style={styles.barsContainer}>
            {WEEKLY_DATA.map((item) => (
              <View key={item.day} style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: item.value * 120,
                      backgroundColor: item.active
                        ? colors.gradientStart
                        : '#FDBA74',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.barLabel,
                    item.active && {
                      color: colors.gradientStart,
                      fontWeight: fontWeight.bold,
                    },
                  ]}
                >
                  {item.day}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.gridRow}>
          <HapticButton style={styles.actionCard}>
            <Camera size={28} color={colors.gradientStart} />
            <Text style={styles.actionText}>사진 올리기</Text>
          </HapticButton>
          <HapticButton style={styles.actionCard}>
            <MessageCircle size={28} color={colors.gradientStart} />
            <Text style={styles.actionText}>메시지 보내기</Text>
          </HapticButton>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: 100 },
  heroCard: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green500,
  },
  heroName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
  },
  heroSub: {
    fontSize: fontSize.sm,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  lastActiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  lastActiveText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  heroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  familyIcons: { flexDirection: 'row' },
  familyIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
  },
  checkBtnText: {
    color: colors.white,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  gridCard: { flex: 1 },
  gridCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  gridLabel: {
    fontSize: fontSize.md,
    color: colors.stone500,
    fontWeight: fontWeight.medium,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreValue: {
    fontSize: 36,
    fontWeight: fontWeight.extrabold,
    color: colors.gradientStart,
  },
  scoreUnit: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.stone400 },
  gridDesc: { fontSize: fontSize.xs, color: colors.stone500, marginTop: 8 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.stone500,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.gradientStart,
  },
  chartCard: { marginBottom: spacing.lg, padding: spacing.lg },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
  },
  chartSub: { fontSize: fontSize.xs, color: colors.stone400 },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingHorizontal: 8,
  },
  barWrapper: { alignItems: 'center', gap: 8, flex: 1 },
  bar: { width: 16, borderTopLeftRadius: 999, borderTopRightRadius: 999 },
  barLabel: { fontSize: fontSize.xs, color: colors.stone400 },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.gradientStart,
  },
});
