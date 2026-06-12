import axios from 'axios';

export const api = axios.create({
  // In development, Vite proxies /api to the local FastAPI server.
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});
