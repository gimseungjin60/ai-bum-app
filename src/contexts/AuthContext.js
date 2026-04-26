import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  TOKEN: '@auth_token',
  USER: '@auth_user',
  PAIRED: '@paired_device',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [pairedDevice, setPairedDevice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const [storedToken, storedUser, storedDevice] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
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

        if (storedDevice) {
          // 기기의 실제 페어링 상태 검증 (기기가 응답하면 신뢰, 오프라인이면 로컬 유지)
          try {
            const status = await api.getPairingStatus();
            if (status.is_paired) {
              setPairedDevice(JSON.parse(storedDevice));
            } else {
              await AsyncStorage.removeItem(STORAGE_KEYS.PAIRED);
            }
          } catch {
            // 기기 오프라인 — 로컬 저장 상태 유지
            setPairedDevice(JSON.parse(storedDevice));
          }
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

  async function savePairing(deviceInfo) {
    setPairedDevice(deviceInfo);
    await AsyncStorage.setItem(STORAGE_KEYS.PAIRED, JSON.stringify(deviceInfo));
  }

  async function clearPairing() {
    setPairedDevice(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.PAIRED);
  }

  async function clearAuth() {
    api.setToken(null);
    setToken(null);
    setUser(null);
    setPairedDevice(null);
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.PAIRED,
    ]);
  }

  async function logout() {
    await clearAuth();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        pairedDevice,
        loading,
        isAuthenticated: !!token,
        isPaired: !!pairedDevice,
        login,
        signup,
        logout,
        savePairing,
        clearPairing,
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
