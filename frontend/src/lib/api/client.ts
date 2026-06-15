import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const AUTH_STORAGE_KEY = 'auth_storage';
type AuthStorageMode = 'local' | 'session';

// Storage helpers (works in browser only)
function getActiveStorageMode(): AuthStorageMode | null {
  if (typeof window === 'undefined') return null;

  const storedMode = localStorage.getItem(AUTH_STORAGE_KEY);
  if (storedMode === 'local' || storedMode === 'session') {
    return storedMode;
  }

  if (sessionStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY)) {
    return 'session';
  }

  if (localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY)) {
    return 'local';
  }

  return null;
}

function getStorageForMode(mode: AuthStorageMode) {
  return mode === 'session' ? sessionStorage : localStorage;
}

const getToken = () => {
  if (typeof window === 'undefined') return null;
  const mode = getActiveStorageMode();
  if (mode) {
    return getStorageForMode(mode).getItem(ACCESS_TOKEN_KEY);
  }
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
};

const setToken = (t: string, rememberMe = true) => {
  if (typeof window === 'undefined') return;
  const mode: AuthStorageMode = rememberMe ? 'local' : 'session';
  const storage = getStorageForMode(mode);
  const otherStorage = getStorageForMode(mode === 'local' ? 'session' : 'local');

  storage.setItem(ACCESS_TOKEN_KEY, t);
  otherStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.setItem(AUTH_STORAGE_KEY, mode);
};

const getRefresh = () => {
  if (typeof window === 'undefined') return null;
  const mode = getActiveStorageMode();
  if (mode) {
    return getStorageForMode(mode).getItem(REFRESH_TOKEN_KEY);
  }
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
};

const setRefresh = (t: string, rememberMe = true) => {
  if (typeof window === 'undefined') return;
  const mode: AuthStorageMode = rememberMe ? 'local' : 'session';
  const storage = getStorageForMode(mode);
  const otherStorage = getStorageForMode(mode === 'local' ? 'session' : 'local');

  storage.setItem(REFRESH_TOKEN_KEY, t);
  otherStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.setItem(AUTH_STORAGE_KEY, mode);
};

const clearTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
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
        const storageMode = getActiveStorageMode() ?? 'local';
        const rememberMe = storageMode === 'local';
        setToken(accessToken, rememberMe);
        setRefresh(newRefresh, rememberMe);
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
