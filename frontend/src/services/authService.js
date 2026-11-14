import api from './api';

export const authService = {
  async register(data) {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  async login(credentials) {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },

  async logout(refreshToken) {
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch (e) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('ledgerlens_access_token');
      localStorage.removeItem('ledgerlens_refresh_token');
      localStorage.removeItem('ledgerlens_user');
    }
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async forgotPassword(email) {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token, newPassword) {
    const res = await api.post('/auth/reset-password', { token, newPassword });
    return res.data;
  },
};
