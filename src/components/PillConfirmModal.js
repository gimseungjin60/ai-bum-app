import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Icon from './Icon';
import { colors, spacing, borderRadius, fontSize } from '../theme';

export default function PillConfirmModal({ visible, time, onClose }) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 60,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // 5초 후 자동으로 닫기
      const timer = setTimeout(() => {
        onClose?.();
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* 아이콘 */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconEmoji}>💊</Text>
          </View>

          {/* 타이틀 */}
          <Text style={styles.title}>복약 완료!</Text>
          <Text style={styles.subtitle}>
            어르신이 {time || '방금'} 약을 드셨습니다.{'\n'}보호자님도 안심하세요 😊
          </Text>

          {/* 확인 버튼 */}
          <TouchableOpacity style={styles.button} onPress={onClose} activeOpacity={0.85}>
            <Icon name="Check" size={16} color={colors.white} />
            <Text style={styles.buttonText}>확인</Text>
          </TouchableOpacity>

          {/* 자동 닫힘 안내 */}
          <Text style={styles.autoClose}>5초 후 자동으로 닫힙니다</Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconEmoji: {
    fontSize: 38,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: borderRadius.full,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginBottom: spacing.md,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  autoClose: {
    fontSize: fontSize.xs,
    color: colors.stone400,
  },
});
