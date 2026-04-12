import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  RefreshControl,
} from 'react-native';
import Icon from '../components/Icon';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import Card from '../components/Card';
import HapticButton from '../components/HapticButton';
import { useSenior } from '../contexts/SeniorContext';

const STATUS_LABEL = {
  idle: '대기 중',
  greeting: '인사 중',
  active: '활동 중',
};

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatSeconds(sec) {
  if (!sec || sec <= 0) return '0분';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function getMoodEmoji(score) {
  if (score >= 80) return '😊';
  if (score >= 60) return '🙂';
  if (score >= 40) return '😐';
  return '😔';
}

export default function HomeScreen({ navigation }) {
  const {
    wsConnected,
    seniorStatus,
    detected,
    isPillTaken,
    summary,
    weather,
    fetchSummary,
  } = useSenior();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  }

  const todayStats = summary?.today || {};
  const device = summary?.device || {};
  const moodScore = todayStats.mood_score ?? 0;
  const totalSeconds = todayStats.total_detection_seconds ?? 0;
  const smileCount = todayStats.total_smiles ?? 0;
  const sessionCount = todayStats.session_count ?? 0;
  const isOnline = wsConnected && (seniorStatus !== 'idle' || detected);

  // 주간 차트 데이터
  const weeklyData = (summary?.weekly_chart || []).map((val, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayIdx = d.getDay();
    return { day: DAY_NAMES[dayIdx], value: val, active: i === 6 };
  });
  const maxWeekly = Math.max(...weeklyData.map((d) => d.value), 1);

  // 마지막 감지 시간
  let lastSeenText = '정보 없음';
  if (device.last_detection) {
    const lastDt = new Date(device.last_detection);
    const diffMin = Math.floor((Date.now() - lastDt.getTime()) / 60000);
    if (diffMin < 1) lastSeenText = '방금 전 감지';
    else if (diffMin < 60) lastSeenText = `${diffMin}분 전 감지`;
    else lastSeenText = `${Math.floor(diffMin / 60)}시간 전 감지`;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gradientStart} />
      }
    >
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
      >
        {/* 연결 상태 배너 */}
        {!wsConnected && (
          <View style={styles.offlineBanner}>
            <Icon name="AlertTriangle" size={14} color="#92400E" />
            <Text style={styles.offlineText}>서버 연결 대기 중...</Text>
          </View>
        )}

        {/* Hero Profile Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <View style={styles.statusRow}>
                <View style={[styles.onlineDot, !isOnline && styles.offlineDot]} />
                <Text style={styles.heroName}>
                  {device.device_id ? '어르신' : '시니어'}
                </Text>
              </View>
              <Text style={styles.heroSub}>
                {isOnline ? STATUS_LABEL[seniorStatus] || '온라인' : '오프라인'}
              </Text>
            </View>
            <View style={styles.lastActiveChip}>
              <Icon name="History" size={14} color={colors.onSurface} />
              <Text style={styles.lastActiveText}>{lastSeenText}</Text>
            </View>
          </View>
          {weather && (
            <View style={styles.weatherRow}>
              <Text style={styles.weatherIcon}>{weather.icon || '🌤'}</Text>
              <Text style={styles.weatherText}>
                {weather.city} {weather.temperature} · {weather.condition}
              </Text>
            </View>
          )}
          <View style={styles.heroBottom}>
            <View style={styles.familyIcons}>
              <View style={styles.familyIcon}>
                <Icon name="Users" size={14} color={colors.onSurface} />
              </View>
              <View style={[styles.familyIcon, { marginLeft: -8 }]}>
                <Icon name="Heart" size={14} color={colors.primary} />
              </View>
            </View>
            <HapticButton
              hapticType="medium"
              onPress={() => navigation.navigate('Notifications')}
            >
              <View style={[styles.checkBtn, { backgroundColor: colors.primaryDark }]}>
                <Text style={styles.checkBtnText}>안부 확인하기</Text>
              </View>
            </HapticButton>
          </View>
        </View>

        {/* Summary Grid */}
        <View style={styles.gridRow}>
          <Card style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridLabel}>기분 점수</Text>
              <Text style={{ fontSize: 24 }}>{getMoodEmoji(moodScore)}</Text>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreValue}>{moodScore}</Text>
              <Text style={styles.scoreUnit}>점</Text>
            </View>
            <Text style={styles.gridDesc}>
              {moodScore >= 80
                ? '밝은 표정이 자주 감지되었어요'
                : moodScore >= 50
                ? '보통 수준의 활동이 감지되었어요'
                : '오늘은 활동이 적었어요'}
            </Text>
          </Card>

          <Card style={styles.gridCard}>
            <View style={styles.gridCardHeader}>
              <Text style={styles.gridLabel}>얼굴 감지</Text>
              <Icon name="Scan" size={20} color={colors.tertiary} />
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>감지 시간</Text>
              <Text style={styles.statValue}>{formatSeconds(totalSeconds)}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>미소 횟수</Text>
              <Text style={styles.statValue}>{smileCount}회</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>세션 수</Text>
              <Text style={styles.statValue}>{sessionCount}회</Text>
            </View>
          </Card>
        </View>

        {/* Weekly Chart */}
        {weeklyData.length > 0 && (
          <Card style={styles.chartCard} variant="low">
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>주간 감지 추이</Text>
              <Text style={styles.chartSub}>지난 7일간</Text>
            </View>
            <View style={styles.barsContainer}>
              {weeklyData.map((item) => (
                <View key={item.day} style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max((item.value / maxWeekly) * 120, 4),
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
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {item.day}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* 복약 상태 */}
        <HapticButton
          onPress={() => navigation.navigate('Medication')}
          style={[styles.pillCard, isPillTaken ? styles.pillTaken : styles.pillPending]}
        >
          <Icon
            name={isPillTaken ? 'ShieldCheck' : 'Heart'}
            size={22}
            color={isPillTaken ? colors.emerald700 : '#92400E'}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pillTitle, isPillTaken ? { color: colors.emerald700 } : { color: '#92400E' }]}>
              {isPillTaken ? '오늘 약 복용 완료' : '약 복용 확인 필요'}
            </Text>
          </View>
          <Icon name="ChevronRight" size={18} color={colors.stone400} />
        </HapticButton>

        {/* Quick Actions */}
        <View style={styles.gridRow}>
          <HapticButton
            style={styles.actionCard}
            onPress={() => navigation.navigate('Gallery')}
          >
            <Icon name="Camera" size={28} color={colors.gradientStart} />
            <Text style={styles.actionText}>사진 올리기</Text>
          </HapticButton>
          <HapticButton
            style={styles.actionCard}
            onPress={() => navigation.navigate('Report')}
          >
            <Icon name="BarChart3" size={28} color={colors.gradientStart} />
            <Text style={styles.actionText}>리포트 보기</Text>
          </HapticButton>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: 100 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: spacing.md,
  },
  offlineText: { fontSize: fontSize.sm, fontWeight: '600', color: '#92400E' },
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
  offlineDot: { backgroundColor: colors.stone400 },
  heroName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
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
    borderRadius: 9999,
  },
  lastActiveText: { fontSize: fontSize.xs, fontWeight: '600' },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  weatherIcon: { fontSize: 16 },
  weatherText: { fontSize: fontSize.sm, color: colors.onSurface, fontWeight: '500' },
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
    borderRadius: 9999,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  checkBtnText: {
    color: colors.white,
    fontWeight: '700',
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
    fontWeight: '500',
  },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  scoreValue: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.gradientStart,
  },
  scoreUnit: { fontSize: fontSize.md, fontWeight: '700', color: colors.stone400 },
  gridDesc: { fontSize: fontSize.xs, color: colors.stone500, marginTop: 8 },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.stone500,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '700',
    color: colors.gradientStart,
  },
  pillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  pillTaken: { backgroundColor: colors.emerald100 },
  pillPending: { backgroundColor: '#FEF3C7' },
  pillTitle: { fontWeight: '700', fontSize: fontSize.md },
});
