import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

// Storage helpers (works in browser only)
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('access_token') : null);
const setToken = (t: string) => typeof window !== 'undefined' && localStorage.setItem('access_token', t);
const getRefresh = () => (typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null);
const setRefresh = (t: string) => typeof window !== 'undefined' && localStorage.setItem('refresh_token', t);
const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — refresh on 401
let refreshing = false;
let queue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = getRefresh();
      if (!refreshToken) {
        clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      }

      if (refreshing) {
        return new Promise((resolve) => {
          queue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      refreshing = true;
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = data.data || data;
        setToken(accessToken);
        setRefresh(newRefresh);
        queue.forEach((cb) => cb(accessToken));
        queue = [];
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export { getToken, setToken, getRefresh, setRefresh, clearTokens };

// Typed API helpers
export function unwrap<T>(response: { data: { data: T } | T }): T {
  const d = response.data as any;
  if (d && typeof d === 'object' && d.data !== undefined && d.meta !== undefined) {
    return d;
  }
  return d?.data !== undefined ? d.data : d;
}
