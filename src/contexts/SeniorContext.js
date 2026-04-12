import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { wsService } from '../services/websocket';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const SeniorContext = createContext(null);

export function SeniorProvider({ children }) {
  const { isPaired, pairedDevice } = useAuth();
  const deviceId = pairedDevice?.deviceId || 'frame-001';

  // WebSocket 실시간 상태
  const [wsConnected, setWsConnected] = useState(false);
  const [seniorStatus, setSeniorStatus] = useState('idle'); // idle, greeting, active
  const [detected, setDetected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPillTaken, setIsPillTaken] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [reminder, setReminder] = useState(null);

  // REST API 데이터
  const [summary, setSummary] = useState(null);
  const [dailyReport, setDailyReport] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const appState = useRef(AppState.currentState);

  // WebSocket 연결 관리
  useEffect(() => {
    if (!isPaired) return;

    wsService.connect();
    const unsub = wsService.subscribe(handleWsMessage);

    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        wsService.connect();
        fetchSummary();
      }
      appState.current = nextState;
    });

    return () => {
      unsub();
      sub.remove();
      wsService.disconnect();
    };
  }, [isPaired]);

  function handleWsMessage(data) {
    if (data.type === 'connection') {
      setWsConnected(data.connected);
      return;
    }

    // 상태 업데이트
    if (data.status !== undefined) setSeniorStatus(data.status);
    if (data.detected !== undefined) setDetected(data.detected);
    if (data.message !== undefined) setLastMessage(data.message);
    if (data.isListening !== undefined) setIsListening(data.isListening);
    if (data.isPillTaken !== undefined) setIsPillTaken(data.isPillTaken);
    if (data.isEmergency !== undefined) setIsEmergency(data.isEmergency);

    // 리마인더
    if (data.type === 'reminder') {
      setReminder({
        reminderType: data.reminderType,
        title: data.title,
        message: data.message,
        time: data.time,
      });
    }

    // 상태 변경 시 요약 갱신
    if (data.status === 'active' || data.status === 'idle') {
      fetchSummary();
    }
  }

  const fetchSummary = useCallback(async () => {
    try {
      const result = await api.getSummary(deviceId);
      setSummary(result);
    } catch {
      // 조용히 실패
    }
  }, [deviceId]);

  const fetchDailyReport = useCallback(async (date = '') => {
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
    } catch {
      // 조용히 실패
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    if (!isPaired) return;
    fetchSummary();
    fetchWeather();
  }, [isPaired, fetchSummary, fetchWeather]);

  const dismissReminder = useCallback(() => setReminder(null), []);
  const clearEmergency = useCallback(() => setIsEmergency(false), []);

  return (
    <SeniorContext.Provider
      value={{
        // 실시간 상태
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
        // 리포트 데이터
        summary,
        dailyReport,
        weeklyReport,
        weather,
        loadingReport,
        // 데이터 fetch
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
  if (!context) {
    throw new Error('useSenior must be used within a SeniorProvider');
  }
  return context;
}
