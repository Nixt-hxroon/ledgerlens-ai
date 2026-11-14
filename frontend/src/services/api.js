import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ledgerlens_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors & token refresh
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('ledgerlens_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const newAccessToken = res.data?.data?.accessToken;

          if (newAccessToken) {
            localStorage.setItem('ledgerlens_access_token', newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem('ledgerlens_access_token');
          localStorage.removeItem('ledgerlens_refresh_token');
          localStorage.removeItem('ledgerlens_user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      } else {
        localStorage.removeItem('ledgerlens_access_token');
        localStorage.removeItem('ledgerlens_user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    const message = error.response?.data?.message || error.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export default api;

