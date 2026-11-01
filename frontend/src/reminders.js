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
  if (m.status === 'expired' || m.status === 'inactive') return 'expired'
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

/** True when "Fully automatic" is selected in settings AND the backend has WhatsApp credentials. */
export const apiMode = (settings) => settings?.reminder_method === 'api' && !!settings?.whatsapp_api_available

/** Send one reminder: through the WhatsApp API in automatic mode, otherwise open the chat (one-click mode). */
export async function sendOne({ member, kind, lang = 'en', templates, settings }) {
  if (apiMode(settings)) {
    try {
      const res = await api.sendReminders({ member_ids: [member.id], kind, lang: settings.reminder_language || lang })
      const r = res.results[0]
      return { mode: 'api', ok: r.ok, error: r.error }
    } catch (e) {
      return { mode: 'api', ok: false, error: e.message }
    }
  }
  const text = messageFor(templates, lang, kind, member, settings.gym_name)
  window.open(waLink(member.phone, settings.country_code, text), '_blank')
  try {
    await api.logReminders({ member_ids: [member.id], kind, lang, message: text })
  } catch {
    /* logging is best-effort */
  }
  return { mode: 'click', ok: true }
}

export function sentToast(toast, member, res) {
  if (res.mode === 'api') {
    if (res.ok) toast.success(`Sent to ${member.name} on WhatsApp`)
    else toast.error(`${member.name}: ${res.error || 'could not send'}`)
  } else {
    toast.success(`WhatsApp opened for ${member.name}`)
  }
}

/** Welcome / receipt messages after saving something. `win` is a pre-opened tab (one-click mode only). */
export async function notifyAfterSave({ settings, templates, member, kind, text, win, toast }) {
  if (apiMode(settings)) {
    const res = await sendOne({ member, kind, templates, settings })
    if (!res.ok) toast.error(`Saved, but the WhatsApp message failed: ${res.error}`)
    return
  }
  if (win) {
    win.location.href = waLink(member.phone, settings.country_code, text)
    api.logReminders({ member_ids: [member.id], kind, message: text }).catch(() => {})
  }
}
