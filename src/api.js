const request = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
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
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  summary: () => request('/api/summary'),
  clients: (params) => request(`/api/clients?${new URLSearchParams(params)}`),
  client: (id) => request(`/api/clients/${id}`),
  emailInvoice: (clientId, invoiceId) => request(`/api/clients/${clientId}/invoices/${invoiceId}/email`, { method: 'POST' }),
};

export const invoiceDownloadUrl = (clientId, invoiceId) => `/api/clients/${clientId}/invoices/${invoiceId}/download`;
