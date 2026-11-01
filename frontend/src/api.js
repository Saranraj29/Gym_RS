const BASE = import.meta.env.VITE_API_URL || ''

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, form } = {}) {
  const init = { method, headers: {} }
  if (form) init.body = form
  else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }
  let res
  try {
    res = await fetch(BASE + path, init)
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0)
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    let msg = data?.detail || 'Something went wrong'
    if (Array.isArray(msg)) msg = msg.map((e) => `${(e.loc || []).slice(1).join('.')}: ${e.msg}`.replace(/^: /, '')).join(' · ')
    throw new ApiError(msg, res.status)
  }
  return data
}

const qs = (params = {}) => {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => v !== '' && v != null && p.set(k, v))
  const s = p.toString()
  return s ? '?' + s : ''
}

export const api = {
  dashboard: () => request('/api/dashboard'),
  members: (params) => request('/api/members' + qs(params)),
  member: (id) => request(`/api/members/${id}`),
  createMember: (body) => request('/api/members', { method: 'POST', body }),
  updateMember: (id, body) => request(`/api/members/${id}`, { method: 'PUT', body }),
  deleteMember: (id) => request(`/api/members/${id}`, { method: 'DELETE' }),
  uploadPhoto: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return request(`/api/members/${id}/photo`, { method: 'POST', form })
  },
  deletePhoto: (id) => request(`/api/members/${id}/photo`, { method: 'DELETE' }),
  recordPayment: (id, body) => request(`/api/members/${id}/payments`, { method: 'POST', body }),
  renew: (id, body) => request(`/api/members/${id}/renew`, { method: 'POST', body }),
  fees: () => request('/api/fees'),
  plans: () => request('/api/plans'),
  createPlan: (body) => request('/api/plans', { method: 'POST', body }),
  updatePlan: (id, body) => request(`/api/plans/${id}`, { method: 'PUT', body }),
  deletePlan: (id) => request(`/api/plans/${id}`, { method: 'DELETE' }),
  settings: () => request('/api/settings'),
  saveSettings: (body) => request('/api/settings', { method: 'PUT', body }),
  templates: () => request('/api/reminders/templates'),
  audience: (kind) => request('/api/reminders/audience' + qs({ kind })),
  logReminders: (body) => request('/api/reminders/log', { method: 'POST', body }),
  reminderHistory: () => request('/api/reminders/history'),
  demoRequest: (body) => request('/api/demo-requests', { method: 'POST', body }),
}
