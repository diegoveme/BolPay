import axios from 'axios';

/**
 * Shared axios instance pointed at the BolPay API.
 * Base URL comes from VITE_API_URL; falls back to the dev proxy path "/api".
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  headers: { 'Content-Type': 'application/json' },
});
