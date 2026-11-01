export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function fmtDate(iso, withYear = true) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}${withYear ? ' ' + y : ''}`
}

export function todayISO() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function longDate(d = new Date()) {
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function initials(name = '') {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

const HUES = [262, 280, 300, 330, 210, 190, 160, 24]
export function avatarGradient(name = '') {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const hue = HUES[h % HUES.length]
  return `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 38%))`
}

export const STATUS = {
  active: { label: 'Active', tone: 'ok' },
  due: { label: 'Renewal due', tone: 'warn' },
  expired: { label: 'Expired', tone: 'bad' },
}

export function daysLabel(n) {
  if (n == null) return ''
  if (n < 0) return `${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} ago`
  if (n === 0) return 'Today'
  return `${n} day${n === 1 ? '' : 's'}`
}

export function fillTemplate(tpl, vars) {
  return tpl.replace(/\{(name|plan|date|amount|gym)\}/g, (_, k) => vars[k] ?? '')
}

export function waLink(phone, countryCode = '91', text = '') {
  let digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 10) digits = countryCode + digits
  return `https://wa.me/${digits}${text ? '?text=' + encodeURIComponent(text) : ''}`
}

export const MODES = ['Cash', 'UPI', 'Card', 'Bank transfer']
