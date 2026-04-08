import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from '../components/Icon';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius, fontSize } from '../theme';
import HapticButton from '../components/HapticButton';

const { width } = Dimensions.get('window');

export default function EmergencyModal({ visible, onClose }) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulse animation for the icon
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close Button */}
          <HapticButton onPress={onClose} style={styles.closeBtn}>
            <Icon name="X" size={20} color={colors.onSurfaceVariant} />
          </HapticButton>

          <View style={styles.content}>
            {/* Siren Icon */}
            <Animated.View
              style={[
                styles.iconContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <View style={styles.iconRing1} />
              <View style={styles.iconRing2} />
              <View style={styles.iconCenter}>
                <Icon name="AlertTriangle" size={48} color={colors.primaryDark} />
              </View>
            </Animated.View>

            <Text style={styles.title}>긴급 상황 발생</Text>

            <View style={styles.messageBox}>
              <Text style={styles.messageText}>
                어르신의 얼굴이 24시간 동안 감지되지 않았습니다.
                신속한 확인이 필요합니다.
              </Text>
            </View>

            {/* Action Buttons */}
            <HapticButton hapticType="heavy" onPress={onClose}>
              <View style={[styles.callBtn, { backgroundColor: colors.primaryDark }]}>
                <Icon name="Phone" size={20} color={colors.white} />
                <Text style={styles.callBtnText}>전화하기</Text>
              </View>
            </HapticButton>

            <HapticButton hapticType="medium" onPress={onClose} style={styles.familyBtn}>
              <Icon name="Users" size={20} color={colors.onSurface} />
              <Text style={styles.familyBtnText}>가족에게 알리기</Text>
            </HapticButton>

            <Text style={styles.footer}>
              알림 발송 시 지정된 보호자들에게도 동시 전달됩니다.
            </Text>
          </View>

          {/* Bottom Accent */}
          <View style={[styles.accentBar, { backgroundColor: colors.primaryDark }]} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,27,23,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: width - 48,
    maxWidth: 400,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.2,
    shadowRadius: 48,
    elevation: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  content: {
    padding: 32,
    paddingTop: 48,
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconRing1: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(174,47,52,0.08)',
  },
  iconRing2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(174,47,52,0.15)',
  },
  iconCenter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: spacing.md,
  },
  messageBox: {
    backgroundColor: 'rgba(238,231,223,0.5)',
    padding: 20,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
  },
  messageText: {
    fontSize: fontSize.lg,
    color: colors.onSurface,
    lineHeight: 24,
    textAlign: 'center',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    height: 56,
    borderRadius: 9999,
    marginBottom: spacing.sm,
  },
  callBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSize.xl,
  },
  familyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
    height: 56,
    borderRadius: 9999,
    backgroundColor: colors.secondaryFixedDim,
  },
  familyBtnText: {
    fontWeight: '700',
    fontSize: fontSize.xl,
    color: colors.onSurface,
  },
  footer: {
    marginTop: spacing.lg,
    fontSize: fontSize.md,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    textAlign: 'center',
  },
  accentBar: {
    height: 8,
    width: '100%',
  },
});
