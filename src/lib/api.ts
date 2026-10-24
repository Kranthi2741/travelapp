const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'dd-session-token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string | null) => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload as T;
}
export const signInDemo = async () => { const r = await api<{token:string;user:User}>('/auth/demo',{method:'POST',body:JSON.stringify({})}); setToken(r.token); return r.user; };
export type User = {id:string;name:string;email:string;bio:string;avatar:string;createdAt:string;};
export type ApiMemory = {id:string;title:string;story:string;place:string;destinationId:number|null;visitDate:string;tags:string[];imageUrl:string;images?:string[];state?:string;district?:string;destinationName?:string;directoryKey?:string|null;mediaType:string;createdAt:string;stampIn?:number};
export type ApiDestination = {id:number;name:string;state:string;category:string;image:string;distance:string;note:string;lat:number;lng:number};
