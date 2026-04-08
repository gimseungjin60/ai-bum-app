import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import Icon from '../components/Icon';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import Card from '../components/Card';
import HapticButton from '../components/HapticButton';

const FAMILY_MEMBERS = [
  { name: '이철수 (아들)', role: '관리자 권한', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
  { name: '이영희 (손녀)', role: '편집 권한', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
];

export default function SettingsScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
        {/* Profile Bento */}
        <View style={styles.profileRow}>
          <Card style={styles.profileCard}>
            <View style={styles.profileInner}>
              <View style={styles.avatarWrap}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=200',
                  }}
                  style={styles.avatar}
                />
                <View style={styles.editBadge}>
                  <Icon name="Edit3" size={10} color={colors.white} />
                </View>
              </View>
              <View>
                <Text style={styles.profileName}>김순자 어르신</Text>
                <Text style={styles.profileSub}>
                  사랑하는 가족들과 연결됨
                </Text>
              </View>
            </View>
          </Card>
          <Card style={styles.securityCard}>
            <Text style={styles.securityLabel}>보안 상태</Text>
            <Icon name="ShieldCheck" size={28} color={colors.onSurface} />
            <Text style={styles.securityValue}>최상</Text>
          </Card>
        </View>

        {/* 가족 그룹 관리 */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>가족 그룹 관리</Text>
            <Text style={styles.sectionSub}>
              함께 앨범을 관리하는 소중한 사람들
            </Text>
          </View>
          <HapticButton>
            <View style={styles.inviteBtn}>
              <Icon name="UserPlus" size={14} color={colors.primaryDark} />
              <Text style={styles.inviteBtnText}>초대하기</Text>
            </View>
          </HapticButton>
        </View>
        {FAMILY_MEMBERS.map((member) => (
          <HapticButton key={member.name} style={styles.memberCard}>
            <View style={styles.memberRow}>
              <Image
                source={{ uri: member.avatar }}
                style={styles.memberAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberRole}>{member.role}</Text>
              </View>
              <Icon name="ChevronRight" size={20} color={colors.onSurfaceVariant} />
            </View>
          </HapticButton>
        ))}

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
                    거실 설치됨 · 현재 온라인
                  </Text>
                </View>
                <View style={styles.connectedBadge}>
                  <Text style={styles.connectedText}>연결됨</Text>
                </View>
              </View>
              <View style={styles.deviceActions}>
                <HapticButton style={styles.deviceBtn}>
                  <Icon name="Monitor" size={14} color={colors.onSurface} />
                  <Text style={styles.deviceBtnText}>화면 설정</Text>
                </HapticButton>
                <HapticButton style={styles.deviceBtn}>
                  <Icon name="Sun" size={14} color={colors.onSurface} />
                  <Text style={styles.deviceBtnText}>밝기 조절</Text>
                </HapticButton>
              </View>
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
          <HapticButton style={styles.logoutBtn}>
            <Icon name="LogOut" size={16} color={colors.stone400} />
            <Text style={styles.logoutText}>로그아웃</Text>
          </HapticButton>
          <HapticButton style={styles.deleteBtn}>
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
    marginBottom: spacing.xl,
  },
  profileCard: { flex: 2 },
  profileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.lg,
  },
  editBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: colors.primaryDark,
    padding: 6,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  profileName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.onSurface,
  },
  profileSub: {
    fontSize: fontSize.md,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  securityCard: {
    flex: 1,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  securityLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.onSecondaryContainer,
  },
  securityValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.onSecondaryContainer,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.onSurface,
  },
  sectionSub: {
    fontSize: fontSize.md,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inviteBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  memberCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 9999,
  },
  memberName: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  memberRole: {
    fontSize: fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  deviceCard: {
    marginTop: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(224,191,189,0.13)',
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  deviceIconWrap: {
    backgroundColor: colors.tertiaryFixed,
    padding: 12,
    borderRadius: borderRadius.lg,
  },
  deviceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deviceName: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  deviceSub: {
    fontSize: fontSize.md,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  connectedBadge: {
    backgroundColor: colors.emerald100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  connectedText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.emerald700,
  },
  deviceActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },
  deviceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerHigh,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
  },
  deviceBtnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.onSurface,
  },
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
    width: 48,
    height: 48,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTitle: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  privacyDesc: {
    fontSize: fontSize.md,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginTop: 4,
  },
  dangerZone: {
    marginTop: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.stone400,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deleteText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: '#BA1A1A99',
  },
});
