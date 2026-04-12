import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Icon from '../components/Icon';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../theme';
import HapticButton from '../components/HapticButton';
import { api, BASE_URL } from '../services/api';

export default function VoiceMessageScreen({ navigation }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const soundRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    loadMessages();
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [isRecording]);

  async function loadMessages() {
    try {
      const result = await api.request('/api/voice-messages');
      setMessages(result.messages || []);
    } catch {
      // 로드 실패 시 빈 목록
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('권한 필요', '음성 녹음을 위해 마이크 권한이 필요합니다.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
    } catch (e) {
      Alert.alert('오류', '녹음을 시작할 수 없습니다.');
    }
  }

  async function stopAndSend() {
    if (!recording) return;

    setIsRecording(false);
    setSending(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      // FormData로 전송
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: 'voice_message.m4a',
        type: 'audio/m4a',
      });
      formData.append('sender', '보호자');

      const response = await fetch(`${BASE_URL}/api/voice-messages/send`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert('전송 완료', '음성 메시지가 어르신에게 전달되었습니다.');
        loadMessages();
      } else {
        Alert.alert('전송 실패', '다시 시도해주세요.');
      }
    } catch {
      Alert.alert('전송 오류', '서버에 연결할 수 없습니다.');
    } finally {
      setSending(false);
    }
  }

  async function cancelRecording() {
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
    } catch {}
    setRecording(null);
    setIsRecording(false);
  }

  async function playMessage(msg) {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      if (playingId === msg.message_id) {
        setPlayingId(null);
        return;
      }

      const audioUrl = `${BASE_URL}/api/voice-messages/${msg.message_id}/audio`;
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
      soundRef.current = sound;
      setPlayingId(msg.message_id);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setPlayingId(null);
        }
      });

      await sound.playAsync();
    } catch {
      Alert.alert('재생 오류', '음성 메시지를 재생할 수 없습니다.');
      setPlayingId(null);
    }
  }

  function formatTime(isoString) {
    const d = new Date(isoString);
    const now = new Date();
    const diffMin = Math.floor((now - d) / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}시간 전`;
    return `${Math.floor(diffMin / 1440)}일 전`;
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <HapticButton onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="ChevronRight" size={24} color={colors.onSurface} />
          </HapticButton>
          <Text style={styles.title}>음성 메시지</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* 녹음 영역 */}
        <View style={styles.recordSection}>
          {isRecording ? (
            <View style={styles.recordingRow}>
              <Animated.View style={[styles.recordDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.recordingText}>녹음 중...</Text>
            </View>
          ) : (
            <Text style={styles.recordHint}>
              버튼을 눌러 음성 메시지를 녹음하세요
            </Text>
          )}

          <View style={styles.recordBtnRow}>
            {isRecording ? (
              <>
                <HapticButton onPress={cancelRecording} style={styles.cancelBtn}>
                  <Icon name="X" size={24} color={colors.error} />
                </HapticButton>
                <HapticButton
                  onPress={stopAndSend}
                  hapticType="medium"
                  style={styles.sendBtn}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Icon name="Share2" size={28} color="#FFF" />
                  )}
                </HapticButton>
              </>
            ) : (
              <HapticButton
                onPress={startRecording}
                hapticType="medium"
                style={styles.micBtn}
              >
                <Icon name="MessageCircle" size={32} color="#FFF" />
              </HapticButton>
            )}
          </View>
        </View>

        {/* 메시지 목록 */}
        <Text style={styles.listTitle}>메시지 기록</Text>
        {loading ? (
          <ActivityIndicator color={colors.gradientStart} style={{ marginTop: 20 }} />
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {messages.length === 0 ? (
              <View style={styles.empty}>
                <Icon name="MessageCircle" size={32} color={colors.stone400} />
                <Text style={styles.emptyText}>아직 음성 메시지가 없습니다</Text>
              </View>
            ) : (
              messages.map((msg) => (
                <HapticButton
                  key={msg.message_id}
                  onPress={() => playMessage(msg)}
                  style={[
                    styles.msgCard,
                    msg.direction === 'to_senior' && styles.msgCardSent,
                  ]}
                >
                  <View style={styles.msgRow}>
                    <View style={[
                      styles.msgIcon,
                      msg.direction === 'to_senior'
                        ? { backgroundColor: colors.primaryFixed }
                        : { backgroundColor: colors.emerald100 },
                    ]}>
                      <Icon
                        name={playingId === msg.message_id ? 'Activity' : 'MessageCircle'}
                        size={18}
                        color={msg.direction === 'to_senior' ? colors.primaryDark : colors.emerald700}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.msgSender}>
                        {msg.direction === 'to_senior' ? '보내는 메시지' : '어르신 답장'}
                      </Text>
                      <Text style={styles.msgTime}>{formatTime(msg.created_at)}</Text>
                    </View>
                    <Icon
                      name={playingId === msg.message_id ? 'Activity' : 'ChevronRight'}
                      size={20}
                      color={colors.stone400}
                    />
                  </View>
                </HapticButton>
              ))
            )}
          </ScrollView>
        )}
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scaleX: -1 }],
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
  },
  recordSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  recordHint: {
    fontSize: fontSize.md,
    color: colors.stone500,
    textAlign: 'center',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.error,
  },
  recordingText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  recordBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  micBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.gradientStart,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gradientStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sendBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.green500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.onSurface,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: colors.stone400,
    fontWeight: '500',
  },
  msgCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  msgCardSent: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  msgIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgSender: {
    fontWeight: fontWeight.semibold,
    color: colors.onSurface,
    fontSize: fontSize.md,
  },
  msgTime: {
    fontSize: fontSize.sm,
    color: colors.stone400,
    marginTop: 2,
  },
});
