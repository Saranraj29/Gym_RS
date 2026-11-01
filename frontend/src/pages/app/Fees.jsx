import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Banknote, CheckCircle2, MessageCircle, Wallet } from 'lucide-react'
import { api } from '../../api'
import { useFetch } from '../../hooks'
import { useApp } from '../../context'
import { Avatar, Empty, ErrorBanner, Modal, Skeleton, StatusChip, useToast } from '../../components/ui'
import { MODES, fillTemplate, fmtDate, inr, todayISO, waLink } from '../../utils'
import { sendOne } from '../../reminders'

export default function Fees() {
  const { settings, templates, locParam, locationId } = useApp()
  const { data, loading, error, reload } = useFetch(() => api.fees(locParam), [locParam])
  const toast = useToast()
  const nav = useNavigate()
  const [target, setTarget] = useState(null)
  const [f, setF] = useState({ amount: '', mode: 'UPI', date: todayISO(), receipt: true })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const sum = data?.summary
  const items = data?.items || []
  const open = (m) => { setTarget(m); setErr(''); setF({ amount: String(m.balance), mode: 'UPI', date: todayISO(), receipt: true }) }

  const save = async (e) => {
    e.preventDefault()
    const n = Number(f.amount) || 0
    if (n <= 0 || n > target.balance) return setErr(`Enter an amount between ₹1 and ${inr(target.balance)}`)
    setBusy(true); setErr('')
    const win = f.receipt ? window.open('about:blank', '_blank') : null
    try {
      const res = await api.recordPayment(target.id, { amount: n, mode: f.mode, paid_on: f.date })
      if (win) {
        const text = fillTemplate(templates?.en?.receipt || '', { name: target.name, plan: target.plan_name, amount: n.toLocaleString('en-IN'), gym: settings.gym_name })
        win.location.href = waLink(target.phone, settings.country_code, text)
        api.logReminders({ member_ids: [target.id], kind: 'receipt', message: text }).catch(() => {})
      }
      toast.success(`${inr(n)} collected from ${target.name} · ${res.receipt}`)
      setTarget(null); reload()
    } catch (e2) { win?.close(); setErr(e2.message) }
    setBusy(false)
  }

  const modeTotal = sum ? Object.values(sum.by_mode).reduce((a, b) => a + b, 0) : 0
  const modeText = sum && modeTotal ? Object.entries(sum.by_mode).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round((v / modeTotal) * 100)}%`).join(' · ') : 'No payments in the last 30 days'

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Fees</h1><p>Who still has to pay, and how much</p></div>
        <div className="actions">
          <button className="btn btn-wa" disabled={!items.length} onClick={() => nav('/app/reminders?kind=fee')}><MessageCircle /> Remind all {items.length || ''} on WhatsApp</button>
        </div>
      </div>
      <ErrorBanner error={error} onRetry={reload} />

      <section className="grid cols-3">
        <div className="card kpi hero-kpi">
          <div className="kpi-top"><span>Total pending</span><span className="kpi-ico"><Wallet size={20} /></span></div>
          <div className="kpi-val num">{sum ? inr(sum.total_pending) : '…'}</div>
          <div className="kpi-sub">{sum?.pending_count ?? 0} members</div>
        </div>
        <div className="card kpi">
          <div className="kpi-top"><span>Part-paid (balance due)</span><span className="kpi-ico amber"><Banknote size={20} /></span></div>
          <div className="kpi-val num">{sum?.part_paid_count ?? '…'}</div>
          <div className="kpi-sub">members have paid something</div>
        </div>
        <div className="card kpi">
          <div className="kpi-top"><span>Collected · last 30 days</span><span className="kpi-ico green"><CheckCircle2 size={20} /></span></div>
          <div className="kpi-val num">{sum ? inr(sum.collected_30d) : '…'}</div>
          <div className="kpi-sub">{modeText}</div>
        </div>
      </section>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div className="card-head"><h2>Pending list</h2><small style={{ color: 'var(--faint)' }}>Sorted by biggest balance</small></div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="table">
            <thead><tr><th>Member</th><th>Total</th><th>Paid</th><th>Balance</th><th>Since</th><th className="right">Actions</th></tr></thead>
            <tbody>
              {loading && !data && [...Array(5)].map((_, i) => <tr key={i}><td colSpan={6}><Skeleton h={40} /></td></tr>)}
              {items.map((m) => (
                <tr key={m.id}>
                  <td>
                    <Link to={`/app/members/${m.id}`} className="person">
                      <Avatar name={m.name} src={m.photo_url} size={40} />
                      <span className="meta"><span className="nm">{m.name}</span><span className="sub">{m.plan_name}{m.status === 'expired' ? ' · expired' : m.status === 'inactive' ? ' · inactive' : ''}{locationId === 'all' && m.location_name ? ` · ${m.location_name}` : ''}</span></span>
                    </Link>
                  </td>
                  <td className="num">{inr(m.fee_total)}</td>
                  <td className="num">{inr(m.paid)}</td>
                  <td><b className="amount-bad">{inr(m.balance)}</b></td>
                  <td className="num">{fmtDate(m.since, false)}</td>
                  <td className="right" style={{ whiteSpace: 'nowrap' }}><span className="row-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => open(m)}>Collect</button>
                    <button className="btn btn-wa btn-icon" aria-label={`Remind ${m.name} on WhatsApp`} onClick={() => sendOne({ member: m, kind: 'fee', templates, settings }).then(() => toast.success(`WhatsApp opened for ${m.name}`))}><MessageCircle size={18} /></button>
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && items.length === 0 && <Empty icon={CheckCircle2} title="Nothing pending">Every member is fully paid up. 🎉</Empty>}
        </div>
      </section>

      <Modal open={!!target} onClose={() => setTarget(null)} title={target ? `Collect from ${target.name}` : ''}
        footer={<><button className="btn btn-ghost" type="button" onClick={() => setTarget(null)}>Cancel</button><button form="fee-form" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save payment'}</button></>}>
        {target && (
          <form id="fee-form" onSubmit={save} style={{ display: 'grid', gap: 16 }}>
            <div className="banner info">{target.plan_name} · balance <b>&nbsp;{inr(target.balance)}</b></div>
            <div className="form-grid">
              <div className="field"><label htmlFor="f-amt">Amount (₹)</label><input id="f-amt" className="input num" inputMode="numeric" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, '') })} /></div>
              <div className="field"><label htmlFor="f-date">Payment date</label><input id="f-date" type="date" className="input" value={f.date} max={todayISO()} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            </div>
            <div className="field"><span className="label">Paid by</span>
              <div className="pill-row" role="group" aria-label="Paid by">{MODES.map((m) => <button key={m} type="button" className="pill" aria-pressed={f.mode === m} onClick={() => setF({ ...f, mode: m })}>{m}</button>)}</div></div>
            <label className="toggle-row"><span><b>Send receipt on WhatsApp</b><small>Opens WhatsApp with a thank-you message</small></span>
              <span className="switch"><input type="checkbox" checked={f.receipt} onChange={(e) => setF({ ...f, receipt: e.target.checked })} /><i /></span></label>
            {err && <div className="banner error" role="alert">{err}</div>}
          </form>
        )}
      </Modal>
    </div>
  )
}
