import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
  Animated,
  Switch,
  Modal,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, onSnapshot, query, orderBy,
  where, getDocs,
} from 'firebase/firestore';
import Icon from '../components/Icon';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadow } from '../theme';
import HapticButton from '../components/HapticButton';
import Card from '../components/Card';
import Screen from '../components/Screen';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSenior } from '../contexts/SeniorContext';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// "HH:MM"에서 시(h)/분(m)을 delta만큼 증감 (순환)
function adjustTimeStr(t, unit, delta) {
  let [h, m] = (t || '09:00').split(':').map(Number);
  if (unit === 'h') h = (h + delta + 24) % 24;
  else m = (m + delta + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}


function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMD(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function todayISO() {
  return toISO(new Date());
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=일
  d.setDate(d.getDate() - day);
  return toISO(d);
}

function getStatusKind(day) {
  const p = day?.summary?.prescribed_count || 0;
  const t = day?.summary?.taken_count || 0;
  if (p === 0) return 'none';
  if (t === 0) return 'missed';
  if (t >= p) return 'full';
  return 'partial';
}

export default function MedicationScreen({ navigation }) {
  const { isPillTaken } = useSenior();
  const { activeSeniorId } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const calDow = Math.max(10, Math.min(18, screenWidth * 0.026));
  const calDate = Math.max(11, Math.min(20, screenWidth * 0.029));
  const calDot = Math.max(22, Math.min(36, screenWidth * 0.055));
  const calDotText = Math.max(10, Math.min(16, screenWidth * 0.024));

  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newDosage, setNewDosage] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newStock, setNewStock] = useState('');
  const [saving, setSaving] = useState(false);
  const [stockAlerts, setStockAlerts] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 캘린더 공통
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' | 'monthly'
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [calendarLoading, setCalendarLoading] = useState(false);

  // 주간 뷰
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [calendarDays, setCalendarDays] = useState([]);

  // 월간 뷰
  const today = new Date();
  const [monthYear, setMonthYear] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [monthlyDays, setMonthlyDays] = useState([]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (!activeSeniorId) {
      setMedications([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'medications', activeSeniorId, 'items'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMedications(items);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [activeSeniorId]);

  const loadCalendar = useCallback(async () => {
    if (!activeSeniorId) return;
    setCalendarLoading(true);
    try {
      let from, to;
      if (viewMode === 'weekly') {
        const start = new Date(weekStart);
        const end = new Date(weekStart);
        end.setDate(end.getDate() + 6);
        from = toISO(start);
        to = toISO(end);
      } else {
        const { year, month } = monthYear;
        from = toISO(new Date(year, month, 1));
        to = toISO(new Date(year, month + 1, 0));
      }

      // medication_logs Firestore 직접 조회
      const logsSnap = await getDocs(query(
        collection(db, 'medication_logs'),
        where('device_id', '==', activeSeniorId),
        where('date', '>=', from),
        where('date', '<=', to),
      ));
      const logsByDate = {};
      logsSnap.forEach((d) => {
        const data = d.data();
        if (!logsByDate[data.date]) logsByDate[data.date] = [];
        logsByDate[data.date].push({
          med_id: data.med_id,
          med_name: data.med_name,
          slot: data.slot,
          taken_at: data.taken_at,
        });
      });

      // prescribed = 현재 로드된 medications
      const prescribed = medications.map((m) => ({
        med_id: m.id,
        name: m.name,
        time: m.time || '09:00',
        dosage: m.dosage || '',
      }));

      const now = new Date();
      const days = [];
      const cursor = new Date(from + 'T00:00:00');
      const toDate = new Date(to + 'T00:00:00');
      while (cursor <= toDate) {
        const dateKey = toISO(cursor);
        const taken = logsByDate[dateKey] || [];
        const takenMedIds = new Set(taken.map((t) => t.med_id).filter(Boolean));
        const missed = [];
        for (const p of prescribed) {
          try {
            const [h, mm] = p.time.split(':').map(Number);
            const pDt = new Date(cursor);
            pDt.setHours(h, mm, 0, 0);
            const cutoff = new Date(pDt.getTime() + 2 * 60 * 60 * 1000);
            if (now < cutoff) continue;
            if (!takenMedIds.has(p.med_id)) {
              missed.push({ med_id: p.med_id, name: p.name, time: p.time });
            }
          } catch {}
        }
        days.push({
          date: dateKey,
          prescribed,
          taken,
          missed,
          summary: {
            prescribed_count: prescribed.length,
            taken_count: taken.length,
            missed_count: missed.length,
          },
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      if (viewMode === 'weekly') {
        setCalendarDays(days);
      } else {
        setMonthlyDays(days);
      }
    } catch (e) {
      console.warn('[loadCalendar] Firebase 조회 실패:', e);
    } finally {
      setCalendarLoading(false);
    }
  }, [activeSeniorId, viewMode, weekStart, monthYear, medications]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  useEffect(() => {
    if (isPillTaken) loadCalendar();
  }, [isPillTaken, loadCalendar]);

  const selectedDay = calendarDays.find((d) => d.date === selectedDate);

  // 월간 캘린더 그리드 셀 계산
  function buildMonthGrid() {
    const { year, month } = monthYear;
    const firstDay = new Date(year, month, 1).getDay(); // 0=일
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toISO(new Date(year, month, d));
      const dayData = monthlyDays.find((x) => x.date === iso);
      cells.push({ iso, d, dayData });
    }
    // 마지막 행 채우기
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }

  async function handleAdd() {
    if (!newName.trim() || !activeSeniorId) {
      Alert.alert('입력 오류', activeSeniorId ? '약 이름을 입력해주세요.' : '페어링이 필요합니다.');
      return;
    }
    setSaving(true);
    try {
      const [hour, minute] = (newTime.trim() || '09:00').split(':').map(Number);
      await addDoc(collection(db, 'medications', activeSeniorId, 'items'), {
        name: newName.trim(),
        time: newTime.trim() || '09:00',
        schedule: [{ hour: hour || 9, minute: minute || 0 }],
        dosage: newDosage.trim(),
        notes: newNotes.trim(),
        stock: Number(newStock) || 0,
        enabled: true,
        createdAt: serverTimestamp(),
      });
      setNewName(''); setNewTime('09:00'); setNewDosage('');
      setNewNotes(''); setNewStock(''); setShowAdd(false);
    } catch {
      Alert.alert('오류', '약 추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(med) {
    if (!activeSeniorId) return;
    try {
      await updateDoc(doc(db, 'medications', activeSeniorId, 'items', med.id), { enabled: !med.enabled });
    } catch {}
  }

  async function handleDelete(med) {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`"${med.name}"을(를) 삭제하시겠습니까?`)
      : await new Promise((resolve) =>
          Alert.alert('삭제 확인', `"${med.name}"을(를) 삭제하시겠습니까?`,
            [
              { text: '취소', style: 'cancel', onPress: () => resolve(false) },
              { text: '삭제', style: 'destructive', onPress: () => resolve(true) },
            ],
            { onDismiss: () => resolve(false) }
          )
        );
    if (!confirmed || !activeSeniorId) return;
    try {
      await deleteDoc(doc(db, 'medications', activeSeniorId, 'items', med.id));
    } catch {}
  }

  const monthGrid = viewMode === 'monthly' ? buildMonthGrid() : [];
  const monthLabel = `${monthYear.year}년 ${monthYear.month + 1}월`;
  const weekLabel = (() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `${formatMD(weekStart)} ~ ${formatMD(toISO(end))}`;
  })();

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {/* 헤더 — 상단 고정 */}
        <View style={styles.header}>
          <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="ChevronRight" size={24} color={colors.onSurface} />
          </HapticButton>
          <Text style={styles.title}>복약 관리</Text>
          <HapticButton onPress={() => setShowAdd(!showAdd)}>
            <Icon name="Plus" size={24} color={colors.gradientStart} />
          </HapticButton>
        </View>

        {/* 나머지 전체를 단일 ScrollView로 */}
        <Screen padded={false} contentStyle={{ paddingTop: 0 }}>
        {/* 잔량 부족 경고 */}
        {stockAlerts.length > 0 && (
          <View style={styles.stockBannerWrap}>
            {stockAlerts.map((a) => (
              <View key={a.name} style={[styles.stockBanner, a.level === 'out' && styles.stockBannerOut, a.level === 'critical' && styles.stockBannerCritical, a.level === 'warning' && styles.stockBannerWarning]}>
                <Icon name={a.level === 'out' ? 'AlertTriangle' : 'Bell'} size={18} color={a.level === 'warning' ? '#92400E' : colors.error} />
                <Text style={styles.stockBannerText}>
                  {a.level === 'out' ? `${a.name} 재고 없음 — 처방 받으세요` : `${a.name} 잔량 ${a.days_left}일분 (${a.stock}정) — 처방 받으세요`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 오늘 복약 상태 */}
        <View style={[styles.statusCard, isPillTaken ? styles.statusTaken : styles.statusPending]}>
          <View style={styles.statusIcon}>
            <Icon name={isPillTaken ? 'ShieldCheck' : 'AlertTriangle'} size={28} color={isPillTaken ? colors.emerald700 : '#92400E'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, isPillTaken ? { color: colors.emerald700 } : { color: '#92400E' }]}>
              {isPillTaken ? '오늘 약 복용 완료' : '아직 약을 복용하지 않았습니다'}
            </Text>
            <Text style={styles.statusSub}>
              {isPillTaken ? '어르신이 오늘 약 복용을 확인하셨습니다' : '어르신의 약 복용 여부를 확인해주세요'}
            </Text>
          </View>
        </View>

        {/* 복약 캘린더 */}
        <View style={styles.calendarSection}>
          {/* 주간/월간 토글 */}
          <View style={styles.viewToggle}>
            <HapticButton
              onPress={() => setViewMode('weekly')}
              style={[styles.toggleBtn, viewMode === 'weekly' && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, viewMode === 'weekly' && styles.toggleTextActive]}>주간</Text>
            </HapticButton>
            <HapticButton
              onPress={() => setViewMode('monthly')}
              style={[styles.toggleBtn, viewMode === 'monthly' && styles.toggleBtnActive]}
            >
              <Text style={[styles.toggleText, viewMode === 'monthly' && styles.toggleTextActive]}>월간</Text>
            </HapticButton>
          </View>

          {/* 네비게이션 */}
          <View style={styles.navRow}>
            <HapticButton
              style={styles.navBtn}
              onPress={() => {
                if (viewMode === 'weekly') {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() - 7);
                  setWeekStart(toISO(d));
                } else {
                  setMonthYear(({ year, month }) => {
                    const d = new Date(year, month - 1, 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  });
                }
              }}
            >
              <Icon name="ChevronLeft" size={20} color={colors.onSurface} />
            </HapticButton>
            <Text style={styles.navLabel}>{viewMode === 'weekly' ? weekLabel : monthLabel}</Text>
            <HapticButton
              style={styles.navBtn}
              onPress={() => {
                if (viewMode === 'weekly') {
                  const d = new Date(weekStart);
                  d.setDate(d.getDate() + 7);
                  setWeekStart(toISO(d));
                } else {
                  setMonthYear(({ year, month }) => {
                    const d = new Date(year, month + 1, 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  });
                }
              }}
            >
              <Icon name="ChevronRight" size={20} color={colors.onSurface} />
            </HapticButton>
          </View>

          {calendarLoading ? (
            <ActivityIndicator color={colors.gradientStart} style={{ marginVertical: 20 }} />
          ) : viewMode === 'weekly' ? (
            <>
              {/* 주간 그리드 */}
              {calendarDays.length > 0 ? (
                <View style={styles.calendarGrid}>
                  {calendarDays.map((day) => {
                    const kind = getStatusKind(day);
                    const isSelected = day.date === selectedDate;
                    const isToday = day.date === todayISO();
                    const dow = new Date(day.date + 'T00:00:00').getDay();
                    return (
                      <HapticButton
                        key={day.date}
                        onPress={() => setSelectedDate(day.date)}
                        style={[styles.calendarCell, isToday && !isSelected && styles.calendarCellToday, isSelected && styles.calendarCellSelected]}
                      >
                        <Text style={[styles.calendarDow, { fontSize: calDow }, isSelected && styles.calendarTextSelected]}>{DAY_LABELS[dow]}</Text>
                        <Text style={[styles.calendarDate, { fontSize: calDate }, isSelected && styles.calendarTextSelected]}>{formatMD(day.date)}</Text>
                        <View style={[styles.calendarDot, { minWidth: calDot, height: calDot * 0.7, borderRadius: calDot * 0.35 }, kind === 'full' && styles.dotFull, kind === 'partial' && styles.dotPartial, kind === 'missed' && styles.dotMissed, kind === 'none' && styles.dotNone]}>
                          <Text style={[styles.calendarDotText, { fontSize: calDotText }]}>{day.summary.taken_count}/{day.summary.prescribed_count || '-'}</Text>
                        </View>
                      </HapticButton>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.calendarEmpty}>복약 기록이 없습니다</Text>
              )}

              {/* 선택된 날짜 상세 */}
              {selectedDay && (
                <View style={styles.daySummary}>
                  <Text style={styles.daySummaryTitle}>{formatMD(selectedDay.date)} 상세</Text>
                  {(selectedDay.prescribed || []).length === 0 ? (
                    <Text style={styles.daySummaryEmpty}>처방된 약이 없습니다</Text>
                  ) : (
                    selectedDay.prescribed.map((p) => {
                      const taken = (selectedDay.taken || []).find((t) => t.med_id === p.med_id);
                      const missed = (selectedDay.missed || []).some((m) => m.med_id === p.med_id);
                      return (
                        <View key={p.med_id} style={styles.daySummaryRow}>
                          <Text style={styles.daySummaryTime}>{p.time}</Text>
                          <Text style={styles.daySummaryName}>{p.name}</Text>
                          {taken ? (
                            <View style={styles.badgeTaken}>
                              <Icon name="ShieldCheck" size={12} color={colors.emerald700} />
                              <Text style={styles.badgeTakenText}>{(taken.taken_at || '').slice(11, 16) || '복용'}</Text>
                            </View>
                          ) : missed ? (
                            <View style={styles.badgeMissed}><Text style={styles.badgeMissedText}>미복용</Text></View>
                          ) : (
                            <View style={styles.badgePending}><Text style={styles.badgePendingText}>대기</Text></View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              {/* 월간 그리드 */}
              <View style={styles.monthDowRow}>
                {DAY_LABELS.map((l) => (
                  <Text key={l} style={styles.monthDowLabel}>{l}</Text>
                ))}
              </View>
              <View style={styles.monthGrid}>
                {monthGrid.map((cell, idx) => {
                  if (!cell) return <View key={`empty-${idx}`} style={styles.monthCell} />;
                  const kind = cell.dayData ? getStatusKind(cell.dayData) : 'none';
                  const isToday = cell.iso === todayISO();
                  const isSelected = cell.iso === selectedDate;
                  const isPast = cell.iso < todayISO();
                  return (
                    <HapticButton
                      key={cell.iso}
                      onPress={() => setSelectedDate(cell.iso)}
                      style={styles.monthCell}
                    >
                      <View style={[
                        styles.monthDateCircle,
                        isToday && styles.monthDateCircleToday,
                        isSelected && !isToday && styles.monthDateCircleSelected,
                      ]}>
                        <Text style={[
                          styles.monthDateText,
                          isPast && !isToday && !isSelected && styles.monthDateTextPast,
                          isToday && styles.monthDateTextToday,
                          isSelected && styles.monthDateTextSelected,
                        ]}>
                          {cell.d}
                        </Text>
                      </View>
                      {kind !== 'none' && (
                        <View style={[styles.monthDot, kind === 'full' && styles.dotFull, kind === 'partial' && styles.dotPartial, kind === 'missed' && styles.dotMissed]} />
                      )}
                    </HapticButton>
                  );
                })}
              </View>

              {/* 월간 선택 날짜 상세 */}
              {selectedDate && (() => {
                const sel = monthlyDays.find((d) => d.date === selectedDate);
                if (!sel) return null;
                return (
                  <View style={styles.daySummary}>
                    <Text style={styles.daySummaryTitle}>{formatMD(selectedDate)} 상세</Text>
                    {(sel.prescribed || []).length === 0 ? (
                      <Text style={styles.daySummaryEmpty}>처방된 약이 없습니다</Text>
                    ) : (
                      sel.prescribed.map((p) => {
                        const taken = (sel.taken || []).find((t) => t.med_id === p.med_id);
                        const missed = (sel.missed || []).some((m) => m.med_id === p.med_id);
                        return (
                          <View key={p.med_id} style={styles.daySummaryRow}>
                            <Text style={styles.daySummaryTime}>{p.time}</Text>
                            <Text style={styles.daySummaryName}>{p.name}</Text>
                            {taken ? (
                              <View style={styles.badgeTaken}>
                                <Icon name="ShieldCheck" size={12} color={colors.emerald700} />
                                <Text style={styles.badgeTakenText}>{(taken.taken_at || '').slice(11, 16) || '복용'}</Text>
                              </View>
                            ) : missed ? (
                              <View style={styles.badgeMissed}><Text style={styles.badgeMissedText}>미복용</Text></View>
                            ) : (
                              <View style={styles.badgePending}><Text style={styles.badgePendingText}>대기</Text></View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                );
              })()}
            </>
          )}

          {/* 범례 */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.dotFull]} /><Text style={styles.legendText}>완전</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.dotPartial]} /><Text style={styles.legendText}>일부</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.dotMissed]} /><Text style={styles.legendText}>미복용</Text></View>
          </View>
        </View>

        {/* 약 추가 폼 */}
        {showAdd && (
          <Card style={styles.addForm}>
            <Text style={styles.formTitle}>새 약 추가</Text>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>약 이름</Text>
              <TextInput style={styles.formInput} placeholder="예: 혈압약" placeholderTextColor={colors.stone400} value={newName} onChangeText={setNewName} />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>복용 시간</Text>
              <HapticButton style={[styles.formInput, styles.timeInput]} onPress={() => setShowTimePicker(true)}>
                <Icon name="Clock" size={18} color={colors.gradientStart} />
                <Text style={styles.timeInputText}>{newTime || '시간 선택'}</Text>
              </HapticButton>
            </View>

            {/* 시간 선택 모달 (네이티브 모듈 없이 동작 — Expo Go 호환) */}
            <Modal visible={showTimePicker} transparent animationType="fade" onRequestClose={() => setShowTimePicker(false)}>
              <Pressable style={styles.timeOverlay} onPress={() => setShowTimePicker(false)}>
                <Pressable style={styles.timeModalCard} onPress={() => {}}>
                  <Text style={styles.timeModalTitle}>복용 시간 선택</Text>
                  <View style={styles.timeStepperRow}>
                    <View style={styles.timeCol}>
                      <Text style={styles.timeColLabel}>시</Text>
                      <View style={styles.timeStepperBox}>
                        <HapticButton style={styles.stepBtn} onPress={() => setNewTime(adjustTimeStr(newTime, 'h', 1))}>
                          <Icon name="Plus" size={20} color={colors.gradientStart} />
                        </HapticButton>
                        <Text style={styles.timeNum}>{(newTime || '09:00').split(':')[0]}</Text>
                        <HapticButton style={styles.stepBtn} onPress={() => setNewTime(adjustTimeStr(newTime, 'h', -1))}>
                          <Icon name="Minus" size={20} color={colors.gradientStart} />
                        </HapticButton>
                      </View>
                    </View>
                    <Text style={styles.timeColonBig}>:</Text>
                    <View style={styles.timeCol}>
                      <Text style={styles.timeColLabel}>분</Text>
                      <View style={styles.timeStepperBox}>
                        <HapticButton style={styles.stepBtn} onPress={() => setNewTime(adjustTimeStr(newTime, 'm', 1))}>
                          <Icon name="Plus" size={20} color={colors.gradientStart} />
                        </HapticButton>
                        <Text style={styles.timeNum}>{(newTime || '09:00').split(':')[1]}</Text>
                        <HapticButton style={styles.stepBtn} onPress={() => setNewTime(adjustTimeStr(newTime, 'm', -1))}>
                          <Icon name="Minus" size={20} color={colors.gradientStart} />
                        </HapticButton>
                      </View>
                    </View>
                  </View>
                  <HapticButton style={styles.timeConfirmBtn} hapticType="medium" onPress={() => setShowTimePicker(false)}>
                    <Text style={styles.timeConfirmText}>확인</Text>
                  </HapticButton>
                </Pressable>
              </Pressable>
            </Modal>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>용량</Text>
              <TextInput style={styles.formInput} placeholder="예: 1정" placeholderTextColor={colors.stone400} value={newDosage} onChangeText={setNewDosage} />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>메모</Text>
              <TextInput style={styles.formInput} placeholder="예: 식후 30분" placeholderTextColor={colors.stone400} value={newNotes} onChangeText={setNewNotes} />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>잔량 (알약 개수)</Text>
              <TextInput style={styles.formInput} placeholder="예: 30" placeholderTextColor={colors.stone400} value={newStock} onChangeText={setNewStock} keyboardType="number-pad" />
            </View>
            <View style={styles.formActions}>
              <HapticButton onPress={() => setShowAdd(false)} style={styles.formCancelBtn}>
                <Text style={styles.formCancelText}>취소</Text>
              </HapticButton>
              <HapticButton onPress={handleAdd} hapticType="medium" style={[styles.formSaveBtn, saving && { opacity: 0.6 }]} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.formSaveText}>추가</Text>}
              </HapticButton>
            </View>
          </Card>
        )}

        {/* 약 목록 */}
        <View style={styles.medList}>
          {loading ? (
            <ActivityIndicator color={colors.gradientStart} style={{ marginTop: 30 }} />
          ) : medications.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="Heart" size={40} color={colors.stone400} />
              <Text style={styles.emptyTitle}>등록된 약이 없습니다</Text>
              <Text style={styles.emptySub}>위의 + 버튼으로 약을 추가해주세요</Text>
            </View>
          ) : (
            medications.map((med) => (
              <View key={med.id} style={[styles.medCard, !med.enabled && styles.medCardDisabled]}>
                <View style={styles.medRow}>
                  <View style={styles.medTimeBox}>
                    <Text style={styles.medTime}>{med.time}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{med.name}</Text>
                    {med.dosage ? <Text style={styles.medDosage}>{med.dosage}</Text> : null}
                    {med.notes ? <Text style={styles.medNotes}>{med.notes}</Text> : null}
                    {typeof med.stock === 'number' && (
                      <Text style={[styles.medStock, med.stock <= 0 && { color: colors.error }, med.stock > 0 && med.stock <= 7 && { color: '#92400E' }]}>
                        잔량 {med.stock}정
                      </Text>
                    )}
                  </View>
                  <Switch value={med.enabled} onValueChange={() => handleToggle(med)} trackColor={{ false: colors.surfaceDim, true: colors.emerald100 }} thumbColor={med.enabled ? colors.emerald700 : colors.stone400} />
                </View>
                <View style={styles.medActions}>
                  <HapticButton onPress={() => handleDelete(med)} style={styles.medDeleteBtn}>
                    <Icon name="Trash2" size={14} color={colors.error} />
                    <Text style={styles.medDeleteText}>삭제</Text>
                  </HapticButton>
                </View>
              </View>
            ))
          )}
        </View>
        </Screen>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  inner: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: 56, paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
    transform: [{ scaleX: -1 }],
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.onSurface },

  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.lg },
  statusTaken: { backgroundColor: colors.emerald100 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontWeight: fontWeight.bold, fontSize: fontSize.md },
  statusSub: { fontSize: fontSize.sm, color: colors.stone500, marginTop: 2 },

  calendarSection: {
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    padding: spacing.md, backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant,
  },

  // 주간/월간 토글
  viewToggle: { flexDirection: 'row', alignSelf: 'center', backgroundColor: colors.surfaceContainer, borderRadius: borderRadius.md, padding: 3, marginBottom: spacing.sm },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 6, borderRadius: borderRadius.sm - 1 },
  toggleBtnActive: { backgroundColor: colors.gradientStart },
  toggleText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.stone500 },
  toggleTextActive: { color: '#FFF' },

  // 네비게이션
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.surfaceContainer },
  navLabel: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.onSurface },

  calendarEmpty: { textAlign: 'center', color: colors.stone400, fontSize: fontSize.sm, paddingVertical: spacing.lg },

  // 주간 그리드
  calendarGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  calendarCell: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 2, borderRadius: borderRadius.sm, backgroundColor: 'transparent' },
  calendarCellSelected: { backgroundColor: colors.primaryFixed },
  calendarCellToday: { borderWidth: 1, borderColor: colors.gradientStart },
  calendarDow: { fontSize: 10, color: colors.stone500, marginBottom: 2 },
  calendarDate: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.onSurface, marginBottom: 4 },
  calendarTextSelected: { color: colors.primaryDark },
  calendarDot: { minWidth: 32, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  calendarDotText: { fontSize: 10, fontWeight: fontWeight.bold, color: '#fff' },

  // 월간 그리드
  monthDowRow: { flexDirection: 'row', marginBottom: 4 },
  monthDowLabel: { flex: 1, textAlign: 'center', fontSize: fontSize.xs, color: colors.stone500, fontWeight: fontWeight.semibold },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  monthCell: { width: '14.28%', alignItems: 'center', paddingVertical: 4 },
  monthDateCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  monthDateCircleToday: { backgroundColor: colors.gradientStart },
  monthDateCircleSelected: { backgroundColor: colors.primaryDark },
  monthDateText: { fontSize: fontSize.sm, color: colors.onSurface },
  monthDateTextPast: { color: colors.stone400 },
  monthDateTextToday: { color: '#FFF', fontWeight: fontWeight.bold },
  monthDateTextSelected: { color: '#FFF', fontWeight: fontWeight.bold },
  monthDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },

  dotFull: { backgroundColor: colors.emerald700 },
  dotPartial: { backgroundColor: '#F59E0B' },
  dotMissed: { backgroundColor: colors.error },
  dotNone: { backgroundColor: colors.stone400 },

  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: fontSize.xs, color: colors.stone500 },

  daySummary: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  daySummaryTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.stone500, marginBottom: spacing.sm },
  daySummaryEmpty: { fontSize: fontSize.sm, color: colors.stone400, textAlign: 'center', paddingVertical: spacing.sm },
  daySummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  daySummaryTime: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primaryDark, width: 48 },
  daySummaryName: { flex: 1, fontSize: fontSize.sm, color: colors.onSurface },
  badgeTaken: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: colors.emerald100 },
  badgeTakenText: { fontSize: fontSize.xs, color: colors.emerald700, fontWeight: fontWeight.semibold },
  badgeMissed: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: '#FEE2E2' },
  badgeMissedText: { fontSize: fontSize.xs, color: colors.error, fontWeight: fontWeight.semibold },
  badgePending: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: colors.surfaceContainer },
  badgePendingText: { fontSize: fontSize.xs, color: colors.stone500, fontWeight: fontWeight.semibold },

  addForm: { marginHorizontal: spacing.lg, marginBottom: spacing.lg, padding: spacing.lg },
  formTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.onSurface, marginBottom: spacing.md },
  formRow: { marginBottom: spacing.sm },
  formLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.stone500, marginBottom: 4 },
  formInput: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.outlineVariant, paddingHorizontal: 14, paddingVertical: 10, fontSize: fontSize.md, color: colors.onSurface },
  timeInput: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 13 },
  timeInputText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.onSurface },
  timeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  timeModalCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.xxl, padding: spacing.xl, width: '100%', maxWidth: 360, ...shadow.lg },
  timeModalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.onSurface, textAlign: 'center', marginBottom: spacing.lg },
  timeStepperRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  timeCol: { alignItems: 'center', gap: 8 },
  timeColLabel: { fontSize: fontSize.sm, color: colors.stone500, fontWeight: fontWeight.semibold },
  timeStepperBox: { alignItems: 'center', backgroundColor: colors.surfaceContainerLow, borderRadius: borderRadius.lg, paddingVertical: 8, paddingHorizontal: 8, gap: 6 },
  stepBtn: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.surfaceContainerLowest },
  timeNum: { fontSize: 30, fontWeight: '800', color: colors.onSurface, minWidth: 60, textAlign: 'center', paddingVertical: 2 },
  timeColonBig: { fontSize: 30, fontWeight: '800', color: colors.stone400, marginTop: 20 },
  timeConfirmBtn: { minHeight: 54, borderRadius: borderRadius.lg, backgroundColor: colors.gradientStart, alignItems: 'center', justifyContent: 'center' },
  timeConfirmText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#FFF' },
  formActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  formCancelBtn: { flex: 1, minHeight: 54, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center' },
  formCancelText: { fontWeight: fontWeight.semibold, fontSize: fontSize.lg, color: colors.onSurfaceVariant },
  formSaveBtn: { flex: 1, minHeight: 54, borderRadius: borderRadius.lg, backgroundColor: colors.gradientStart, alignItems: 'center', justifyContent: 'center' },
  formSaveText: { fontWeight: fontWeight.bold, fontSize: fontSize.lg, color: '#FFF' },

  medList: { paddingHorizontal: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontWeight: fontWeight.bold, color: colors.stone500, fontSize: fontSize.lg },
  emptySub: { color: colors.stone400, fontSize: fontSize.md },

  medCard: { backgroundColor: colors.surfaceContainerLowest, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.outlineVariant, padding: spacing.md, marginBottom: spacing.sm },
  medCardDisabled: { opacity: 0.5 },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medTimeBox: { backgroundColor: colors.primaryFixed, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.sm },
  medTime: { fontWeight: fontWeight.bold, color: colors.primaryDark, fontSize: fontSize.md },
  medName: { fontWeight: fontWeight.bold, color: colors.onSurface, fontSize: fontSize.lg },
  medDosage: { fontSize: fontSize.sm, color: colors.stone500, marginTop: 2 },
  medNotes: { fontSize: fontSize.sm, color: colors.stone400, fontStyle: 'italic', marginTop: 2 },
  medActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
  medDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  medDeleteText: { fontSize: fontSize.sm, color: colors.error },
  medStock: { fontSize: fontSize.sm, color: colors.stone500, marginTop: 2 },

  stockBannerWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm, gap: 6 },
  stockBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: borderRadius.sm },
  stockBannerOut: { backgroundColor: '#FEE2E2' },
  stockBannerCritical: { backgroundColor: '#FEE2E2' },
  stockBannerWarning: { backgroundColor: '#FEF3C7' },
  stockBannerText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.onSurface },
});
