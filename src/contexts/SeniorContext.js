import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const SeniorContext = createContext(null);

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function SeniorProvider({ children }) {
  const { isPaired, activeSeniorId, pairedDevice } = useAuth();
  const deviceId = activeSeniorId || pairedDevice?.deviceId || null;

  // Firestore 실시간 상태 (devices/{deviceId})
  const [isPillTaken, setIsPillTaken] = useState(false);
  const [reminder, setReminder] = useState(null);
  const [lastSeenMs, setLastSeenMs] = useState(null);
  const [seniorStatus, setSeniorStatus] = useState('idle');
  const [nowTick, setNowTick] = useState(Date.now());

  // online 판정: heartbeat 주기(60s) + 약간의 여유
  const wsConnected = lastSeenMs !== null && nowTick - lastSeenMs < 90_000;

  // 미사용/추후 마이그레이션 대상
  const [detected] = useState(false);
  const [isListening] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [lastMessage] = useState('');

  // REST API 데이터 (같은 네트워크 시 동작, 아니면 null 유지)
  const [summary, setSummary] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const appState = useRef(AppState.currentState);

  // Firestore devices/{deviceId} onSnapshot → isPillTaken 실시간 추적
  useEffect(() => {
    if (!deviceId) return;

    const docRef = doc(db, 'devices', deviceId);
    const unsub = onSnapshot(docRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      const lastPill = data.lastPillTakenAt;
      if (lastPill) {
        const ts = lastPill.toDate ? lastPill.toDate() : new Date(lastPill);
        setIsPillTaken(ts >= todayStart());
      } else {
        setIsPillTaken(false);
      }

      const lastSeen = data.lastSeen;
      if (lastSeen) {
        const ts = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
        setLastSeenMs(ts.getTime());
      }

      if (data.currentStatus) setSeniorStatus(data.currentStatus);
    }, () => {}); // 권한 없어도 조용히 실패

    return unsub;
  }, [deviceId]);

  // wsConnected 판정용 시계 — 30초마다 강제 리렌더
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!deviceId) return;
    try {
      const result = await api.getSummary(deviceId);
      setSummary(result);
    } catch {}
  }, [deviceId]);

  const fetchDailyReport = useCallback(async (date = '') => {
    if (!deviceId) return;
    setLoadingReport(true);
    try {
      const result = await api.getDailyReport(deviceId, date);
      setDailyReport(result);
    } catch {
      setDailyReport(null);
    } finally {
      setLoadingReport(false);
    }
  }, [deviceId]);

  const fetchWeeklyReport = useCallback(async () => {
    if (!deviceId) return;
    setLoadingReport(true);
    try {
      const result = await api.getWeeklyReport(deviceId);
      setWeeklyReport(result);
    } catch {
      setWeeklyReport(null);
    } finally {
      setLoadingReport(false);
    }
  }, [deviceId]);

  const fetchWeather = useCallback(async () => {
    try {
      const result = await api.getWeather();
      setWeather(result);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isPaired) return;
    fetchSummary();
    fetchWeather();
  }, [isPaired, fetchSummary, fetchWeather]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        fetchSummary();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [fetchSummary]);

  const dismissReminder = useCallback(() => setReminder(null), []);
  const clearEmergency = useCallback(() => setIsEmergency(false), []);

  return (
    <SeniorContext.Provider
      value={{
        wsConnected,
        seniorStatus,
        detected,
        isListening,
        isPillTaken,
        isEmergency,
        lastMessage,
        reminder,
        dismissReminder,
        clearEmergency,
        summary,
        dailyReport,
        weeklyReport,
        weather,
        loadingReport,
        fetchSummary,
        fetchDailyReport,
        fetchWeeklyReport,
        fetchWeather,
      }}
    >
      {children}
    </SeniorContext.Provider>
  );
}

export function useSenior() {
  const context = useContext(SeniorContext);
  if (!context) throw new Error('useSenior must be used within a SeniorProvider');
  return context;
}
