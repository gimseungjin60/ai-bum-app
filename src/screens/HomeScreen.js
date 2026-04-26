import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  RefreshControl,
  Image,
} from 'react-native';
import Icon from '../components/Icon';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import { EMOTION_META, sortedEmotions } from '../theme/emotions';
import Card from '../components/Card';
import HapticButton from '../components/HapticButton';
import { useSenior } from '../contexts/SeniorContext';
import { api } from '../services/api';

const STATUS_LABEL = {
  idle: '대기 중',
  greeting: '어르신 인식됨',
  active: '대화 중',
};

const STATUS_COLOR = {
  idle: colors.stone400,
  greeting: '#F59E0B',
  active: colors.green500,
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

function SectionHeader({ title, sub, action, onAction }) {
  return (
    <View style={sectionStyles.row}>
      <View>
        <Text style={sectionStyles.title}>{title}</Text>
        {sub && <Text style={sectionStyles.sub}>{sub}</Text>}
      </View>
      {action && (
        <HapticButton onPress={onAction}>
          <Text style={sectionStyles.action}>{action}</Text>
        </HapticButton>
      )}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.sm },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.onSurface },
  sub: { fontSize: fontSize.xs, color: colors.stone400, marginTop: 2 },
  action: { fontSize: fontSize.sm, fontWeight: '700', color: colors.gradientStart },
});

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
  const slideAnim = useRef(new Animated.Value(24)).current;
  const [refreshing, setRefreshing] = React.useState(false);
  const [, setTick] = useState(0);
  const [liveVisible, setLiveVisible] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
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
  const visitCount = todayStats.visit_count ?? todayStats.session_count ?? 0;
  const conversationCount = todayStats.conversation_count ?? 0;
  const emotionCounts = todayStats.emotion_counts || {};
  const dominantEmotion = todayStats.dominant_emotion || 'neutral';
  const currentStatusLabel = STATUS_LABEL[seniorStatus] || '대기 중';
  const currentStatusColor = STATUS_COLOR[seniorStatus] || colors.stone400;

  // 감정 분포 (상위 4개, 비율 계산)
  const emotionList = sortedEmotions(emotionCounts);
  const totalEmCount = emotionList.reduce((s, e) => s + e.count, 0) || 1;
  const topEmotions = emotionList.slice(0, 4).map((e) => ({
    ...e,
    ratio: e.count / totalEmCount,
  }));

  // 주간 차트 (새 포맷 {date, visits, mood_score, dominant_emotion} 또는 구 포맷 숫자)
  const weeklyData = (summary?.weekly_chart || []).map((item, i) => {
    const isObj = typeof item === 'object' && item !== null;
    const visits = isObj ? (item.visits ?? 0) : item;
    const dom = isObj ? (item.dominant_emotion || 'neutral') : 'neutral';
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { day: DAY_NAMES[d.getDay()], value: visits, dominant: dom, active: i === 6 };
  });
  const maxWeekly = Math.max(...weeklyData.map((d) => d.value), 1);

  // 마지막 감지 시간
  let lastSeenText = '기록 없음';
  if (device.last_detection) {
    const diffSec = Math.floor((Date.now() - new Date(device.last_detection).getTime()) / 1000);
    if (diffSec < 60) lastSeenText = '방금 감지';
    else if (diffSec < 3600) lastSeenText = `${Math.floor(diffSec / 60)}분 전`;
    else lastSeenText = `${Math.floor(diffSec / 3600)}시간 전`;
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
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* ─── 오프라인 배너 ─── */}
        {!wsConnected && (
          <View style={styles.offlineBanner}>
            <Icon name="WifiOff" size={14} color="#92400E" />
            <Text style={styles.offlineText}>기기에 연결하는 중...</Text>
          </View>
        )}

        {/* ─── 히어로 카드 ─── */}
        <View style={styles.heroCard}>
          {/* 상단: 이름 + 상태 */}
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>어르신 현황</Text>
              <Text style={styles.heroName}>시니어 스마트 프레임</Text>
            </View>
            <View style={[styles.statusPill, { borderColor: currentStatusColor }]}>
              <View style={[styles.statusDot, { backgroundColor: currentStatusColor }]} />
              <Text style={[styles.statusText, { color: currentStatusColor }]}>
                {wsConnected ? currentStatusLabel : '오프라인'}
              </Text>
            </View>
          </View>

          {/* 날씨 + 마지막 감지 */}
          <View style={styles.heroDivider} />
          <View style={styles.heroMeta}>
            {weather ? (
              <View style={styles.heroMetaItem}>
                <Text style={styles.heroMetaIcon}>{weather.icon || '🌤'}</Text>
                <Text style={styles.heroMetaText}>
                  {weather.temperature} · {weather.condition}
                </Text>
              </View>
            ) : (
              <View />
            )}
            <View style={styles.heroMetaItem}>
              <Icon name="Clock" size={13} color={colors.stone400} />
              <Text style={styles.heroMetaText}>{lastSeenText}</Text>
            </View>
          </View>

          {/* CTA */}
          <HapticButton
            hapticType="medium"
            onPress={() => navigation.navigate('Notifications')}
            style={styles.heroCta}
          >
            <Icon name="Bell" size={16} color={colors.onPrimary} />
            <Text style={styles.heroCtaText}>알림 및 안부 확인</Text>
          </HapticButton>
        </View>

        {/* ─── 카메라 라이브 뷰 ─── */}
        {wsConnected && (
          <View style={styles.liveSection}>
            <HapticButton
              onPress={() => setLiveVisible((v) => !v)}
              style={[styles.liveToggle, liveVisible && styles.liveToggleOpen]}
            >
              <View style={[styles.liveIconWrap, liveVisible && styles.liveIconWrapOpen]}>
                <Icon name="Video" size={18} color={liveVisible ? '#fff' : colors.gradientStart} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.liveToggleTitle, liveVisible && { color: '#fff' }]}>
                  지금 어르신 모습
                </Text>
                <Text style={[styles.liveToggleSub, liveVisible && { color: 'rgba(255,255,255,0.6)' }]}>
                  {liveVisible ? '라이브 스트리밍 중' : '탭하여 카메라 확인하기'}
                </Text>
              </View>
              {liveVisible ? (
                <View style={styles.liveBadge}>
                  <View style={styles.liveBadgeDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              ) : (
                <View style={styles.liveArrow}>
                  <Icon name="ChevronRight" size={16} color={colors.stone400} />
                </View>
              )}
            </HapticButton>

            {liveVisible && (
              <View style={styles.liveStreamWrap}>
                <Image
                  source={{ uri: api.getVideoStreamUrl() }}
                  style={styles.liveStream}
                  resizeMode="cover"
                />
                {/* 오버레이: 좌상단 LIVE + 우하단 닫기 */}
                <View style={styles.liveOverlayTop}>
                  <View style={styles.liveOverlayBadge}>
                    <View style={styles.liveOverlayDot} />
                    <Text style={styles.liveOverlayText}>LIVE</Text>
                  </View>
                </View>
                <HapticButton
                  onPress={() => setLiveVisible(false)}
                  style={styles.liveCloseBtn}
                >
                  <Icon name="X" size={14} color="#fff" />
                </HapticButton>
              </View>
            )}
          </View>
        )}

        {/* ─── 오늘의 기록 ─── */}
        <SectionHeader
          title="오늘의 기록"
          sub={new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
          action="리포트 보기"
          onAction={() => navigation.navigate('Report')}
        />
        <View style={styles.statsGrid}>
          {/* 기분 점수 + 감정 분포 바 */}
          <Card style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={styles.statCardLabel}>기분 점수</Text>
              <Text style={{ fontSize: 22 }}>{getMoodEmoji(moodScore)}</Text>
            </View>
            <Text style={styles.statCardBig}>{moodScore}<Text style={styles.statCardUnit}>점</Text></Text>
            {topEmotions.length > 0 ? (
              <>
                <View style={styles.emotionBar}>
                  {topEmotions.map((e) => (
                    <View
                      key={e.key}
                      style={[styles.emotionSegment, { flex: e.ratio, backgroundColor: e.color }]}
                    />
                  ))}
                </View>
                <Text style={styles.emotionLegend}>
                  {EMOTION_META[dominantEmotion]?.emoji || '😐'} 주로 {EMOTION_META[dominantEmotion]?.label || '평온'}한 하루
                </Text>
              </>
            ) : (
              <Text style={styles.statCardDesc}>
                {moodScore >= 80 ? '매우 밝은 하루예요!' : moodScore >= 50 ? '보통 상태예요' : '데이터 수집 중'}
              </Text>
            )}
          </Card>

          {/* 방문 · 대화 · 시간 */}
          <Card style={styles.statCard}>
            <View style={styles.statCardTop}>
              <Text style={styles.statCardLabel}>오늘 활동</Text>
              <Icon name="Scan" size={18} color={colors.tertiary} />
            </View>
            <View style={styles.miniStatList}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatVal}>{visitCount}</Text>
                <Text style={styles.miniStatLabel}>방문</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <Text style={styles.miniStatVal}>{conversationCount}</Text>
                <Text style={styles.miniStatLabel}>대화</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <Text style={styles.miniStatVal}>{formatSeconds(totalSeconds)}</Text>
                <Text style={styles.miniStatLabel}>시간</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* ─── 복약 상태 ─── */}
        <HapticButton
          onPress={() => navigation.navigate('Medication')}
          style={[styles.pillCard, isPillTaken ? styles.pillTaken : styles.pillPending]}
        >
          <View style={[styles.pillIconWrap, { backgroundColor: isPillTaken ? '#A7F3D0' : '#FDE68A' }]}>
            <Icon
              name={isPillTaken ? 'ShieldCheck' : 'Pill'}
              size={20}
              color={isPillTaken ? colors.emerald700 : '#92400E'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pillTitle, { color: isPillTaken ? colors.emerald700 : '#92400E' }]}>
              {isPillTaken ? '오늘 복약 완료' : '복약 확인이 필요해요'}
            </Text>
            <Text style={styles.pillSub}>
              {isPillTaken ? '정상적으로 약을 드셨어요' : '복약 관리 화면에서 확인하세요'}
            </Text>
          </View>
          <Icon name="ChevronRight" size={18} color={colors.stone400} />
        </HapticButton>

        {/* ─── 주간 차트 ─── */}
        {weeklyData.length > 0 && (
          <>
            <SectionHeader title="이번 주 활동" sub="지난 7일간 방문 횟수" />
            <Card style={styles.chartCard} variant="low">
              <View style={styles.barsContainer}>
                {weeklyData.map((item) => {
                  const barColor = item.active
                    ? colors.gradientStart
                    : (EMOTION_META[item.dominant]?.color || colors.primaryFixed);
                  return (
                    <View key={item.day} style={styles.barWrapper}>
                      <Text style={styles.barCount}>{item.value > 0 ? item.value : ''}</Text>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max((item.value / maxWeekly) * 100, 4),
                            backgroundColor: barColor,
                            opacity: item.active ? 1 : 0.65,
                          },
                        ]}
                      />
                      <Text style={[styles.barLabel, item.active && styles.barLabelActive]}>
                        {item.day}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          </>
        )}

        {/* ─── 빠른 메뉴 ─── */}
        <SectionHeader title="빠른 메뉴" />
        <View style={styles.actionGrid}>
          <HapticButton style={styles.actionCard} onPress={() => navigation.navigate('Gallery')}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
              <Icon name="ImagePlus" size={22} color={colors.gradientStart} />
            </View>
            <Text style={styles.actionTitle}>사진 올리기</Text>
            <Text style={styles.actionSub}>앨범에 새 사진 추가</Text>
          </HapticButton>
          <HapticButton style={styles.actionCard} onPress={() => navigation.navigate('Report')}>
            <View style={[styles.actionIcon, { backgroundColor: '#FFF7ED' }]}>
              <Icon name="BarChart3" size={22} color={colors.gradientStart} />
            </View>
            <Text style={styles.actionTitle}>리포트</Text>
            <Text style={styles.actionSub}>감정·활동 분석</Text>
          </HapticButton>
        </View>

      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: 100 },

  // ── 오프라인 배너
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', borderRadius: borderRadius.sm,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: spacing.md,
  },
  offlineText: { fontSize: fontSize.sm, fontWeight: '600', color: '#92400E' },

  // ── 히어로 카드
  heroCard: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeft: { gap: 2 },
  heroLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.onSecondaryContainer, opacity: 0.7 },
  heroName: { fontSize: fontSize.xl, fontWeight: '800', color: colors.onSurface },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  statusDot: { width: 7, height: 7, borderRadius: 999 },
  statusText: { fontSize: fontSize.xs, fontWeight: '700' },
  heroDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.06)', marginVertical: spacing.md },
  heroMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaIcon: { fontSize: 15 },
  heroMetaText: { fontSize: fontSize.sm, color: colors.stone500, fontWeight: '500' },
  heroCta: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryDark,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  heroCtaText: { fontSize: fontSize.md, fontWeight: '700', color: '#fff' },

  // ── 라이브 카메라
  liveSection: { marginBottom: spacing.lg },
  liveToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  liveToggleOpen: {
    backgroundColor: colors.onSurface,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  liveIconWrap: {
    width: 42, height: 42, borderRadius: borderRadius.md,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  liveIconWrapOpen: { backgroundColor: 'rgba(255,255,255,0.15)' },
  liveToggleTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.onSurface },
  liveToggleSub: { fontSize: fontSize.xs, color: colors.stone400, marginTop: 2 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#EF4444', borderRadius: 9999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#fff' },
  liveBadgeText: { fontSize: fontSize.xs, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  liveArrow: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  liveStreamWrap: {
    position: 'relative',
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  liveStream: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111',
  },
  liveOverlayTop: {
    position: 'absolute', top: 10, left: 12,
  },
  liveOverlayBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 4,
  },
  liveOverlayDot: { width: 6, height: 6, borderRadius: 999, backgroundColor: '#EF4444' },
  liveOverlayText: { fontSize: fontSize.xs, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  liveCloseBtn: {
    position: 'absolute', bottom: 10, right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── 오늘의 기록 그리드
  statsGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { flex: 1 },
  statCardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statCardLabel: { fontSize: fontSize.sm, color: colors.stone500, fontWeight: '600' },
  statCardBig: { fontSize: 38, fontWeight: '800', color: colors.gradientStart, lineHeight: 44 },
  statCardUnit: { fontSize: fontSize.lg, fontWeight: '700', color: colors.stone400 },
  statCardDesc: { fontSize: fontSize.xs, color: colors.stone500, marginTop: 4 },
  miniStatList: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: spacing.xs,
  },
  miniStat: { flex: 1, alignItems: 'center', gap: 3 },
  miniStatVal: { fontSize: fontSize.xl, fontWeight: '800', color: colors.gradientStart },
  miniStatLabel: { fontSize: fontSize.xs, color: colors.stone400, fontWeight: '500' },
  miniStatDivider: { width: 1, height: 32, backgroundColor: colors.outlineVariant },

  // ── 감정 분포 바
  emotionBar: {
    flexDirection: 'row', height: 6, borderRadius: 999,
    overflow: 'hidden', marginTop: spacing.sm, marginBottom: 4,
  },
  emotionSegment: { height: 6 },
  emotionLegend: { fontSize: fontSize.xs, color: colors.stone500, marginTop: 2 },

  // ── 복약 카드
  pillCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.lg,
  },
  pillTaken: { backgroundColor: colors.emerald100 },
  pillPending: { backgroundColor: '#FEF3C7' },
  pillIconWrap: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  pillTitle: { fontWeight: '700', fontSize: fontSize.md },
  pillSub: { fontSize: fontSize.xs, color: colors.stone400, marginTop: 2 },

  // ── 주간 차트
  chartCard: { marginBottom: spacing.lg, padding: spacing.lg, paddingTop: spacing.md },
  barsContainer: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', height: 120,
  },
  barWrapper: { alignItems: 'center', gap: 6, flex: 1 },
  barCount: { fontSize: 9, color: colors.stone400, fontWeight: '600', height: 14 },
  bar: { width: 14, borderTopLeftRadius: 999, borderTopRightRadius: 999 },
  barLabel: { fontSize: fontSize.xs, color: colors.stone400 },
  barLabelActive: { color: colors.gradientStart, fontWeight: '700' },

  // ── 빠른 메뉴
  actionGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    gap: 6,
  },
  actionIcon: {
    width: 44, height: 44, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  actionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.onSurface },
  actionSub: { fontSize: fontSize.xs, color: colors.stone400 },
});
