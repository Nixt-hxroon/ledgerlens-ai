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
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    return `${baseUrl}/insights/export-csv`;
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

