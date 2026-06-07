// 네이티브(iOS/Android) 전용 LiveStream — LiveKit 실시간 카메라 뷰.
// 웹에서는 Metro가 자동으로 LiveStream.web.js(스텁)를 선택한다.
// (@livekit/react-native는 react-native-webrtc 네이티브 모듈에 의존 → 웹 미지원)
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from './Icon';
import HapticButton from './HapticButton';
import { colors, borderRadius, fontSize } from '../theme';
import { auth, db, functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  LiveKitRoom,
  VideoTrack,
  useTracks,
  registerGlobals,
} from '@livekit/react-native';
import { Track, Room } from 'livekit-client';

registerGlobals();

function SeniorVideoView() {
  const tracks = useTracks([Track.Source.Camera]);
  const seniorTrack = tracks.find((t) => t.participant?.identity === 'senior');
  if (!seniorTrack) {
    return (
      <View style={styles.liveStreamPlaceholder}>
        <Text style={styles.livePlaceholderText}>영상 대기 중...</Text>
      </View>
    );
  }
  return <VideoTrack trackRef={seniorTrack} style={styles.liveStream} />;
}

export default function LiveStream({ deviceId, onClose }) {
  const [token, setToken] = useState(null);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);
  // Room 인스턴스를 직접 만들어 lifecycle 제어. unmount 시 보장된 disconnect.
  const [room] = useState(() => new Room());

  useEffect(() => {
    let mounted = true;
    const deviceRef = doc(db, 'devices', deviceId);

    (async () => {
      try {
        if (!auth.currentUser) throw new Error('로그인 필요');
        // 시니어 publisher 깨우기 (on-demand) — 백엔드가 onSnapshot으로 받아 LiveKit room connect 시작
        updateDoc(deviceRef, {
          cameraRequested: true,
          cameraRequestedAt: serverTimestamp(),
        }).catch((e) => console.warn('[live] camera request 실패:', e?.code));

        const idToken = await auth.currentUser.getIdToken(true);
        const get = httpsCallable(functions, 'getLiveKitToken');
        const { data } = await get({ deviceId, idToken });
        if (mounted) {
          setToken(data.token);
          setUrl(data.url);
        }
      } catch (e) {
        if (mounted) setError(e?.code || e?.message || String(e));
      }
    })();
    return () => {
      mounted = false;
      // 보호자 측 leave
      room.disconnect().catch(() => {});
      // 시니어 publisher 끄기 신호 → 시니어 백엔드가 room disconnect → empty_timeout 후 inactive
      updateDoc(deviceRef, { cameraRequested: false }).catch(() => {});
    };
  }, [deviceId, room]);

  if (error) {
    return (
      <View style={styles.liveStreamWrap}>
        <View style={styles.liveStreamPlaceholder}>
          <Text style={styles.livePlaceholderText}>연결 실패: {error}</Text>
        </View>
        <HapticButton onPress={onClose} style={styles.liveCloseBtn}>
          <Icon name="X" size={14} color="#fff" />
        </HapticButton>
      </View>
    );
  }
  if (!token || !url) {
    return (
      <View style={styles.liveStreamWrap}>
        <View style={styles.liveStreamPlaceholder}>
          <Text style={styles.livePlaceholderText}>연결 중...</Text>
        </View>
        <HapticButton onPress={onClose} style={styles.liveCloseBtn}>
          <Icon name="X" size={14} color="#fff" />
        </HapticButton>
      </View>
    );
  }

  return (
    <View style={styles.liveStreamWrap}>
      <LiveKitRoom
        serverUrl={url}
        token={token}
        connect={true}
        audio={false}
        video={false}
        room={room}
      >
        <SeniorVideoView />
      </LiveKitRoom>
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
  liveStream: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111',
  },
  liveStreamPlaceholder: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePlaceholderText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: fontSize.sm,
  },
  liveCloseBtn: {
    position: 'absolute', bottom: 10, right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
});
