import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from '../components/Icon';
import HapticButton from '../components/HapticButton';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const CODE_LENGTH = 6;

export default function SeniorManagerScreen({ navigation }) {
  const { user, pairings, activeSeniorId, setActiveSenior, addPairing, removePairing } =
    useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [adding, setAdding] = useState(false);
  const inputs = useRef([]);

  function handleChangeText(text, index) {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);
    if (digit && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }
    if (digit && index === CODE_LENGTH - 1) {
      const full = next.join('');
      if (full.length === CODE_LENGTH) {
        Keyboard.dismiss();
        setTimeout(() => handleAddPairing(full), 250);
      }
    }
  }

  function handleKeyPress(e, index) {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const next = [...code];
      next[index - 1] = '';
      setCode(next);
    }
  }

  function resetCode() {
    setCode(['', '', '', '', '', '']);
  }

  async function handleAddPairing(fullCode) {
    const codeStr = fullCode || code.join('');
    if (codeStr.length !== CODE_LENGTH) {
      Alert.alert('입력 오류', '6자리 코드를 모두 입력해주세요.');
      return;
    }
    setAdding(true);
    try {
      const result = await api.verifyPairingCode(codeStr, user.user_id, user.name, '');
      if (result.success) {
        // 같은 디바이스면 활성만 갱신, 새 디바이스면 추가
        await addPairing({
          deviceId: result.device_id,
          familyId: result.family_id,
          seniorName: '',
          pairedAt: Date.now(),
        });
        await setActiveSenior(result.device_id);
        setAddOpen(false);
        resetCode();
        Alert.alert('연결 완료', '시니어 디바이스가 추가되었습니다.');
      } else {
        Alert.alert('페어링 실패', result.message || '코드를 확인해주세요.');
      }
    } catch {
      Alert.alert('연결 오류', '서버에 연결할 수 없거나 잘못된 코드입니다.');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(deviceId) {
    const target = pairings.find((p) => p.deviceId === deviceId);
    const label = target?.seniorName || target?.deviceId || '시니어';
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`"${label}"의 연결을 해제하시겠습니까?`)
      : await new Promise((resolve) =>
          Alert.alert(
            '연결 해제',
            `"${label}"의 연결을 해제하시겠습니까?`,
            [
              { text: '취소', style: 'cancel', onPress: () => resolve(false) },
              { text: '해제', style: 'destructive', onPress: () => resolve(true) },
            ],
            { onDismiss: () => resolve(false) }
          )
        );
    if (!confirmed) return;
    await removePairing(deviceId);
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="ChevronRight" size={24} color={colors.onSurface} />
        </HapticButton>
        <Text style={styles.title}>시니어 관리</Text>
        <HapticButton onPress={() => setAddOpen(true)}>
          <Icon name="Plus" size={24} color={colors.gradientStart} />
        </HapticButton>
      </View>

      {/* 안내 */}
      <View style={styles.helpRow}>
        <Icon name="AlertTriangle" size={16} color={colors.stone500} />
        <Text style={styles.helpText}>
          한 보호자가 여러 시니어 디바이스와 연결할 수 있습니다. 활성 시니어를
          선택하면 모든 화면이 해당 시니어의 데이터를 표시합니다.
        </Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {pairings.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="Tablet" size={48} color={colors.stone400} />
            <Text style={styles.emptyTitle}>연결된 시니어가 없습니다</Text>
            <Text style={styles.emptySub}>
              우측 상단 + 버튼으로 시니어 디바이스를 추가해주세요
            </Text>
          </View>
        ) : (
          pairings.map((p) => {
            const isActive = p.deviceId === activeSeniorId;
            return (
              <HapticButton
                key={p.deviceId}
                onPress={() => setActiveSenior(p.deviceId)}
                style={[styles.itemCard, isActive && styles.itemCardActive]}
              >
                <View style={[styles.itemRadio, isActive && styles.itemRadioActive]}>
                  {isActive && <View style={styles.itemRadioDot} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {p.seniorName || '시니어'}
                    {isActive && <Text style={styles.activeBadge}>  · 활성</Text>}
                  </Text>
                  <Text style={styles.itemSub}>{p.deviceId}</Text>
                </View>
                <HapticButton onPress={() => handleRemove(p.deviceId)} style={styles.removeBtn}>
                  <Icon name="Trash2" size={16} color={colors.error} />
                </HapticButton>
              </HapticButton>
            );
          })
        )}
      </ScrollView>

      {/* 추가 모달 */}
      <Modal
        visible={addOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setAddOpen(false);
          resetCode();
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>시니어 디바이스 추가</Text>
            <Text style={styles.modalSub}>
              시니어 디바이스 화면의{'\n'}6자리 페어링 코드를 입력해주세요
            </Text>

            <View style={styles.codeRow}>
              {code.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => (inputs.current[i] = ref)}
                  style={[styles.codeInput, d && styles.codeInputFilled]}
                  value={d}
                  onChangeText={(t) => handleChangeText(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  autoFocus={i === 0}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <HapticButton
                style={styles.modalCancelBtn}
                onPress={() => {
                  setAddOpen(false);
                  resetCode();
                }}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </HapticButton>
              <HapticButton
                style={[styles.modalConfirmBtn, adding && { opacity: 0.6 }]}
                onPress={() => handleAddPairing()}
                hapticType="medium"
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>연결</Text>
                )}
              </HapticButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
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

  helpRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  helpText: { flex: 1, fontSize: fontSize.sm, color: colors.stone500, lineHeight: 18 },

  list: { flex: 1, paddingHorizontal: spacing.lg },

  empty: { alignItems: 'center', paddingVertical: 80, gap: 8 },
  emptyTitle: { fontWeight: fontWeight.bold, color: colors.stone500, fontSize: fontSize.lg },
  emptySub: { color: colors.stone400, fontSize: fontSize.sm, textAlign: 'center', paddingHorizontal: spacing.xl },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.sm,
  },
  itemCardActive: {
    borderColor: colors.gradientStart,
    backgroundColor: '#FFF7ED',
  },
  itemRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.stone400,
    alignItems: 'center', justifyContent: 'center',
  },
  itemRadioActive: { borderColor: colors.gradientStart },
  itemRadioDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.gradientStart,
  },
  itemTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.onSurface },
  activeBadge: { color: colors.gradientStart, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  itemSub: { fontSize: fontSize.sm, color: colors.stone500, marginTop: 2 },
  removeBtn: { padding: 8 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 32,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.outlineVariant,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  modalSub: {
    fontSize: fontSize.sm,
    color: colors.stone500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  codeInput: {
    width: 44, height: 56,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
  },
  codeInputFilled: {
    borderColor: colors.gradientStart,
    backgroundColor: '#FFF7ED',
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceContainer, alignItems: 'center',
  },
  modalCancelText: { fontWeight: fontWeight.semibold, color: colors.stone500 },
  modalConfirmBtn: {
    flex: 1, paddingVertical: 14, borderRadius: borderRadius.sm,
    backgroundColor: colors.gradientStart, alignItems: 'center',
  },
  modalConfirmText: { fontWeight: fontWeight.bold, color: '#fff' },
});
