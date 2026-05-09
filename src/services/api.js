const CLOUD_API_BASE  = process.env.EXPO_PUBLIC_API_BASE_URL        || 'http://localhost:8001';
const DEVICE_API_BASE = process.env.EXPO_PUBLIC_DEVICE_API_BASE_URL || 'http://localhost:8000';
const AUTH_API_BASE   = CLOUD_API_BASE;
const REPORT_API_BASE = CLOUD_API_BASE;

class ApiService {
  constructor() {
    this.token = null;
    this._onUnauthorized = null;
  }

  setToken(token) {
    this.token = token;
  }

  setUnauthorizedHandler(handler) {
    this._onUnauthorized = handler;
  }

  async request(baseUrl, endpoint, options = {}) {
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      ...options.headers,
    };
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      this._onUnauthorized?.();
      throw new Error('인증이 만료되었습니다.');
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: '서버 오류' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // 인증
  async signup(email, password, name) {
    return this.request(AUTH_API_BASE, '/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email, password) {
    return this.request(AUTH_API_BASE, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request(AUTH_API_BASE, '/api/auth/me');
  }

  // 페어링
  async verifyPairingCode(code, userId, userName, fcmToken) {
    return this.request(DEVICE_API_BASE, '/api/pairing/verify', {
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
    return this.request(DEVICE_API_BASE, '/api/pairing/status');
  }

  async unpairDevice() {
    return this.request(DEVICE_API_BASE, '/api/pairing/unpair', {
      method: 'POST',
    });
  }

  // 리포트
  async getSummary(deviceId = 'frame-001') {
    return this.request(REPORT_API_BASE, `/api/reports/summary?device_id=${deviceId}`);
  }

  async getDailyReport(deviceId = 'frame-001', date = '') {
    const query = date ? `&date=${date}` : '';
    return this.request(REPORT_API_BASE, `/api/reports/daily?device_id=${deviceId}${query}`);
  }

  async getWeeklyReport(deviceId = 'frame-001') {
    return this.request(REPORT_API_BASE, `/api/reports/weekly?device_id=${deviceId}`);
  }

  // 세션
  async getSessions(limit = 20) {
    return this.request(DEVICE_API_BASE, `/api/sessions?limit=${limit}`);
  }

  // 날씨
  async getWeather() {
    return this.request(DEVICE_API_BASE, '/api/weather');
  }

  // 루틴
  async getRoutines() {
    return this.request(DEVICE_API_BASE, '/api/routines');
  }

  // 복약 관리
  async getMedications() {
    return this.request(DEVICE_API_BASE, '/api/medications');
  }

  async addMedication(data) {
    return this.request(DEVICE_API_BASE, '/api/medications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMedication(medId, data) {
    return this.request(DEVICE_API_BASE, `/api/medications/${medId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMedication(medId) {
    return this.request(DEVICE_API_BASE, `/api/medications/${medId}`, {
      method: 'DELETE',
    });
  }

  async getMedicationHistory(limit = 30) {
    return this.request(DEVICE_API_BASE, `/api/medications/history?limit=${limit}`);
  }

  getVideoStreamUrl() {
    return `${DEVICE_API_BASE}/video`;
  }
}

export const api = new ApiService();
export { AUTH_API_BASE, DEVICE_API_BASE, REPORT_API_BASE };
