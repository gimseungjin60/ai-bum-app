import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  TOKEN: '@auth_token',
  USER: '@auth_user',
  PAIRED: '@paired_device',        // legacy, 마이그레이션용
  PAIRINGS: '@pairings',
  ACTIVE_SENIOR: '@active_senior_id',
};

// 단일 페어링 객체 형태 정규화 (legacy/신규 모두 받아 표준 형태로)
function normalizePairing(raw) {
  if (!raw) return null;
  const deviceId = raw.deviceId || raw.device_id;
  if (!deviceId) return null;
  return {
    deviceId,
    familyId: raw.familyId || raw.family_id || null,
    seniorName: raw.seniorName || raw.senior_name || '',
    pairedAt: raw.pairedAt || raw.paired_at || Date.now(),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [pairings, setPairings] = useState([]);  // 다중 시니어 페어링
  const [activeSeniorId, setActiveSeniorIdState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [storedToken, storedUser, storedPairings, storedActive, legacyPaired] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.PAIRINGS),
          AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SENIOR),
          AsyncStorage.getItem(STORAGE_KEYS.PAIRED),
        ]);

      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        api.setToken(storedToken);
        setToken(storedToken);
        setUser(parsedUser);

        // 토큰 유효성 검증
        try {
          await api.getMe();
        } catch {
          await clearAuth();
          return;
        }

        // 페어링 복구: 신규 형식 우선, 없으면 legacy 마이그레이션
        let restoredPairings = [];
        if (storedPairings) {
          try {
            const arr = JSON.parse(storedPairings);
            restoredPairings = Array.isArray(arr)
              ? arr.map(normalizePairing).filter(Boolean)
              : [];
          } catch {
            restoredPairings = [];
          }
        }
        if (restoredPairings.length === 0 && legacyPaired) {
          // legacy 단일 페어링 → 배열로 마이그레이션
          try {
            const single = normalizePairing(JSON.parse(legacyPaired));
            if (single) {
              restoredPairings = [single];
              await AsyncStorage.setItem(
                STORAGE_KEYS.PAIRINGS,
                JSON.stringify(restoredPairings)
              );
            }
          } catch {}
        }

        if (restoredPairings.length > 0) {
          // 디바이스 응답 가능 시 검증, 오프라인이면 로컬 유지
          try {
            const status = await api.getPairingStatus();
            if (!status.is_paired) {
              // 디바이스가 페어링 해제 상태로 응답 — 매칭되는 항목만 정리
              restoredPairings = restoredPairings.filter(
                (p) => p.deviceId !== status.device_id
              );
              await AsyncStorage.setItem(
                STORAGE_KEYS.PAIRINGS,
                JSON.stringify(restoredPairings)
              );
            }
          } catch {
            // 오프라인 — 로컬 유지
          }
          setPairings(restoredPairings);

          // 활성 시니어 결정: 저장된 값 → 첫 항목
          let active = storedActive;
          if (
            !active ||
            !restoredPairings.some((p) => p.deviceId === active)
          ) {
            active = restoredPairings[0]?.deviceId || null;
            if (active) {
              await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SENIOR, active);
            }
          }
          setActiveSeniorIdState(active);
        }
      }
    } catch (e) {
      console.warn('저장된 인증 정보 로드 실패:', e);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const result = await api.login(email, password);
    if (result.success) {
      await saveAuth(result.token, result.user);
    }
    return result;
  }

  async function signup(email, password, name) {
    const result = await api.signup(email, password, name);
    if (result.success) {
      await saveAuth(result.token, result.user);
    }
    return result;
  }

  async function saveAuth(newToken, newUser) {
    api.setToken(newToken);
    setToken(newToken);
    setUser(newUser);
    await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, newToken);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
  }

  // 신규 페어링 추가 — 같은 deviceId가 이미 있으면 정보 갱신
  async function addPairing(deviceInfo) {
    const normalized = normalizePairing(deviceInfo);
    if (!normalized) return;

    const next = pairings.filter((p) => p.deviceId !== normalized.deviceId);
    next.push(normalized);
    setPairings(next);
    await AsyncStorage.setItem(STORAGE_KEYS.PAIRINGS, JSON.stringify(next));

    // legacy 호환: 가장 최근 페어링을 단일 키에도 저장
    await AsyncStorage.setItem(STORAGE_KEYS.PAIRED, JSON.stringify(normalized));

    // 첫 페어링이거나 활성 시니어가 없으면 자동 활성 설정
    if (!activeSeniorId || !pairings.some((p) => p.deviceId === activeSeniorId)) {
      setActiveSeniorIdState(normalized.deviceId);
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SENIOR, normalized.deviceId);
    }
  }

  async function removePairing(deviceId) {
    const next = pairings.filter((p) => p.deviceId !== deviceId);
    setPairings(next);
    await AsyncStorage.setItem(STORAGE_KEYS.PAIRINGS, JSON.stringify(next));

    if (activeSeniorId === deviceId) {
      const newActive = next[0]?.deviceId || null;
      setActiveSeniorIdState(newActive);
      if (newActive) {
        await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SENIOR, newActive);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SENIOR);
      }
    }

    if (next.length === 0) {
      await AsyncStorage.removeItem(STORAGE_KEYS.PAIRED);
    }
  }

  async function setActiveSenior(deviceId) {
    if (!pairings.some((p) => p.deviceId === deviceId)) return;
    setActiveSeniorIdState(deviceId);
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SENIOR, deviceId);
  }

  // legacy: 단일 페어링 저장 (기존 PairingScreen 호환)
  async function savePairing(deviceInfo) {
    await addPairing(deviceInfo);
  }

  // legacy: 단일 페어링 해제 (활성 시니어 제거 = 후방 호환)
  async function clearPairing() {
    if (activeSeniorId) {
      await removePairing(activeSeniorId);
    } else {
      setPairings([]);
      setActiveSeniorIdState(null);
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PAIRINGS,
        STORAGE_KEYS.ACTIVE_SENIOR,
        STORAGE_KEYS.PAIRED,
      ]);
    }
  }

  async function clearAuth() {
    api.setToken(null);
    setToken(null);
    setUser(null);
    setPairings([]);
    setActiveSeniorIdState(null);
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.PAIRED,
      STORAGE_KEYS.PAIRINGS,
      STORAGE_KEYS.ACTIVE_SENIOR,
    ]);
  }

  async function logout() {
    await clearAuth();
  }

  // 활성 페어링 객체 (legacy pairedDevice 호환)
  const activePairing =
    pairings.find((p) => p.deviceId === activeSeniorId) || pairings[0] || null;
  const activeDeviceId = activePairing?.deviceId || null;

  // 활성 시니어 변경 시 api 인스턴스에 즉시 반영하여 모든 요청에 X-Device-Id 자동 첨부
  useEffect(() => {
    api.setActiveSenior(activeDeviceId);
  }, [activeDeviceId]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        // 다대다 신규 API
        pairings,
        activeSeniorId: activePairing?.deviceId || null,
        activePairing,
        addPairing,
        removePairing,
        setActiveSenior,
        // legacy (기존 화면 호환)
        pairedDevice: activePairing,
        isPaired: pairings.length > 0,
        savePairing,
        clearPairing,
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
