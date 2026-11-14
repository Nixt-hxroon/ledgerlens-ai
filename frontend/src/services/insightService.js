import api from './api';

export const insightService = {
  async askQuestion(question) {
    const res = await api.post('/insights/ask', { question });
    return res.data;
  },

  async getReports() {
    const res = await api.get('/insights/reports');
    return res.data;
  },

  getExportCSVUrl() {
    const rawBase = import.meta.env.VITE_API_BASE_URL || '/api';
    const baseUrl = (rawBase.startsWith('http') && typeof window !== 'undefined' && window.location.origin !== new URL(rawBase).origin)
      ? '/api'
      : rawBase;
    const token = localStorage.getItem('ledgerlens_access_token');
    return `${baseUrl}/insights/export-csv${token ? `?token=${token}` : ''}`;
  },
};

export const settingsService = {
  async getProfile() {
    const res = await api.get('/settings/profile');
    return res.data;
  },

  async updateProfile(data) {
    const res = await api.patch('/settings/profile', data);
    return res.data;
  },

  async changePassword(data) {
    const res = await api.post('/settings/change-password', data);
    return res.data;
  },
};

