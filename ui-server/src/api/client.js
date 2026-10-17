import { API_ENDPOINTS } from '../apiConfig';

/* ---- the one snake_case <-> camelCase util ---- */
const toCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
const toSnake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const isPlain = (v) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;

function convert(value, fn) {
  if (Array.isArray(value)) return value.map((v) => convert(v, fn));
  if (isPlain(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [fn(k), convert(v, fn)]));
  }
  return value;
}
export const camelize = (v) => convert(v, toCamel);
export const snakeify = (v) => convert(v, toSnake);

/* ---- errors ---- */
export class ApiError extends Error {
  constructor(code, message, status, handled = false) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.handled = handled;
  }
}

let errorSink = null;
export const setErrorSink = (fn) => { errorSink = fn; };
export const notifyError = (msg) => errorSink?.(msg);

export const getToken = () => {
  try { return localStorage.getItem('access_token'); } catch { return null; }
};

export async function request(method, url, { body, params, auth = true } = {}) {
  let full = url;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(snakeify(params)).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, v);
    });
    const s = qs.toString();
    if (s) full += (url.includes('?') ? '&' : '?') + s;
  }
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(full, { method, headers, body: body !== undefined ? JSON.stringify(snakeify(body)) : undefined });
  } catch {
    throw new ApiError('NETWORK', 'Could not reach DayGraph. Check that the server is running.', 0);
  }

  let json = null;
  try { json = await res.json(); } catch { json = null; }

  if (!res.ok) {
    const data = json && (json.data ?? json.detail);
    const code = (data && (data.code || (data.detail && data.detail.code))) || (json && json.detail && json.detail.code) || 'ERROR';
    const message = (json && (typeof json.status_message === 'string' ? json.status_message : null))
      || (json && json.detail && (json.detail.message || (typeof json.detail === 'string' ? json.detail : null)))
      || `Request failed (${res.status})`;
    let handled = false;
    if (res.status === 401 && auth) {
      try { localStorage.removeItem('access_token'); } catch { /* ignore */ }
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
      handled = true;
    } else if (res.status === 409 && code === 'PRIORITY_CAP_EXCEEDED') {
      errorSink?.('You can only have 3 priorities. Move one first.');
      handled = true;
    } else if (res.status === 503) {
      errorSink?.('Google is not reachable. Your changes are saved in DayGraph.');
      handled = true;
    }
    throw new ApiError(code, message, res.status, handled);
  }
  const payload = json && 'data' in json ? json.data : json;
  return camelize(payload);
}

export const apiGet = (url, params) => request('GET', url, { params });
export const apiPost = (url, body) => request('POST', url, { body: body ?? {} });
export const apiPatch = (url, body) => request('PATCH', url, { body });
export const apiPut = (url, body) => request('PUT', url, { body });

export const devLogin = (user = 'aiko') => request('POST', API_ENDPOINTS.devLogin, { body: { user }, auth: false });
