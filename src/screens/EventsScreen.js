import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
} from 'react-native';
import Icon from '../components/Icon';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import HapticButton from '../components/HapticButton';
import Card from '../components/Card';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  EVENT_TYPES,
  getEventTypeMeta,
  addEvent,
  deleteEvent,
  subscribeEvents,
} from '../services/eventsService';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMD(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function buildWeek(centerDate = new Date()) {
  // 오늘부터 미래 6일까지 (총 7일)
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + i);
    days.push(isoDate(d));
  }
  return days;
}

export default function EventsScreen({ navigation }) {
  const { activeSeniorId } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const calDow = Math.max(10, Math.min(18, screenWidth * 0.026));
  const calDate = Math.max(11, Math.min(20, screenWidth * 0.029));
  const [events, setEvents] = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const today = isoDate(new Date());
  const weekDays = buildWeek();
  const [selectedDate, setSelectedDate] = useState(today);

  // 폼 상태
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(today);
  const [newTime, setNewTime] = useState('');
  const [newType, setNewType] = useState('family');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    const unsub = subscribeEvents((items) => {
      setEvents(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Firestore에서 복약 목록 구독 (캘린더에 같이 표시)
  useEffect(() => {
    if (!activeSeniorId) return;
    const q = query(collection(db, 'medications', activeSeniorId, 'items'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMedications(snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((m) => m.enabled !== false));
    }, () => setMedications([]));
    return unsub;
  }, [activeSeniorId]);

  const eventsByDate = {};
  events.forEach((e) => {
    if (!e.date) return;
    if (!eventsByDate[e.date]) eventsByDate[e.date] = [];
    eventsByDate[e.date].push(e);
  });

  const dayEvents = (eventsByDate[selectedDate] || []).slice().sort((a, b) => {
    return (a.time || '99:99').localeCompare(b.time || '99:99');
  });

  // 처방은 매일 동일 시간에 반복되는 것으로 표시
  const dayMedications = medications.map((m) => ({
    id: `med-${m.id}`,
    title: m.name,
    time: m.time,
    type: 'medication',
    description: m.dosage || '',
    isMedication: true,
  }));

  const dayItems = [...dayEvents, ...dayMedications].sort((a, b) =>
    (a.time || '99:99').localeCompare(b.time || '99:99')
  );

  async function handleAdd() {
    if (!newTitle.trim()) {
      Alert.alert('입력 오류', '일정 제목을 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      await addEvent({
        title: newTitle,
        date: newDate,
        time: newTime,
        type: newType,
        description: newDesc,
      });
      if (newDate) setSelectedDate(newDate);
      setNewTitle('');
      setNewTime('');
      setNewDesc('');
      setShowAdd(false);
    } catch (e) {
      Alert.alert('오류', e.message || '일정 추가 실패');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(event) {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`"${event.title}"을(를) 삭제하시겠습니까?`)
      : await new Promise((resolve) =>
          Alert.alert(
            '삭제 확인',
            `"${event.title}"을(를) 삭제하시겠습니까?`,
            [
              { text: '취소', style: 'cancel', onPress: () => resolve(false) },
              { text: '삭제', style: 'destructive', onPress: () => resolve(true) },
            ],
            { onDismiss: () => resolve(false) }
          )
        );
    if (!confirmed) return;
    try {
      await deleteEvent(event.id);
    } catch {
      Alert.alert('오류', '삭제에 실패했습니다.');
    }
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="ChevronRight" size={24} color={colors.onSurface} />
          </HapticButton>
          <Text style={styles.title}>일정 캘린더</Text>
          <HapticButton onPress={() => setShowAdd(!showAdd)}>
            <Icon name="Plus" size={24} color={colors.gradientStart} />
          </HapticButton>
        </View>

        {/* 7일 그리드 */}
        <View style={styles.calendarSection}>
          <View style={styles.calendarTitleRow}>
            <Text style={styles.calendarTitle}>이번 주</Text>
            <View style={styles.legendInline}>
              <View style={[styles.legendDot, { backgroundColor: colors.stone400 }]} />
              <Text style={styles.legendText}>= 복약</Text>
            </View>
          </View>
          <View style={styles.calendarGrid}>
            {weekDays.map((dateStr) => {
              const dayEvs = eventsByDate[dateStr] || [];
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === today;
              const dow = new Date(dateStr).getDay();
              return (
                <HapticButton
                  key={dateStr}
                  onPress={() => setSelectedDate(dateStr)}
                  style={[
                    styles.calendarCell,
                    isSelected && styles.calendarCellSelected,
                    isToday && !isSelected && styles.calendarCellToday,
                  ]}
                >
                  <Text style={[styles.calendarDow, { fontSize: calDow }, isSelected && styles.calendarTextSelected]}>
                    {DAY_LABELS[dow]}
                  </Text>
                  <Text style={[styles.calendarDate, { fontSize: calDate }, isSelected && styles.calendarTextSelected]}>
                    {formatMD(dateStr)}
                  </Text>
                  <View style={styles.dotRow}>
                    {dayEvs.slice(0, 3).map((e) => (
                      <View
                        key={e.id}
                        style={[styles.calDot, { backgroundColor: getEventTypeMeta(e.type).color }]}
                      />
                    ))}
                    {dayEvs.length > 3 && (
                      <Text style={styles.calMore}>+{dayEvs.length - 3}</Text>
                    )}
                    {dayEvs.length === 0 && medications.length > 0 && (
                      <View style={[styles.calDot, { backgroundColor: colors.stone400 }]} />
                    )}
                  </View>
                </HapticButton>
              );
            })}
          </View>
        </View>

        {/* 추가 폼 */}
        {showAdd && (
          <Card style={styles.addForm}>
            <Text style={styles.formTitle}>새 일정 추가</Text>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>제목</Text>
              <TextInput
                style={styles.formInput}
                placeholder="예: 가족 모임"
                placeholderTextColor={colors.stone400}
                value={newTitle}
                onChangeText={setNewTitle}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>날짜</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.stone400}
                value={newDate}
                onChangeText={setNewDate}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>시간 (선택)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="14:00"
                placeholderTextColor={colors.stone400}
                value={newTime}
                onChangeText={setNewTime}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>분류</Text>
              <View style={styles.typeRow}>
                {EVENT_TYPES.map((t) => (
                  <HapticButton
                    key={t.key}
                    onPress={() => setNewType(t.key)}
                    style={[
                      styles.typeChip,
                      newType === t.key && { backgroundColor: t.color, borderColor: t.color },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        newType === t.key && { color: '#fff' },
                      ]}
                    >
                      {t.emoji} {t.label}
                    </Text>
                  </HapticButton>
                ))}
              </View>
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>메모 (선택)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="예: 손주랑 외식"
                placeholderTextColor={colors.stone400}
                value={newDesc}
                onChangeText={setNewDesc}
              />
            </View>
            <View style={styles.formActions}>
              <HapticButton onPress={() => setShowAdd(false)} style={styles.formCancelBtn}>
                <Text style={styles.formCancelText}>취소</Text>
              </HapticButton>
              <HapticButton
                onPress={handleAdd}
                hapticType="medium"
                style={[styles.formSaveBtn, saving && { opacity: 0.6 }]}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.formSaveText}>추가</Text>
                )}
              </HapticButton>
            </View>
          </Card>
        )}

        {/* 일자별 상세 */}
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={styles.dayTitle}>{formatMD(selectedDate)} 일정</Text>
          {loading ? (
            <ActivityIndicator color={colors.gradientStart} style={{ marginTop: 30 }} />
          ) : dayItems.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="Calendar" size={36} color={colors.stone400} />
              <Text style={styles.emptyText}>이 날 등록된 일정이 없습니다</Text>
            </View>
          ) : (
            dayItems.map((item) => {
              const meta = item.isMedication
                ? { color: '#7C3AED', emoji: '💊', label: '복약' }
                : getEventTypeMeta(item.type);
              return (
                <View key={item.id} style={styles.itemCard}>
                  <View style={[styles.itemAccent, { backgroundColor: meta.color }]} />
                  <View style={styles.itemBody}>
                    <View style={styles.itemTopRow}>
                      <Text style={styles.itemEmoji}>{meta.emoji}</Text>
                      <Text style={[styles.itemTypeLabel, { color: meta.color }]}>{meta.label}</Text>
                      {item.time ? <Text style={styles.itemTime}>{item.time}</Text> : null}
                    </View>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.description ? (
                      <Text style={styles.itemDesc}>{item.description}</Text>
                    ) : null}
                  </View>
                  {!item.isMedication && (
                    <HapticButton onPress={() => handleDelete(item)} style={styles.itemDelete}>
                      <Icon name="Trash2" size={16} color={colors.error} />
                    </HapticButton>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  inner: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
    transform: [{ scaleX: -1 }],
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.onSurface },

  calendarSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  calendarTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  calendarTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
  },
  legendInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: fontSize.xs, color: colors.stone500 },
  calendarGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  calendarCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'transparent',
    minHeight: 64,
  },
  calendarCellSelected: { backgroundColor: colors.primaryFixed },
  calendarCellToday: { borderWidth: 1, borderColor: colors.gradientStart },
  calendarDow: { fontSize: 10, color: colors.stone500, marginBottom: 2 },
  calendarDate: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.onSurface, marginBottom: 4 },
  calendarTextSelected: { color: colors.primaryDark },
  dotRow: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 8 },
  calDot: { width: 6, height: 6, borderRadius: 3 },
  calMore: { fontSize: 9, color: colors.stone500, marginLeft: 2 },

  addForm: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.lg },
  formTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.onSurface, marginBottom: spacing.md },
  formRow: { marginBottom: spacing.sm },
  formLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.stone500, marginBottom: 4 },
  formInput: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: fontSize.md,
    color: colors.onSurface,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 9999, borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  typeChipText: { fontSize: fontSize.sm, color: colors.stone500, fontWeight: fontWeight.semibold },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  formCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainer, alignItems: 'center',
  },
  formCancelText: { fontWeight: fontWeight.semibold, color: colors.stone500 },
  formSaveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: borderRadius.sm,
    backgroundColor: colors.gradientStart, alignItems: 'center',
  },
  formSaveText: { fontWeight: fontWeight.bold, color: '#FFF' },

  list: { flex: 1, paddingHorizontal: spacing.lg },
  dayTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.stone500, marginBottom: spacing.sm },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { color: colors.stone400, fontSize: fontSize.md },

  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  itemAccent: { width: 4 },
  itemBody: { flex: 1, padding: spacing.md },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  itemEmoji: { fontSize: 14 },
  itemTypeLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  itemTime: { marginLeft: 'auto', fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primaryDark },
  itemTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.onSurface },
  itemDesc: { fontSize: fontSize.sm, color: colors.stone500, marginTop: 2 },
  itemDelete: { padding: spacing.md, justifyContent: 'center' },
});
