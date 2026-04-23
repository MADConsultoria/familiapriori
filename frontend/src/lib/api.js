const apiBase = (() => {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (!isLocal) return '';
  const fromEnv = window.__ENV?.API_BASE_URL || window.__ENV?.BACKEND_URL || 'http://localhost:3001';
  return fromEnv.replace(/\/+$/, '');
})();

export function buildApiUrl(path = '') {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return apiBase ? `${apiBase}${normalized}` : normalized;
}

export async function apiFetch(path, { headers = {}, ...options } = {}) {
  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || 'Erro ao comunicar com a API';
    throw new Error(message);
  }
  return data;
}
