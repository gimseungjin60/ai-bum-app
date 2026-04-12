const BASE_URL = 'http://175.115.28.214:8000';

class ApiService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: '서버 오류' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
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

  // 리포트
  async getSummary(deviceId = 'frame-001') {
    return this.request(`/api/reports/summary?device_id=${deviceId}`);
  }

  async getDailyReport(deviceId = 'frame-001', date = '') {
    const query = date ? `&date=${date}` : '';
    return this.request(`/api/reports/daily?device_id=${deviceId}${query}`);
  }

  async getWeeklyReport(deviceId = 'frame-001') {
    return this.request(`/api/reports/weekly?device_id=${deviceId}`);
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

  // 복약 관리
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
}

export const api = new ApiService();
export { BASE_URL };
