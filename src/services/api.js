import Constants from 'expo-constants';

// .env의 EXPO_PUBLIC_API_URL 우선. 없으면 Expo 개발 서버 호스트에서 IP 자동 감지.
// 팀원마다 컴퓨터 IP가 달라도 각자 `npx expo start` 실행만 하면 자동으로 맞는 IP를 씀.
function resolveBase() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8000`;
  }
  return 'http://localhost:8000';
}

const BASE_URL = resolveBase();

class ApiService {
  constructor() {
    this.token = null;
    // 다대다 지원: 활성 시니어 ID. AuthContext에서 변경될 때마다 setActiveSenior 호출.
    // 모든 요청에 X-Device-Id 헤더로 자동 첨부되어 시니어 백엔드가 다대다 라우팅 시 활용.
    // 시연은 1:1이라 단일 디바이스 백엔드가 헤더 무시해도 정상 동작.
    this.activeSeniorId = null;
  }

  setToken(token) {
    this.token = token;
  }

  setActiveSenior(deviceId) {
    this.activeSeniorId = deviceId || null;
  }

  // 활성 시니어 ID를 반환 (없으면 legacy 기본값)
  getActiveSeniorId() {
    return this.activeSeniorId || 'frame-001';
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    // 다대다: 활성 시니어 ID를 항상 헤더로 전달. 백엔드가 라우팅에 사용 가능.
    if (this.activeSeniorId) {
      headers['X-Device-Id'] = this.activeSeniorId;
    }
    // 네트워크 hang 방지 — 8초 timeout. 백엔드 미연결/방화벽 차단 시 spinner 무한대 회피
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const config = {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '서버 오류' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }
      return response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`요청 시간 초과 (${url})`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 인증
  async signup(email, password, name) {
    return this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request(`/api/auth/me?token=${this.token}`);
  }

  // 페어링
  async verifyPairingCode(code, userId, userName, fcmToken) {
    return this.request('/api/pairing/verify', {
      method: 'POST',
      body: JSON.stringify({
        code,
        user_id: userId,
        user_name: userName,
        fcm_token: fcmToken || '',
      }),
    });
  }

  async getPairingStatus() {
    return this.request('/api/pairing/status');
  }

  async unpairDevice() {
    const response = await fetch(`${BASE_URL}/api/pairing/unpair`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...(this.activeSeniorId ? { 'X-Device-Id': this.activeSeniorId } : {}),
      },
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: '서버 오류' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // 리포트 — 명시 deviceId 우선, 없으면 활성 시니어 ID 사용
  async getSummary(deviceId) {
    const did = deviceId || this.getActiveSeniorId();
    return this.request(`/api/reports/summary?device_id=${did}`);
  }

  async getDailyReport(deviceId, date = '') {
    const did = typeof deviceId === 'string' && deviceId ? deviceId : this.getActiveSeniorId();
    // 호환: 첫 인자에 date 문자열을 넘기는 옛 패턴이 있을 수 있어 형태 검증
    const query = date ? `&date=${date}` : '';
    return this.request(`/api/reports/daily?device_id=${did}${query}`);
  }

  async getWeeklyReport(deviceId) {
    const did = deviceId || this.getActiveSeniorId();
    return this.request(`/api/reports/weekly?device_id=${did}`);
  }

  // 세션
  async getSessions(limit = 20) {
    return this.request(`/api/sessions?limit=${limit}`);
  }

  // 날씨
  async getWeather() {
    return this.request('/api/weather');
  }

  // 루틴
  async getRoutines() {
    return this.request('/api/routines');
  }

  // 복약 관리 — X-Device-Id 헤더로 다대다 라우팅 (시연은 백엔드 단일이라 헤더 무시됨)
  async getMedications() {
    return this.request('/api/medications');
  }

  async addMedication(data) {
    return this.request('/api/medications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMedication(medId, data) {
    return this.request(`/api/medications/${medId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMedication(medId) {
    return this.request(`/api/medications/${medId}`, {
      method: 'DELETE',
    });
  }

  async getMedicationHistory(limit = 30) {
    return this.request(`/api/medications/history?limit=${limit}`);
  }

  async getMedicationCalendar(from = '', to = '') {
    const params = [];
    if (from) params.push(`from=${from}`);
    if (to) params.push(`to=${to}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return this.request(`/api/medications/calendar${query}`);
  }

  getVideoStreamUrl() {
    return `${BASE_URL}/video`;
  }

  // RN <Image>는 MJPEG 미지원이라 단일 JPEG 폴링용 — 호출자가 timestamp를 cache-buster로 붙임
  getSnapshotUrl(ts) {
    return `${BASE_URL}/snapshot?t=${ts || Date.now()}`;
  }
}

export const api = new ApiService();
export { BASE_URL };
