import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Animated,
  Alert,
  Share,
} from 'react-native';
import Icon from '../components/Icon';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import Card from '../components/Card';
import HapticButton from '../components/HapticButton';
import { useAuth } from '../contexts/AuthContext';
import { useSenior } from '../contexts/SeniorContext';

export default function SettingsScreen({ navigation }) {
  const { user, pairedDevice, logout } = useAuth();
  const { wsConnected, seniorStatus } = useSenior();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 500, useNativeDriver: true,
    }).start();
  }, []);

  function handleLogout() {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: logout },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      '계정 탈퇴',
      '모든 데이터가 삭제됩니다. 정말 탈퇴하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: () => {
            Alert.alert('안내', '계정 탈퇴 기능은 아직 준비 중입니다.');
          },
        },
      ]
    );
  }

  async function handleInvite() {
    try {
      await Share.share({
        message:
          'AI-bum 보호자 앱에 가입하고 어르신 디바이스와 연결하세요!\n' +
          '함께 어르신의 안부를 확인해요.',
      });
    } catch {}
  }

  const isDeviceOnline = wsConnected;
  const deviceId = pairedDevice?.deviceId || '연결 안됨';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Profile */}
        <View style={styles.profileRow}>
          <Card style={styles.profileCard}>
            <View style={styles.profileInner}>
              <View style={styles.avatarWrap}>
                <View style={styles.avatar}>
                  <Text style={{ fontSize: 32 }}>👤</Text>
                </View>
              </View>
              <View>
                <Text style={styles.profileName}>{user?.name || '보호자'}</Text>
                <Text style={styles.profileSub}>{user?.email || ''}</Text>
              </View>
            </View>
          </Card>
          <Card style={styles.securityCard}>
            <Text style={styles.securityLabel}>연결 상태</Text>
            <Icon
              name={isDeviceOnline ? 'ShieldCheck' : 'AlertTriangle'}
              size={28}
              color={colors.onSurface}
            />
            <Text style={styles.securityValue}>
              {isDeviceOnline ? '정상' : '오프라인'}
            </Text>
          </Card>
        </View>

        {/* 복약 관리 바로가기 */}
        <HapticButton
          onPress={() => navigation.navigate('Medication')}
          style={styles.medicationCard}
        >
          <View style={styles.medicationIcon}>
            <Icon name="Heart" size={22} color={colors.gradientStart} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.medicationTitle}>복약 관리</Text>
            <Text style={styles.medicationSub}>약 스케줄 추가/수정/삭제</Text>
          </View>
          <Icon name="ChevronRight" size={20} color={colors.stone400} />
        </HapticButton>

        {/* 가족 그룹 관리 */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>가족 그룹 관리</Text>
            <Text style={styles.sectionSub}>
              함께 앨범을 관리하는 소중한 사람들
            </Text>
          </View>
          <HapticButton onPress={handleInvite}>
            <View style={styles.inviteBtn}>
              <Icon name="UserPlus" size={14} color={colors.primaryDark} />
              <Text style={styles.inviteBtnText}>초대하기</Text>
            </View>
          </HapticButton>
        </View>

        {/* 현재 사용자 표시 */}
        <View style={styles.memberCard}>
          <View style={styles.memberRow}>
            <View style={styles.memberAvatarPlaceholder}>
              <Text style={{ fontSize: 18 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{user?.name || '보호자'} (나)</Text>
              <Text style={styles.memberRole}>관리자 권한</Text>
            </View>
          </View>
        </View>

        {/* 기기 관리 */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
          기기 관리
        </Text>
        <Card style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <View style={styles.deviceIconWrap}>
              <Icon name="Tablet" size={22} color={colors.onSurface} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.deviceTitleRow}>
                <View>
                  <Text style={styles.deviceName}>AI-bum 스마트 프레임</Text>
                  <Text style={styles.deviceSub}>
                    {deviceId}
                  </Text>
                </View>
                <View style={[
                  styles.connectedBadge,
                  !isDeviceOnline && { backgroundColor: '#FEE2E2' },
                ]}>
                  <Text style={[
                    styles.connectedText,
                    !isDeviceOnline && { color: colors.error },
                  ]}>
                    {isDeviceOnline ? '연결됨' : '오프라인'}
                  </Text>
                </View>
              </View>
              {isDeviceOnline && (
                <Text style={styles.deviceStatus}>
                  현재 상태: {seniorStatus === 'active' ? '활동 중' : seniorStatus === 'greeting' ? '인사 중' : '대기'}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Privacy Notice */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyIcon}>
            <Icon name="Lock" size={22} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.privacyTitle}>개인정보 보호 약속</Text>
            <Text style={styles.privacyDesc}>
              얼굴 데이터는 서버에 저장되지 않습니다. 모든 분석은 기기
              내에서 안전하게 처리됩니다.
            </Text>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerZone}>
          <HapticButton style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="LogOut" size={16} color={colors.stone400} />
            <Text style={styles.logoutText}>로그아웃</Text>
          </HapticButton>
          <HapticButton style={styles.deleteBtn} onPress={handleDeleteAccount}>
            <Icon name="Trash2" size={14} color={'#BA1A1A99'} />
            <Text style={styles.deleteText}>계정 탈퇴 및 데이터 삭제</Text>
          </HapticButton>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: 100 },
  profileRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  profileCard: { flex: 2 },
  profileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 72, height: 72, borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  profileName: {
    fontSize: fontSize.xl, fontWeight: '700', color: colors.onSurface,
  },
  profileSub: {
    fontSize: fontSize.md, color: colors.onSurfaceVariant, marginTop: 4,
  },
  securityCard: {
    flex: 1,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  securityLabel: {
    fontSize: fontSize.xs, fontWeight: '700', color: colors.onSecondaryContainer,
  },
  securityValue: {
    fontSize: fontSize.lg, fontWeight: '600', color: colors.onSecondaryContainer,
  },

  medicationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primaryFixed,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  medicationIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  medicationTitle: { fontWeight: '700', color: colors.onSurface, fontSize: fontSize.md },
  medicationSub: { fontSize: fontSize.sm, color: colors.stone500, marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.onSurface },
  sectionSub: { fontSize: fontSize.md, color: colors.onSurfaceVariant, marginTop: 2 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inviteBtnText: { fontSize: fontSize.md, fontWeight: '700', color: colors.primaryDark },

  memberCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberAvatarPlaceholder: {
    width: 48, height: 48, borderRadius: 9999,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  memberName: { fontWeight: '700', color: colors.onSurface },
  memberRole: { fontSize: fontSize.xs, color: colors.onSurfaceVariant, marginTop: 2 },

  deviceCard: {
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(224,191,189,0.13)',
  },
  deviceHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  deviceIconWrap: { backgroundColor: colors.tertiaryFixed, padding: 12, borderRadius: borderRadius.lg },
  deviceTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  deviceName: { fontWeight: '700', color: colors.onSurface },
  deviceSub: { fontSize: fontSize.md, color: colors.onSurfaceVariant, marginTop: 2 },
  deviceStatus: { fontSize: fontSize.sm, color: colors.stone500, marginTop: 6 },
  connectedBadge: {
    backgroundColor: colors.emerald100,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999,
  },
  connectedText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.emerald700 },

  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceDim,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  privacyIcon: {
    width: 48, height: 48, borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  privacyTitle: { fontWeight: '700', color: colors.onSurface },
  privacyDesc: { fontSize: fontSize.md, color: colors.onSurfaceVariant, lineHeight: 20, marginTop: 4 },

  dangerZone: { marginTop: spacing.xl, gap: spacing.md, alignItems: 'center' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoutText: { fontSize: fontSize.md, fontWeight: '500', color: colors.stone400 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deleteText: { fontSize: fontSize.xs, fontWeight: '500', color: '#BA1A1A99' },
});
