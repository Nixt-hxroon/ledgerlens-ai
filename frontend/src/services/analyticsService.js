import api from './api';

export const analyticsService = {
  async getDashboard() {
    const res = await api.get('/analytics/dashboard');
    return res.data;
  },

  async getSpending() {
    const res = await api.get('/analytics/spending');
    return res.data;
  },

  async getVendors() {
    const res = await api.get('/analytics/vendors');
    return res.data;
  },

  async getDocumentsAnalytics() {
    const res = await api.get('/analytics/documents');
    return res.data;
  },
};
