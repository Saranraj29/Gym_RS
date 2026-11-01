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
  dashboard: (location_id) => request('/api/dashboard' + qs({ location_id })),
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
  fees: (location_id) => request('/api/fees' + qs({ location_id })),
  plans: () => request('/api/plans'),
  createPlan: (body) => request('/api/plans', { method: 'POST', body }),
  updatePlan: (id, body) => request(`/api/plans/${id}`, { method: 'PUT', body }),
  deletePlan: (id) => request(`/api/plans/${id}`, { method: 'DELETE' }),
  settings: () => request('/api/settings'),
  saveSettings: (body) => request('/api/settings', { method: 'PUT', body }),
  templates: () => request('/api/reminders/templates'),
  audience: (kind, location_id) => request('/api/reminders/audience' + qs({ kind, location_id })),
  logReminders: (body) => request('/api/reminders/log', { method: 'POST', body }),
  reminderHistory: (location_id) => request('/api/reminders/history' + qs({ location_id })),
  locations: () => request('/api/locations'),
  createLocation: (body) => request('/api/locations', { method: 'POST', body }),
  updateLocation: (id, body) => request(`/api/locations/${id}`, { method: 'PUT', body }),
  deleteLocation: (id) => request(`/api/locations/${id}`, { method: 'DELETE' }),
  markInactive: (id, body) => request(`/api/members/${id}/inactive`, { method: 'POST', body }),
  reactivate: (id, body) => request(`/api/members/${id}/reactivate`, { method: 'POST', body }),
  bulkInactive: (body) => request('/api/members/bulk-inactive', { method: 'POST', body }),
}
