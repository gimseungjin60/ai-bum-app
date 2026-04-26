import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from '../components/Icon';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { EMOTION_META, sortedEmotions } from '../theme/emotions';
import Card from '../components/Card';
import HapticButton from '../components/HapticButton';
import { useSenior } from '../contexts/SeniorContext';

const TABS = ['일간', '주간'];

function formatSeconds(sec) {
  if (!sec || sec <= 0) return '0분';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function formatHoursDecimal(sec) {
  if (!sec) return '0';
  return (sec / 3600).toFixed(1);
}

function getHeatmapFromHourly(hourlyMap) {
  const blocks = [
    { label: '06-09', hours: [6, 7, 8] },
    { label: '09-12', hours: [9, 10, 11] },
    { label: '12-15', hours: [12, 13, 14] },
    { label: '15-18', hours: [15, 16, 17] },
    { label: '18-21', hours: [18, 19, 20] },
    { label: '21-24', hours: [21, 22, 23] },
  ];

  const maxPossible = 3 * 3600; // 3시간 (블록당 최대)
  return blocks.map((block) => {
    const total = block.hours.reduce((sum, h) => sum + (hourlyMap?.[String(h)] || 0), 0);
    return { label: block.label, opacity: Math.min(total / maxPossible, 1) || 0.05 };
  });
}

export default function ReportScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);

  const {
    dailyReport,
    weeklyReport,
    loadingReport,
    fetchDailyReport,
    fetchWeeklyReport,
  } = useSenior();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 500, useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (activeTab === 0) fetchDailyReport();
    else fetchWeeklyReport();
  }, [activeTab, fetchDailyReport, fetchWeeklyReport]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 0) await fetchDailyReport();
    else await fetchWeeklyReport();
    setRefreshing(false);
  }, [activeTab, fetchDailyReport, fetchWeeklyReport]);

  // 일간 데이터
  const daily = dailyReport || {};
  const totalSec = daily.total_detection_seconds || 0;
  const smiles = daily.total_smiles || 0;
  const visitCount = daily.visit_count ?? daily.session_count ?? 0;
  const conversationCount = daily.conversation_count ?? 0;
  const moodScore = daily.mood_score || 0;
  const dailyEmotionCounts = daily.emotion_counts || {};
  const dailyDominant = daily.dominant_emotion || 'neutral';
  const heatmap = getHeatmapFromHourly(daily.hourly_detection);

  // 일간 감정 목록 (정렬, 상위 4개)
  const dailyEmList = sortedEmotions(dailyEmotionCounts);
  const dailyTotalEm = dailyEmList.reduce((s, e) => s + e.count, 0) || 1;

  // 주간 데이터
  const weekly = weeklyReport || {};
  const avgMood = weekly.avg_mood_score || 0;
  const avgDetection = weekly.avg_detection_seconds || 0;
  const avgSmiles = weekly.avg_smiles || 0;
  const moodTrend = weekly.mood_trend || 'stable';
  const dailyBreakdown = weekly.daily_breakdown || [];

  // 히트맵에서 가장 활발한 시간대
  const peakBlock = heatmap.reduce((max, b) => (b.opacity > max.opacity ? b : max), heatmap[0]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gradientStart} />
      }
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          {TABS.map((tab, i) => (
            <HapticButton
              key={tab}
              onPress={() => setActiveTab(i)}
              style={[styles.tab, activeTab === i && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>
                {tab}
              </Text>
            </HapticButton>
          ))}
        </View>

        {loadingReport && !refreshing && (
          <ActivityIndicator color={colors.gradientStart} style={{ marginVertical: 20 }} />
        )}

        {activeTab === 0 ? (
          /* ===== 일간 리포트 ===== */
          <>
            {/* AI Insight */}
            <View style={[styles.aiCard, { backgroundColor: colors.primaryDark }]}>
              <View style={styles.aiHeader}>
                <Icon name="Sparkles" size={20} color={colors.white} />
                <Text style={styles.aiTitle}>오늘의 분석</Text>
              </View>
              <Text style={styles.aiBody}>
                {moodScore >= 80
                  ? `${EMOTION_META[dailyDominant]?.emoji || '😊'} 오늘 주로 ${EMOTION_META[dailyDominant]?.label || '행복'}한 표정이 감지되었습니다.`
                  : moodScore >= 50
                  ? `오늘 방문 ${visitCount}회, 대화 ${conversationCount}회 기록되었습니다.`
                  : totalSec > 0
                  ? '오늘은 평소보다 조용한 하루입니다. 안부를 확인해보세요.'
                  : '아직 오늘의 활동 데이터가 수집되지 않았습니다.'}
              </Text>
              <View style={styles.aiFooter}>
                <Icon name="Calendar" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.aiFooterText}>
                  오늘 하루의 기록을 바탕으로 분석되었습니다.
                </Text>
              </View>
            </View>

            {/* 오늘의 표정 */}
            {dailyEmList.length > 0 && (
              <Card style={[styles.heatmapCard, { marginBottom: spacing.lg }]}>
                <View style={styles.heatmapHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>오늘의 표정</Text>
                    <Text style={styles.sectionSub}>카메라가 분석한 감정 분포</Text>
                  </View>
                </View>
                {/* Stacked bar */}
                <View style={styles.emotionStackBar}>
                  {dailyEmList.slice(0, 4).map((e) => (
                    <View
                      key={e.key}
                      style={[
                        styles.emotionStackSegment,
                        {
                          flex: e.count / dailyTotalEm,
                          backgroundColor: e.color,
                        },
                      ]}
                    />
                  ))}
                </View>
                {/* 라벨 */}
                <View style={styles.emotionLabelRow}>
                  {dailyEmList.slice(0, 4).map((e) => (
                    <View key={e.key} style={styles.emotionLabelItem}>
                      <View style={[styles.emotionDot, { backgroundColor: e.color }]} />
                      <Text style={styles.emotionLabelText}>
                        {e.emoji} {e.label}
                      </Text>
                      <Text style={styles.emotionCountText}>{e.count}회</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Detection Heatmap */}
            <Card style={styles.heatmapCard}>
              <View style={styles.heatmapHeader}>
                <View>
                  <Text style={styles.sectionTitle}>감지 히트맵</Text>
                  <Text style={styles.sectionSub}>시간대별 얼굴 감지 현황</Text>
                </View>
              </View>
              <View style={styles.heatmapGrid}>
                {heatmap.map((item) => (
                  <View key={item.label} style={styles.heatmapCol}>
                    <View
                      style={[
                        styles.heatmapBlock,
                        {
                          opacity: Math.max(item.opacity, 0.08),
                          backgroundColor:
                            item.opacity > 0.7
                              ? colors.primaryDark
                              : item.opacity > 0.4
                              ? colors.secondaryContainer
                              : colors.tertiaryFixedDim,
                        },
                      ]}
                    />
                    <Text style={styles.heatmapLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
              {peakBlock.opacity > 0.1 && (
                <Text style={styles.heatmapNote}>
                  {peakBlock.label}시 사이에 가장 활발한 활동이 기록되었습니다.
                </Text>
              )}
            </Card>

            {/* Daily Stats Summary */}
            <View style={styles.compareRow}>
              <View style={[styles.compareCard, { backgroundColor: colors.tertiaryFixed }]}>
                <Icon name="Smile" size={20} color={colors.onSurface} />
                <Text style={styles.compareLabel}>기분 점수</Text>
                <View style={styles.compareValueRow}>
                  <Text style={styles.compareValue}>{moodScore}</Text>
                  <Text style={styles.compareSub}>/ 100점</Text>
                </View>
              </View>
              <View style={[styles.compareCard, { backgroundColor: colors.secondaryFixed }]}>
                <Icon name="Scan" size={20} color={colors.onSurface} />
                <Text style={styles.compareLabel}>감지 시간</Text>
                <View style={styles.compareValueRow}>
                  <Text style={styles.compareValue}>{formatHoursDecimal(totalSec)}</Text>
                  <Text style={styles.compareSub}>시간</Text>
                </View>
              </View>
            </View>
            <View style={[styles.compareRow, { marginTop: 0 }]}>
              <View style={[styles.compareCard, { backgroundColor: colors.primaryFixed }]}>
                <Icon name="Footprints" size={20} color={colors.onSurface} />
                <Text style={styles.compareLabel}>방문</Text>
                <View style={styles.compareValueRow}>
                  <Text style={styles.compareValue}>{visitCount}</Text>
                  <Text style={styles.compareSub}>회</Text>
                </View>
              </View>
              <View style={[styles.compareCard, { backgroundColor: colors.emerald100 }]}>
                <Icon name="MessageCircle" size={20} color={colors.onSurface} />
                <Text style={styles.compareLabel}>대화</Text>
                <View style={styles.compareValueRow}>
                  <Text style={styles.compareValue}>{conversationCount}</Text>
                  <Text style={styles.compareSub}>회</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          /* ===== 주간 리포트 ===== */
          <>
            {/* AI Insight */}
            <View style={[styles.aiCard, { backgroundColor: colors.primaryDark }]}>
              <View style={styles.aiHeader}>
                <Icon name="Sparkles" size={20} color={colors.white} />
                <Text style={styles.aiTitle}>AI 주간 분석</Text>
              </View>
              <Text style={styles.aiBody}>
                {moodTrend === 'improving'
                  ? `이번 주 평균 기분 점수가 ${avgMood.toFixed(0)}점으로 상승 추세입니다.`
                  : moodTrend === 'declining'
                  ? `이번 주 기분 점수가 다소 하락했습니다. 안부를 자주 확인해주세요.`
                  : `이번 주 평균 기분 점수는 ${avgMood.toFixed(0)}점으로 안정적입니다.`}
              </Text>
              <View style={styles.aiFooter}>
                <Icon name="Calendar" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.aiFooterText}>
                  지난 7일간의 기록을 바탕으로 분석되었습니다.
                </Text>
              </View>
            </View>

            {/* Weekly Bar Chart */}
            {dailyBreakdown.length > 0 && (
              <Card style={styles.chartCard} variant="low">
                <View style={styles.chartHeader}>
                  <Text style={styles.chartTitle}>일별 방문 횟수</Text>
                  <Text style={styles.chartSub}>지난 7일간</Text>
                </View>
                <View style={styles.barsContainer}>
                  {(() => {
                    const maxVal = Math.max(...dailyBreakdown.map((d) => d.visit_count ?? d.session_count ?? 0), 1);
                    return dailyBreakdown.map((item, i) => {
                      const val = item.visit_count ?? item.session_count ?? 0;
                      const date = new Date(item.date);
                      const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
                      const isToday = i === dailyBreakdown.length - 1;
                      const dom = item.dominant_emotion || 'neutral';
                      const barColor = isToday
                        ? colors.gradientStart
                        : (EMOTION_META[dom]?.color || '#FDBA74');
                      return (
                        <View key={item.date} style={styles.barWrapper}>
                          <Text style={styles.barCountText}>{val > 0 ? val : ''}</Text>
                          <View
                            style={[
                              styles.bar,
                              {
                                height: Math.max((val / maxVal) * 120, 4),
                                backgroundColor: barColor,
                                opacity: isToday ? 1 : 0.7,
                              },
                            ]}
                          />
                          <Text
                            style={[
                              styles.barLabel,
                              isToday && { color: colors.gradientStart, fontWeight: '700' },
                            ]}
                          >
                            {dayName}
                          </Text>
                        </View>
                      );
                    });
                  })()}
                </View>
              </Card>
            )}

            {/* Weekly Comparison */}
            <View style={styles.compareRow}>
              <View style={[styles.compareCard, { backgroundColor: colors.tertiaryFixed }]}>
                <Icon name="Smile" size={20} color={colors.onSurface} />
                <Text style={styles.compareLabel}>평균 기분</Text>
                <View style={styles.compareValueRow}>
                  <Text style={styles.compareValue}>{avgMood.toFixed(0)}</Text>
                  <Text style={styles.compareSub}>점/일 평균</Text>
                </View>
              </View>
              <View style={[styles.compareCard, { backgroundColor: colors.secondaryFixed }]}>
                <Icon name="Scan" size={20} color={colors.onSurface} />
                <Text style={styles.compareLabel}>감지 시간</Text>
                <View style={styles.compareValueRow}>
                  <Text style={styles.compareValue}>{formatHoursDecimal(avgDetection)}</Text>
                  <Text style={styles.compareSub}>시간/일 평균</Text>
                </View>
              </View>
            </View>

            <View style={[styles.compareRow, { marginTop: 0 }]}>
              <View style={[styles.compareCard, { backgroundColor: colors.primaryFixed }]}>
                <Icon name="Heart" size={20} color={colors.onSurface} />
                <Text style={styles.compareLabel}>평균 미소</Text>
                <View style={styles.compareValueRow}>
                  <Text style={styles.compareValue}>{avgSmiles.toFixed(0)}</Text>
                  <Text style={styles.compareSub}>회/일 평균</Text>
                </View>
              </View>
              <View style={[styles.compareCard, { backgroundColor: colors.emerald100 }]}>
                <Icon
                  name={moodTrend === 'improving' ? 'TrendingUp' : moodTrend === 'declining' ? 'TrendingDown' : 'Minus'}
                  size={20}
                  color={colors.onSurface}
                />
                <Text style={styles.compareLabel}>기분 추세</Text>
                <View style={styles.compareValueRow}>
                  <Text style={[styles.compareValue, {
                    color: moodTrend === 'improving' ? colors.emerald700
                      : moodTrend === 'declining' ? colors.error
                      : colors.onSurface
                  }]}>
                    {moodTrend === 'improving' ? '↑' : moodTrend === 'declining' ? '↓' : '→'}
                  </Text>
                  <Text style={styles.compareSub}>
                    {moodTrend === 'improving'
                      ? '상승세'
                      : moodTrend === 'declining'
                      ? '하락세'
                      : '안정적'}
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: 100 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: 9999,
    padding: 6,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  aiCard: {
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  aiTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.white,
  },
  aiBody: {
    fontSize: fontSize.xl,
    fontWeight: '500',
    color: colors.white,
    lineHeight: 28,
    marginBottom: spacing.md,
  },
  aiFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  aiFooterText: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)' },
  heatmapCard: { marginBottom: spacing.lg, padding: spacing.lg },
  heatmapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.onSurface,
  },
  sectionSub: {
    fontSize: fontSize.md,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  heatmapGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  heatmapCol: { flex: 1, alignItems: 'center', gap: 8 },
  heatmapBlock: {
    width: '100%',
    height: 56,
    borderRadius: borderRadius.sm,
  },
  heatmapLabel: { fontSize: fontSize.xs, color: colors.outline },
  heatmapNote: {
    fontSize: fontSize.xs,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
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
  compareRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  compareCard: {
    flex: 1,
    padding: 20,
    borderRadius: borderRadius.xl,
    gap: 8,
  },
  compareLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.onSurface,
  },
  compareValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  compareValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.onSurface,
  },
  compareSub: { fontSize: fontSize.xs, color: colors.onSurfaceVariant },

  // 감정 분포 스택 바
  emotionStackBar: {
    flexDirection: 'row', height: 10, borderRadius: 999,
    overflow: 'hidden', marginBottom: spacing.md,
  },
  emotionStackSegment: { height: 10 },
  emotionLabelRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
  },
  emotionLabelItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4,
  },
  emotionDot: { width: 8, height: 8, borderRadius: 4 },
  emotionLabelText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.onSurface },
  emotionCountText: { fontSize: fontSize.xs, color: colors.stone400 },

  // 주간 차트 바 위 숫자
  barCountText: { fontSize: 9, color: colors.stone400, fontWeight: '600', height: 14 },
});
