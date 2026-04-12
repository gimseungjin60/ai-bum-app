import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import HapticButton from '../components/HapticButton';
import Icon from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const CODE_LENGTH = 6;

export default function PairingScreen() {
  const { user, savePairing, logout } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  const handleVerifyRef = useRef(null);
  handleVerifyRef.current = handleVerify;

  function handleChangeText(text, index) {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < CODE_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

    // 마지막 자리 입력 시 키보드 닫고 자동 제출
    if (digit && index === CODE_LENGTH - 1) {
      const fullCode = newCode.join('');
      if (fullCode.length === CODE_LENGTH) {
        Keyboard.dismiss();
        setTimeout(() => handleVerifyRef.current?.(), 300);
      }
    }
  }

  function handleKeyPress(e, index) {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  }

  async function handleVerify() {
    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH) {
      Alert.alert('입력 오류', '6자리 코드를 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.verifyPairingCode(
        fullCode,
        user.user_id,
        user.name,
        ''
      );
      if (result.success) {
        await savePairing({
          familyId: result.family_id,
          deviceId: result.device_id,
        });
      } else {
        Alert.alert('페어링 실패', result.message || '코드를 확인해주세요.');
      }
    } catch (e) {
      Alert.alert('연결 오류', '서버에 연결할 수 없거나 잘못된 코드입니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
      >
        {/* 아이콘 */}
        <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <Icon name="Tablet" size={48} color={colors.gradientStart} />
          </View>
          <View style={styles.connectLine} />
          <View style={styles.iconCircleSmall}>
            <Icon name="Phone" size={28} color={colors.primary} />
          </View>
        </View>

        {/* 안내 텍스트 */}
        <Text style={styles.title}>디바이스 연결</Text>
        <Text style={styles.subtitle}>
          시니어 디바이스 화면에 표시된{'\n'}6자리 코드를 입력해주세요
        </Text>

        {/* 코드 입력 */}
        <View style={styles.codeRow}>
          {code.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => (inputs.current[i] = ref)}
              style={[
                styles.codeInput,
                digit ? styles.codeInputFilled : null,
              ]}
              value={digit}
              onChangeText={(text) => handleChangeText(text, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* 안내 */}
        <View style={styles.helpRow}>
          <Icon name="AlertTriangle" size={16} color={colors.stone500} />
          <Text style={styles.helpText}>
            코드는 5분간 유효합니다. 시니어 디바이스에서 새 코드를 생성할 수 있습니다.
          </Text>
        </View>

        {/* 연결 버튼 */}
        <HapticButton
          style={[styles.verifyBtn, loading && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          hapticType="medium"
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.verifyBtnText}>연결하기</Text>
          )}
        </HapticButton>

        {/* 로그아웃 */}
        <HapticButton onPress={logout} style={styles.logoutBtn}>
          <Icon name="LogOut" size={18} color={colors.stone500} />
          <Text style={styles.logoutText}>다른 계정으로 로그인</Text>
        </HapticButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 40,
  },
  iconSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectLine: {
    width: 40,
    height: 3,
    backgroundColor: colors.outlineVariant,
    borderRadius: 2,
  },
  iconCircleSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.stone500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  codeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  codeInput: {
    width: 48,
    height: 60,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
  },
  codeInputFilled: {
    borderColor: colors.gradientStart,
    backgroundColor: '#FFF7ED',
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xl,
  },
  helpText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.stone500,
    lineHeight: 18,
  },
  verifyBtn: {
    backgroundColor: colors.gradientStart,
    borderRadius: borderRadius.md,
    height: 56,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnDisabled: {
    opacity: 0.6,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
  },
  logoutText: {
    fontSize: fontSize.md,
    color: colors.stone500,
  },
});
