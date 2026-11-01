import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, MessageCircle, Send } from 'lucide-react'
import { api } from '../../api'
import { useFetch } from '../../hooks'
import { useApp } from '../../context'
import { Avatar, Empty, ErrorBanner, Skeleton, useToast } from '../../components/ui'
import { fillTemplate, fmtDate, waLink } from '../../utils'

const KINDS = [
  { id: 'renewal', label: 'Renewal due', hint: 'Ends within 7 days' },
  { id: 'fee', label: 'Fee pending', hint: 'Balance not yet paid' },
  { id: 'expired', label: 'Expired', hint: 'Plan ended, not renewed' },
]
const HISTORY_LABEL = { renewal: 'Renewal due', fee: 'Fee pending', expired: 'Expired', welcome: 'Welcome', receipt: 'Receipt' }

export default function Reminders() {
  const [params, setParams] = useSearchParams()
  const kind = KINDS.some((k) => k.id === params.get('kind')) ? params.get('kind') : 'renewal'
  const { settings, templates } = useApp()
  const toast = useToast()

  const aud = useFetch(() => Promise.all(KINDS.map((k) => api.audience(k.id))), [])
  const history = useFetch(() => api.reminderHistory(), [])
  const [lang, setLang] = useState('en')
  const [edits, setEdits] = useState({})
  const [picked, setPicked] = useState({})
  const [sent, setSent] = useState({})

  const lists = useMemo(() => Object.fromEntries(KINDS.map((k, i) => [k.id, aud.data?.[i]?.members || []])), [aud.data])
  const people = lists[kind]
  const selected = people.filter((p) => picked[kind + p.id] !== false)
  const tplKey = `${lang}:${kind}`
  const template = edits[tplKey] ?? templates?.[lang]?.[kind] ?? ''
  const gym = settings.gym_name

  useEffect(() => { setSent({}) }, [kind])

  const textFor = (p) => fillTemplate(template, { name: p.name, plan: p.plan, date: p.date, amount: p.amount, gym })
  const pending = selected.filter((p) => !sent[kind + p.id])
  const preview = selected[0] || people[0]

  const send = (p) => {
    const text = textFor(p)
    window.open(waLink(p.phone, settings.country_code, text), '_blank')
    setSent((s) => ({ ...s, [kind + p.id]: true }))
    api.logReminders({ member_ids: [p.id], kind, lang, message: text }).then(() => history.reload()).catch(() => {})
  }
  const sendNext = () => {
    if (!pending.length) return toast.success('All selected reminders have been opened')
    send(pending[0])
  }
  const toggleAll = (on) => setPicked({ ...picked, ...Object.fromEntries(people.map((p) => [kind + p.id, on])) })

  return (
    <div className="page">
      <div className="page-head"><div><h1>WhatsApp reminders</h1><p>Pick who to remind, check the message, send.</p></div></div>
      <ErrorBanner error={aud.error} onRetry={aud.reload} />

      <div className="split">
        <div className="stack">
          <section aria-label="Who to remind">
            <h2 style={{ fontSize: 17, marginBottom: 12 }}>1. Who to remind</h2>
            <div className="audience">
              {KINDS.map((k) => (
                <button key={k.id} className="aud" aria-pressed={kind === k.id} onClick={() => setParams({ kind: k.id }, { replace: true })}>
                  <span className="n num">{aud.loading ? '–' : lists[k.id].length}</span>
                  <b>{k.label}</b><span>{k.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card" style={{ overflow: 'hidden' }}>
            <div className="card-head">
              <h2>Members <small style={{ color: 'var(--faint)', fontWeight: 600 }}>· {selected.length} of {people.length} selected</small></h2>
              <span style={{ display: 'flex', gap: 14 }}>
                <button className="link" onClick={() => toggleAll(true)}>Select all</button>
                <button className="link" onClick={() => toggleAll(false)}>Clear</button>
              </span>
            </div>
            <div style={{ marginTop: 12 }}>
              {aud.loading && <div style={{ padding: 20, display: 'grid', gap: 12 }}>{[0, 1, 2].map((i) => <Skeleton key={i} h={44} />)}</div>}
              {!aud.loading && people.length === 0 && <Empty icon={Check} title="Nobody to remind here">Great — this list is empty right now.</Empty>}
              {people.map((p) => {
                const done = sent[kind + p.id]
                return (
                  <div key={p.id} className={'recipient' + (done ? ' sent' : '')}>
                    <input type="checkbox" id={`r-${kind}-${p.id}`} checked={picked[kind + p.id] !== false} onChange={(e) => setPicked({ ...picked, [kind + p.id]: e.target.checked })} aria-label={`Select ${p.name}`} />
                    <div className="person">
                      <Avatar name={p.name} src={p.photo_url} size={40} />
                      <span className="meta"><span className="nm">{p.name}</span><span className="sub">{p.plan}{p.date && kind !== 'fee' ? ` · ${kind === 'expired' ? 'ended' : 'ends'} ${p.date}` : ''}</span></span>
                    </div>
                    <span className={'chip ' + (kind === 'renewal' ? 'warn' : 'bad')}>{p.tag}</span>
                    <button className={'btn btn-sm ' + (done ? 'btn-ghost' : 'btn-wa')} onClick={() => send(p)} aria-label={`Send to ${p.name}`}>
                      {done ? <><Check /> Opened</> : <><MessageCircle /> Send</>}
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card form-sec" aria-label="Message">
            <h2>2. Message</h2>
            <div className="segmented" role="group" aria-label="Language">
              <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>English</button>
              <button aria-pressed={lang === 'ta'} onClick={() => setLang('ta')}>தமிழ்</button>
            </div>
            <div className="field">
              <label htmlFor="tpl">Template</label>
              <textarea id="tpl" className="textarea" style={{ minHeight: 150 }} value={template} onChange={(e) => setEdits({ ...edits, [tplKey]: e.target.value })} />
              <span className="vars" aria-label="Variables"><code>{'{name}'}</code><code>{'{plan}'}</code><code>{'{date}'}</code><code>{'{amount}'}</code><code>{'{gym}'}</code></span>
            </div>
            <div className="wa-preview">
              <small>Preview · to {preview?.name || '—'}</small>
              <div className="bubble">{preview ? textFor(preview) : 'Pick a member to preview the message.'}</div>
            </div>
            <button className="btn btn-wa btn-lg" disabled={!selected.length} onClick={sendNext}>
              <Send /> {pending.length ? `Send next (${pending.length} left)` : selected.length ? 'All opened ✓' : 'Select members'}
            </button>
            <p style={{ fontSize: 13, color: 'var(--faint)' }}>One-click mode: each press opens WhatsApp with the message ready — you just press send there.</p>
          </section>
        </div>
      </div>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="card-head"><h2>Recently sent</h2></div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead><tr><th>Date</th><th>Type</th><th>Sent</th><th>Paid / renewed after</th></tr></thead>
            <tbody>
              {(history.data || []).map((h) => (
                <tr key={h.date + h.kind}><td className="num">{fmtDate(h.date)}</td><td>{HISTORY_LABEL[h.kind] || h.kind}</td><td className="num">{h.sent}</td><td className="num">{h.paid_after}</td></tr>
              ))}
            </tbody>
          </table>
          {history.data?.length === 0 && <Empty title="Nothing sent yet">Reminders you send will be listed here.</Empty>}
        </div>
      </section>
    </div>
  )
}
