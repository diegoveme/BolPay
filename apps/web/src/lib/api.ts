import axios, { AxiosError } from 'axios';
import { clearSession, getToken } from './session';

/**
 * Shared axios instance pointed at the BolPay API.
 * Base URL comes from VITE_API_URL; falls back to the dev proxy path "/api".
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && getToken()) {
      // Expired/invalid session: drop it and send the user back to login.
      clearSession();
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

/** Extract a human-readable message from a BolPay API error. */
export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined;
    if (Array.isArray(data?.message)) return data.message.join(' · ');
    if (typeof data?.message === 'string') return data.message;
    return error.message;
  }
  return error instanceof Error ? error.message : 'Error inesperado';
}
