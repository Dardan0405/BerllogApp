import React, { createContext, useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';

// Configure your API base. In Expo, prefer EXPO_PUBLIC_API_BASE.
const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://127.0.0.1:8000';
const API_BASE = RAW_BASE.replace(/\/$/, '');
console.log('[Auth] API_BASE =', API_BASE);

async function request(path, { method = 'GET', token, json, body, headers, timeoutMs = 12000 } = {}) {
  const h = {
    Accept: 'application/json',
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers || {}),
  };
  const url = `${API_BASE}${path}`;
  console.log('[Auth] Request', method, url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: h,
      body: json ? JSON.stringify(json) : body,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    const isAbort = e?.name === 'AbortError';
    console.log('[Auth] Network error', isAbort ? 'Timeout/Abort' : (e?.message || e));
    const err = new Error(isAbort ? 'Network timeout. Please check your connection.' : (e?.message || 'Network request failed'));
    err.network = true;
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    console.log('[Auth] HTTP error', res.status, data);
    throw err;
  }
  return data;
}

export const AuthContext = createContext({
  token: null,
  user: null,
  points: 0,
  notifications: [],
  unreadCount: 0,
  loading: false,
  login: async (_email, _password) => {},
  register: async (_payload) => {},
  logout: async () => {},
  clearAllNotifications: async () => {},
  loginWithGoogle: async (_payload) => {},
  loginWithApple: async (_payload) => {},
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [points, setPoints] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(async (tkn) => {
    const data = await request('/api/users/profile', { token: tkn });
    setUser(data?.user || data || null);
  }, []);

  const loadPoints = useCallback(async (tkn) => {
    const data = await request('/api/users/point', { token: tkn });
    const value = data?.points ?? data?.data ?? data ?? 0;
    setPoints(Number(value) || 0);
  }, []);

  const loadNotifications = useCallback(async (tkn) => {
    const data = await request('/api/users/notifications', { token: tkn });
    const items = data?.data ?? data?.notifications ?? data ?? [];
    const list = Array.isArray(items) ? items : [];
    setNotifications(list);
    const count = list.filter((n) => n?.read === false || n?.read === 0 || n?.read_at == null).length;
    setUnreadCount(count);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      console.log('[Auth] Login start');
      const data = await request('/api/login', { method: 'POST', json: { email, password } });
      const tkn = data?.token || data?.access_token || data?.data?.token;
      if (!tkn) throw new Error('No token in response');
      setToken(tkn);
      await Promise.all([
        loadProfile(tkn).catch(() => {}),
        loadPoints(tkn).catch(() => {}),
        loadNotifications(tkn).catch(() => {}),
      ]);
      console.log('[Auth] Login success');
      return { success: true };
    } catch (e) {
      const isNetwork = e?.network || e?.name === 'AbortError';
      const message = isNetwork
        ? `Network error. Cannot reach ${API_BASE}. Ensure phone & server are on same LAN, server is bound to 0.0.0.0:8000, and firewall allows access.`
        : (e?.message || 'Please try again');
      console.log('[Auth] Login error', message);
      Alert.alert('Login failed', message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [loadNotifications, loadPoints, loadProfile]);

  const register = useCallback(async (payload) => {
    setLoading(true);
    try {
      const data = await request('/api/register', { method: 'POST', json: payload });
      // If backend logs in after register and returns token, handle it
      const tkn = data?.token || data?.access_token || data?.data?.token;
      if (tkn) {
        setToken(tkn);
        await Promise.all([
          loadProfile(tkn).catch(() => {}),
          loadPoints(tkn).catch(() => {}),
          loadNotifications(tkn).catch(() => {}),
        ]);
      }
      return { success: true };
    } catch (e) {
      // Don't show alert here - let the component handle errors
      console.log('[Auth] Register error:', e?.status, e?.data);
      return { 
        success: false, 
        error: {
          message: e?.message || 'Registration failed',
          status: e?.status,
          data: e?.data
        } 
      };
    } finally {
      setLoading(false);
    }
  }, [loadNotifications, loadPoints, loadProfile]);

  const loginWithGoogle = useCallback(async (payload = {}) => {
    setLoading(true);
    try {
      console.log('[Auth] Google mock login start');
      const data = await request('/api/auth/google/mock', { method: 'POST', json: payload });
      const tkn = data?.token || data?.access_token || data?.data?.token;
      if (!tkn) throw new Error('No token in response');
      setToken(tkn);
      await Promise.all([
        loadProfile(tkn).catch(() => {}),
        loadPoints(tkn).catch(() => {}),
        loadNotifications(tkn).catch(() => {}),
      ]);
      console.log('[Auth] Google mock login success');
      return { success: true };
    } catch (e) {
      const isNetwork = e?.network || e?.name === 'AbortError';
      const message = isNetwork
        ? `Network error. Cannot reach ${API_BASE}. Ensure phone & server are on same LAN, server is bound to 0.0.0.0:8000, and firewall allows access.`
        : (e?.message || 'Please try again');
      console.log('[Auth] Google mock login error', message);
      Alert.alert('Google login failed', message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [loadNotifications, loadPoints, loadProfile]);

  const loginWithApple = useCallback(async (payload = {}) => {
    setLoading(true);
    try {
      console.log('[Auth] Apple mock login start');
      const data = await request('/api/auth/apple/mock', { method: 'POST', json: payload });
      const tkn = data?.token || data?.access_token || data?.data?.token;
      if (!tkn) throw new Error('No token in response');
      setToken(tkn);
      await Promise.all([
        loadProfile(tkn).catch(() => {}),
        loadPoints(tkn).catch(() => {}),
        loadNotifications(tkn).catch(() => {}),
      ]);
      console.log('[Auth] Apple mock login success');
      return { success: true };
    } catch (e) {
      const isNetwork = e?.network || e?.name === 'AbortError';
      const message = isNetwork
        ? `Network error. Cannot reach ${API_BASE}. Ensure phone & server are on same LAN, server is bound to 0.0.0.0:8000, and firewall allows access.`
        : (e?.message || 'Please try again');
      console.log('[Auth] Apple mock login error', message);
      Alert.alert('Apple login failed', message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [loadNotifications, loadPoints, loadProfile]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await request('/api/logout', { method: 'POST', token });
      }
    } catch {}
    setToken(null);
    setUser(null);
    setPoints(0);
    setNotifications([]);
    setUnreadCount(0);
  }, [token]);

  const clearAllNotifications = useCallback(async () => {
    try {
      if (!token) return;
      await request('/api/users/notifications', { method: 'DELETE', token });
      setNotifications([]);
      setUnreadCount(0);
    } catch {}
  }, [token]);

  const value = useMemo(() => ({
    token,
    user,
    points,
    notifications,
    unreadCount,
    loading,
    login,
    register,
    logout,
    clearAllNotifications,
    loginWithGoogle,
    loginWithApple,
  }), [token, user, points, notifications, unreadCount, loading, login, register, logout, clearAllNotifications, loginWithGoogle, loginWithApple]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};
