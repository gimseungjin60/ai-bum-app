import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext(null);

const ACTIVE_SENIOR_KEY = '@active_senior_id';

// 구 AsyncStorage 키 일괄 삭제 (첫 실행 시 마이그레이션)
const LEGACY_KEYS = ['@auth_token', '@auth_user', '@paired_device', '@pairings'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);          // { uid, email, name }
  const [pairings, setPairings] = useState([]);     // [{ deviceId, pairedAt }]
  const [activeSeniorId, setActiveSeniorIdState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 구 JWT 잔재 삭제 (1회성 마이그레이션)
    AsyncStorage.multiRemove(LEGACY_KEYS).catch(() => {});

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setPairings([]);
        setLoading(false);
        return;
      }

      const profile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '사용자',
      };
      setUser(profile);

      // 저장된 활성 시니어 복구
      const storedActive = await AsyncStorage.getItem(ACTIVE_SENIOR_KEY).catch(() => null);
      if (storedActive) setActiveSeniorIdState(storedActive);

      setLoading(false);
    });

    return unsubscribeAuth;
  }, []);

  // 로그인한 동안 Firestore users/{uid}.pairings 실시간 구독
  useEffect(() => {
    if (!user?.uid) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const rawPairings = data.pairings || [];
      // 형식 정규화: Cloud Function은 { deviceId, pairedAt }, 구 백엔드는 { device_id, ... }
      const normalized = rawPairings
        .map((p) => ({
          deviceId: p.deviceId || p.device_id,
          pairedAt: p.pairedAt || p.paired_at || null,
        }))
        .filter((p) => p.deviceId);
      setPairings(normalized);

      // 활성 시니어가 없거나 페어링 목록에 없으면 첫 항목으로 자동 설정
      setActiveSeniorIdState((prev) => {
        if (normalized.length === 0) return null;
        if (prev && normalized.some((p) => p.deviceId === prev)) return prev;
        const first = normalized[0].deviceId;
        AsyncStorage.setItem(ACTIVE_SENIOR_KEY, first).catch(() => {});
        return first;
      });
    });

    return unsubscribe;
  }, [user?.uid]);

  async function login(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    // Firestore users/{uid} 문서 있는지 확인 — 없으면 생성
    const userRef = doc(db, 'users', credential.user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        email: credential.user.email,
        name: credential.user.displayName || '',
        pairings: [],
        role: '보호자',
        createdAt: serverTimestamp(),
      });
    }
    return credential.user;
  }

  async function signup(email, password, name) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    // Firestore users/{uid} 초기 문서 생성
    await setDoc(doc(db, 'users', credential.user.uid), {
      email,
      name,
      pairings: [],
      role: '보호자',
      createdAt: serverTimestamp(),
    });
    return credential.user;
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setPairings([]);
    setActiveSeniorIdState(null);
    await AsyncStorage.removeItem(ACTIVE_SENIOR_KEY);
  }

  // 페어링 완료 후 활성 시니어 설정 (PairingScreen에서 호출)
  async function addPairing(deviceId) {
    if (!deviceId) return;
    setActiveSeniorIdState(deviceId);
    await AsyncStorage.setItem(ACTIVE_SENIOR_KEY, deviceId);
    // pairings 배열 자체는 Firestore onSnapshot이 자동으로 갱신함
  }

  async function removePairing(deviceId) {
    const next = pairings.filter((p) => p.deviceId !== deviceId);
    if (activeSeniorId === deviceId) {
      const newActive = next[0]?.deviceId || null;
      setActiveSeniorIdState(newActive);
      if (newActive) {
        await AsyncStorage.setItem(ACTIVE_SENIOR_KEY, newActive);
      } else {
        await AsyncStorage.removeItem(ACTIVE_SENIOR_KEY);
      }
    }
  }

  async function setActiveSenior(deviceId) {
    if (!pairings.some((p) => p.deviceId === deviceId)) return;
    setActiveSeniorIdState(deviceId);
    await AsyncStorage.setItem(ACTIVE_SENIOR_KEY, deviceId);
  }

  const activePairing = pairings.find((p) => p.deviceId === activeSeniorId) || pairings[0] || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        // 다대다 페어링
        pairings,
        activeSeniorId: activePairing?.deviceId || null,
        activePairing,
        addPairing,
        removePairing,
        setActiveSenior,
        // legacy 호환
        pairedDevice: activePairing,
        isPaired: pairings.length > 0,
        savePairing: (info) => addPairing(info?.deviceId || info?.device_id),
        clearPairing: () => activeSeniorId ? removePairing(activeSeniorId) : Promise.resolve(),
        // 인증
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
