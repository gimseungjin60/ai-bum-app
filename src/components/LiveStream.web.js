// 웹 전용 LiveStream 스텁.
// @livekit/react-native는 네이티브 WebRTC 모듈에 의존해 웹에서 로드 시 깨진다
// (requireNativeComponent 미존재). 보호자 웹앱에서는 실시간 카메라 대신
// 플레이스홀더를 띄운다. 페어링·대시보드 등 나머지 기능은 정상 동작.
// 네이티브 실기기에서는 Metro가 LiveStream.js(실제 구현)를 선택한다.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import HapticButton from './HapticButton';
import { colors, borderRadius, fontSize, spacing } from '../theme';

export default function LiveStream({ onClose }) {
  return (
    <View style={styles.liveStreamWrap}>
      <View style={styles.liveStreamPlaceholder}>
        <Icon name="Video" size={28} color="rgba(255,255,255,0.5)" />
        <Text style={styles.livePlaceholderText}>
          실시간 카메라는 모바일 앱에서만 지원됩니다
        </Text>
      </View>
      <HapticButton onPress={onClose} style={styles.liveCloseBtn}>
        <Icon name="X" size={14} color="#fff" />
      </HapticButton>
    </View>
  );
}

const styles = StyleSheet.create({
  liveStreamWrap: {
    position: 'relative',
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  liveStreamPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  livePlaceholderText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  liveCloseBtn: {
    position: 'absolute', bottom: 10, right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
});
