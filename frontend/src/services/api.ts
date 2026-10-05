export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
export interface DemoUser {
  userId: string;
  name: string;
  role: string;
}
export interface Health {
  database: 'not_configured' | 'connected' | 'disconnected';
}
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
  /\/$/,
  '',
);
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`);
  const body: ApiResponse<T> = await response.json();
  if (!response.ok || !body.success)
    throw new Error(body.message || 'Request failed');
  return body.data;
}
