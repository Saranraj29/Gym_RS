import { api } from './api'
import { fillTemplate, fmtDate, waLink } from './utils'

/** Open a blank tab synchronously inside the click handler so popup blockers allow it;
 *  navigate it once async work (saving, logging) has finished. */
export function openPendingTab() {
  const w = window.open('about:blank', '_blank')
  return {
    go(url) {
      if (w) w.location.href = url
      else window.open(url, '_blank')
    },
    close() {
      w?.close()
    },
  }
}

export function kindFor(m) {
  if (m.status === 'expired') return 'expired'
  if (m.status === 'due') return 'renewal'
  if (m.balance > 0) return 'fee'
  return 'renewal'
}

export function varsFor(m, gym) {
  return {
    name: m.name,
    plan: m.plan_name || '',
    date: fmtDate(m.end_date, false),
    amount: Number(m.balance || 0).toLocaleString('en-IN'),
    gym,
  }
}

export function messageFor(templates, lang, kind, m, gym) {
  return fillTemplate(templates?.[lang]?.[kind] || '', varsFor(m, gym))
}

/** One-click WhatsApp reminder for a single member: opens the chat and records it in the log. */
export async function sendOne({ member, kind, lang = 'en', templates, settings }) {
  const text = messageFor(templates, lang, kind, member, settings.gym_name)
  window.open(waLink(member.phone, settings.country_code, text), '_blank')
  try {
    await api.logReminders({ member_ids: [member.id], kind, lang, message: text })
  } catch {
    /* logging is best-effort */
  }
}
