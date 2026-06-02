const tokenStorageKey = 'fenyx_admin_token';

const getToken = () => sessionStorage.getItem(tokenStorageKey);
const setToken = (token) => token ? sessionStorage.setItem(tokenStorageKey, token) : sessionStorage.removeItem(tokenStorageKey);

const request = async (path, options = {}) => {
  const token = getToken();
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? 'Request failed');
  }

  if (response.status === 204) return null;
  return response.json();
};

export const api = {
  login: async (email, password) => {
    const session = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setToken(session.token);
    return session;
  },
  logout: async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setToken(null);
    }
  },
  me: () => request('/api/auth/me'),
  summary: () => request('/api/summary'),
  clients: (params) => request(`/api/clients?${new URLSearchParams(params)}`),
  client: (id) => request(`/api/clients/${id}`),
  emailInvoice: (clientId, invoiceId) => request(`/api/clients/${clientId}/invoices/${invoiceId}/email`, { method: 'POST' }),
};

export const invoiceDownloadUrl = (clientId, invoiceId) => `/api/clients/${clientId}/invoices/${invoiceId}/download`;
