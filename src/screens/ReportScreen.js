import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Sparkles,
  Calendar,
  Smile,
  Heart,
  Users,
  Footprints,
} from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import Card from '../components/Card';
import HapticButton from '../components/HapticButton';
import { useCollection } from '../hooks/useFirestore';

const TABS = ['일간', '주간', '월간'];

const HEATMAP = [
  { label: '06-09', opacity: 0.3 },
  { label: '09-12', opacity: 0.6 },
  { label: '12-15', opacity: 0.8 },
  { label: '15-18', opacity: 1 },
  { label: '18-21', opacity: 0.5 },
  { label: '21-24', opacity: 0.2 },
];

const MOCK_TIMELINE = [
  {
    id: '1',
    time: '오전 10:24',
    title: '가족 사진에 3회 미소',
    desc: '거실에서 손주들의 사진을 보며 따뜻한 표정을 지으셨습니다.',
    color: colors.secondary,
    icon: 'smile',
  },
  {
    id: '2',
    time: '오후 02:15',
    title: '거실 화분 물주기 완료',
    desc: '평소보다 가벼운 걸음걸이로 식물들을 돌보셨습니다.',
    color: colors.primaryDark,
    icon: 'heart',
  },
  {
    id: '3',
    time: '오후 04:40',
    title: '친구와 영상 통화 15분',
    desc: '김철수 님과 통화하며 즐거운 대화를 나누셨습니다.',
    color: colors.tertiary,
    icon: 'users',
  },
];

function getIcon(name, color) {
  const props = { size: 20, color };
  switch (name) {
    case 'smile': return <Smile {...props} />;
    case 'heart': return <Heart {...props} />;
    case 'users': return <Users {...props} />;
    default: return <Smile {...props} />;
  }
}

export default function ReportScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Firestore에서 활동 데이터 가져오기 (DB 연결 시 활성화)
  const { data: activities, loading } = useCollection('activities', 'timestamp');

  // 실제 데이터가 있으면 사용, 없으면 mock 데이터
  const timelineData = activities.length > 0 ? activities : MOCK_TIMELINE;

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
        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          {TABS.map((tab, i) => (
            <HapticButton
              key={tab}
              onPress={() => setActiveTab(i)}
              style={[
                styles.tab,
                activeTab === i && styles.tabActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === i && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>
            </HapticButton>
          ))}
        </View>

        {/* AI Insight */}
        <LinearGradient
          colors={[colors.primaryDark, colors.primaryContainer]}
          style={styles.aiCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.aiHeader}>
            <Sparkles size={20} color={colors.white} />
            <Text style={styles.aiTitle}>AI 주간 분석</Text>
          </View>
          <Text style={styles.aiBody}>
            "이번 주 활동량이 평소보다 20% 높습니다. 정원 산책을 즐기시는
            모습이 많이 포착되었네요."
          </Text>
          <View style={styles.aiFooter}>
            <Calendar size={12} color="rgba(255,255,255,0.8)" />
            <Text style={styles.aiFooterText}>
              지난 7일간의 기록을 바탕으로 분석되었습니다.
            </Text>
          </View>
        </LinearGradient>

        {/* Detection Heatmap */}
        <Card style={styles.heatmapCard}>
          <View style={styles.heatmapHeader}>
            <View>
              <Text style={styles.sectionTitle}>활동 히트맵</Text>
              <Text style={styles.sectionSub}>시간대별 소중한 순간 감지</Text>
            </View>
            <View style={styles.trendBadge}>
              <Text style={styles.trendText}>상승세</Text>
            </View>
          </View>
          <View style={styles.heatmapGrid}>
            {HEATMAP.map((item) => (
              <View key={item.label} style={styles.heatmapCol}>
                <View
                  style={[
                    styles.heatmapBlock,
                    { opacity: item.opacity, backgroundColor: item.opacity > 0.7 ? colors.primaryDark : item.opacity > 0.4 ? colors.secondaryContainer : colors.tertiaryFixedDim },
                  ]}
                />
                <Text style={styles.heatmapLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.heatmapNote}>
            오후 3시에서 6시 사이에 가장 활발한 웃음이 기록되었습니다.
          </Text>
        </Card>

        {/* Timeline */}
        <Text style={styles.sectionTitle2}>오늘의 타임라인</Text>
        {timelineData.map((item) => (
          <View
            key={item.id}
            style={[styles.timelineCard, { borderLeftColor: item.color }]}
          >
            <View style={styles.timelineIcon}>
              {getIcon(item.icon, item.color)}
            </View>
            <View style={styles.timelineContent}>
              <Text style={[styles.timelineTime, { color: item.color }]}>
                {item.time || item.timestamp}
              </Text>
              <Text style={styles.timelineTitle}>{item.title}</Text>
              <Text style={styles.timelineDesc}>{item.desc || item.description}</Text>
            </View>
          </View>
        ))}

        {/* Weekly Comparison */}
        <View style={styles.compareRow}>
          <View style={[styles.compareCard, { backgroundColor: colors.tertiaryFixed }]}>
            <Smile size={20} color={colors.onSurface} />
            <Text style={styles.compareLabel}>긍정 정서</Text>
            <View style={styles.compareValueRow}>
              <Text style={styles.compareValue}>88%</Text>
              <Text style={styles.compareSub}>지난주 대비 +5%</Text>
            </View>
          </View>
          <View style={[styles.compareCard, { backgroundColor: colors.secondaryFixed }]}>
            <Footprints size={20} color={colors.onSurface} />
            <Text style={styles.compareLabel}>활동 지수</Text>
            <View style={styles.compareValueRow}>
              <Text style={styles.compareValue}>7.2</Text>
              <Text style={styles.compareSub}>매우 높음</Text>
            </View>
          </View>
        </View>
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
    borderRadius: borderRadius.full,
    padding: 6,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
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
    fontWeight: fontWeight.medium,
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    fontWeight: fontWeight.bold,
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
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  aiBody: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.medium,
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
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
  },
  sectionSub: {
    fontSize: fontSize.md,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  trendBadge: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  trendText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
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
  sectionTitle2: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },
  timelineCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.xxl,
    padding: 20,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    marginBottom: spacing.sm,
  },
  timelineIcon: {
    backgroundColor: colors.white,
    padding: 8,
    borderRadius: borderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineContent: { flex: 1 },
  timelineTime: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    color: colors.onSurface,
  },
  timelineDesc: {
    fontSize: fontSize.md,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 20,
  },
  compareRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  compareCard: {
    flex: 1,
    padding: 20,
    borderRadius: borderRadius.xl,
    gap: 8,
  },
  compareLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
  },
  compareValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 },
  compareValue: {
    fontSize: 24,
    fontWeight: fontWeight.extrabold,
    color: colors.onSurface,
  },
  compareSub: { fontSize: fontSize.xs, color: colors.onSurfaceVariant },
});
