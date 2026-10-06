import axios from 'axios';
export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
});
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('conservex-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login')
    )
      window.dispatchEvent(new Event('session-expired'));
    return Promise.reject(error);
  },
);
export const errorMessage = (error) =>
  error.response?.data?.message ||
  (error.code === 'ECONNABORTED'
    ? 'The request timed out. Please try again.'
    : 'Cannot reach the server. Check your connection and try again.');
export const get = async (url) => (await api.get(url)).data.data;
export function multipart(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values))
    if (value !== null && value !== undefined && value !== '')
      data.append(key, value);
  return data;
}
export function photoUrl(path) {
  if (!path) return '';
  const base = api.defaults.baseURL;
  return /^https?:\/\//.test(base) ? new URL(path, base).href : path;
}
