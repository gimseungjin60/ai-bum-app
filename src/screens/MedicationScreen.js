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
} from 'react-native';
import Icon from '../components/Icon';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import HapticButton from '../components/HapticButton';
import Card from '../components/Card';
import { api } from '../services/api';
import { useSenior } from '../contexts/SeniorContext';

export default function MedicationScreen({ navigation }) {
  const { isPillTaken } = useSenior();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newDosage, setNewDosage] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    loadMedications();
  }, []);

  const loadMedications = useCallback(async () => {
    try {
      const result = await api.getMedications();
      setMedications(result.medications || []);
    } catch {
      // 조용히 실패
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleAdd() {
    if (!newName.trim()) {
      Alert.alert('입력 오류', '약 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      const result = await api.addMedication({
        name: newName.trim(),
        time: newTime.trim(),
        dosage: newDosage.trim(),
        notes: newNotes.trim(),
      });
      if (result.success) {
        setMedications((prev) => [...prev, result.medication]);
        setNewName('');
        setNewTime('09:00');
        setNewDosage('');
        setNewNotes('');
        setShowAdd(false);
      }
    } catch {
      Alert.alert('오류', '약 추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(med) {
    try {
      await api.updateMedication(med.id, { enabled: !med.enabled });
      setMedications((prev) =>
        prev.map((m) => (m.id === med.id ? { ...m, enabled: !m.enabled } : m))
      );
    } catch {}
  }

  async function handleDelete(med) {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`"${med.name}"을(를) 삭제하시겠습니까?`)
      : await new Promise((resolve) =>
          Alert.alert(
            '삭제 확인',
            `"${med.name}"을(를) 삭제하시겠습니까?`,
            [
              { text: '취소', style: 'cancel', onPress: () => resolve(false) },
              { text: '삭제', style: 'destructive', onPress: () => resolve(true) },
            ],
            { onDismiss: () => resolve(false) }
          )
        );

    if (!confirmed) return;
    try {
      await api.deleteMedication(med.id);
      setMedications((prev) => prev.filter((m) => m.id !== med.id));
    } catch {}
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="ChevronRight" size={24} color={colors.onSurface} />
          </HapticButton>
          <Text style={styles.title}>복약 관리</Text>
          <HapticButton onPress={() => setShowAdd(!showAdd)}>
            <Icon name="Plus" size={24} color={colors.gradientStart} />
          </HapticButton>
        </View>

        {/* 오늘 복약 상태 */}
        <View style={[styles.statusCard, isPillTaken ? styles.statusTaken : styles.statusPending]}>
          <View style={styles.statusIcon}>
            <Icon
              name={isPillTaken ? 'ShieldCheck' : 'AlertTriangle'}
              size={28}
              color={isPillTaken ? colors.emerald700 : '#92400E'}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, isPillTaken ? { color: colors.emerald700 } : { color: '#92400E' }]}>
              {isPillTaken ? '오늘 약 복용 완료' : '아직 약을 복용하지 않았습니다'}
            </Text>
            <Text style={styles.statusSub}>
              {isPillTaken
                ? '어르신이 오늘 약 복용을 확인하셨습니다'
                : '어르신의 약 복용 여부를 확인해주세요'}
            </Text>
          </View>
        </View>

        {/* 약 추가 폼 */}
        {showAdd && (
          <Card style={styles.addForm}>
            <Text style={styles.formTitle}>새 약 추가</Text>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>약 이름</Text>
              <TextInput
                style={styles.formInput}
                placeholder="예: 혈압약"
                placeholderTextColor={colors.stone400}
                value={newName}
                onChangeText={setNewName}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>복용 시간</Text>
              <TextInput
                style={styles.formInput}
                placeholder="09:00"
                placeholderTextColor={colors.stone400}
                value={newTime}
                onChangeText={setNewTime}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>용량</Text>
              <TextInput
                style={styles.formInput}
                placeholder="예: 1정"
                placeholderTextColor={colors.stone400}
                value={newDosage}
                onChangeText={setNewDosage}
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>메모</Text>
              <TextInput
                style={styles.formInput}
                placeholder="예: 식후 30분"
                placeholderTextColor={colors.stone400}
                value={newNotes}
                onChangeText={setNewNotes}
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

        {/* 약 목록 */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
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
                  </View>
                  <Switch
                    value={med.enabled}
                    onValueChange={() => handleToggle(med)}
                    trackColor={{ false: colors.surfaceDim, true: colors.emerald100 }}
                    thumbColor={med.enabled ? colors.emerald700 : colors.stone400}
                  />
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

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  statusTaken: { backgroundColor: colors.emerald100 },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  statusTitle: { fontWeight: fontWeight.bold, fontSize: fontSize.md },
  statusSub: { fontSize: fontSize.sm, color: colors.stone500, marginTop: 2 },

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
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  formCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
  },
  formCancelText: { fontWeight: fontWeight.semibold, color: colors.stone500 },
  formSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.gradientStart,
    alignItems: 'center',
  },
  formSaveText: { fontWeight: fontWeight.bold, color: '#FFF' },

  list: { flex: 1, paddingHorizontal: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontWeight: fontWeight.bold, color: colors.stone500, fontSize: fontSize.lg },
  emptySub: { color: colors.stone400, fontSize: fontSize.md },

  medCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  medCardDisabled: { opacity: 0.5 },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medTimeBox: {
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  medTime: { fontWeight: fontWeight.bold, color: colors.primaryDark, fontSize: fontSize.md },
  medName: { fontWeight: fontWeight.bold, color: colors.onSurface, fontSize: fontSize.lg },
  medDosage: { fontSize: fontSize.sm, color: colors.stone500, marginTop: 2 },
  medNotes: { fontSize: fontSize.sm, color: colors.stone400, fontStyle: 'italic', marginTop: 2 },
  medActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
  medDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  medDeleteText: { fontSize: fontSize.sm, color: colors.error },
});
