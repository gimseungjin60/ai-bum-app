import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import HapticButton from '../components/HapticButton';
import Icon from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert('입력 오류', '모든 항목을 입력해주세요.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 4) {
      Alert.alert('입력 오류', '비밀번호는 4자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const result = await signup(email.trim(), password, name.trim());
      if (!result.success) {
        Alert.alert('가입 실패', result.message || '회원가입에 실패했습니다.');
      }
    } catch (e) {
      Alert.alert('연결 오류', '서버에 연결할 수 없습니다.\n네트워크 상태를 확인해주세요.');
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
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="ChevronRight" size={24} color={colors.onSurface} />
          </HapticButton>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title}>보호자 계정 만들기</Text>
          <Text style={styles.subtitle}>
            계정을 만들고 시니어 디바이스와{'\n'}연결해보세요
          </Text>
        </View>

        {/* 입력 폼 */}
        <View style={styles.form}>
          <Text style={styles.label}>이름</Text>
          <View style={styles.inputWrapper}>
            <Icon name="Edit3" size={20} color={colors.stone400} />
            <TextInput
              style={styles.input}
              placeholder="보호자 이름"
              placeholderTextColor={colors.stone400}
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          </View>

          <Text style={styles.label}>이메일</Text>
          <View style={styles.inputWrapper}>
            <Icon name="Users" size={20} color={colors.stone400} />
            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor={colors.stone400}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <Text style={styles.label}>비밀번호</Text>
          <View style={styles.inputWrapper}>
            <Icon name="Lock" size={20} color={colors.stone400} />
            <TextInput
              style={styles.input}
              placeholder="4자 이상"
              placeholderTextColor={colors.stone400}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <Text style={styles.label}>비밀번호 확인</Text>
          <View style={styles.inputWrapper}>
            <Icon name="Lock" size={20} color={colors.stone400} />
            <TextInput
              style={styles.input}
              placeholder="비밀번호를 다시 입력"
              placeholderTextColor={colors.stone400}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>

          <HapticButton
            style={[styles.signupBtn, loading && styles.signupBtnDisabled]}
            onPress={handleSignup}
            hapticType="medium"
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signupBtnText}>가입하기</Text>
            )}
          </HapticButton>
        </View>

        {/* 로그인 링크 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>이미 계정이 있으신가요?</Text>
          <HapticButton onPress={() => navigation.goBack()}>
            <Text style={styles.loginLink}>로그인</Text>
          </HapticButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scaleX: -1 }],
  },
  titleSection: {
    marginBottom: spacing.xl,
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
    lineHeight: 22,
  },
  form: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.onSurface,
    marginTop: spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: spacing.md,
    height: 52,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.onSurface,
  },
  signupBtn: {
    backgroundColor: colors.gradientStart,
    borderRadius: borderRadius.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  signupBtnDisabled: {
    opacity: 0.6,
  },
  signupBtnText: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  footerText: {
    fontSize: fontSize.md,
    color: colors.stone500,
  },
  loginLink: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.gradientStart,
  },
});
