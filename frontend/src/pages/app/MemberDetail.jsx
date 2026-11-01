import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, CreditCard, MessageCircle, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { api } from '../../api'
import { useFetch } from '../../hooks'
import { useApp } from '../../context'
import { Avatar, Empty, ErrorBanner, Modal, Skeleton, StatusChip, downscale, useToast } from '../../components/ui'
import { MODES, daysLabel, fmtDate, inr, todayISO, waLink, fillTemplate } from '../../utils'
import { kindFor, messageFor, sendOne } from '../../reminders'

function ModePills({ value, onChange }) {
  return (
    <div className="pill-row" role="group" aria-label="Paid by">
      {MODES.map((m) => <button key={m} type="button" className="pill" aria-pressed={value === m} onClick={() => onChange(m)}>{m}</button>)}
    </div>
  )
}

function PaymentModal({ member, onClose, onDone }) {
  const { settings, templates } = useApp()
  const toast = useToast()
  const [amount, setAmount] = useState(String(member.balance))
  const [mode, setMode] = useState('UPI')
  const [date, setDate] = useState(todayISO())
  const [receipt, setReceipt] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const n = Number(amount) || 0

  const submit = async (e) => {
    e.preventDefault()
    if (n <= 0) return setErr('Enter an amount greater than 0')
    if (n > member.balance) return setErr(`Amount can’t be more than the pending ${inr(member.balance)}`)
    setBusy(true); setErr('')
    const win = receipt ? window.open('about:blank', '_blank') : null
    try {
      const res = await api.recordPayment(member.id, { amount: n, mode, paid_on: date })
      if (win) {
        const text = fillTemplate(templates?.[settings.lang || 'en']?.receipt || '', { name: member.name, plan: member.plan_name, amount: n.toLocaleString('en-IN'), gym: settings.gym_name })
        win.location.href = waLink(member.phone, settings.country_code, text)
        api.logReminders({ member_ids: [member.id], kind: 'receipt', message: text }).catch(() => {})
      }
      toast.success(`Payment of ${inr(n)} recorded · ${res.receipt}`)
      onDone()
    } catch (e2) {
      win?.close()
      setErr(e2.message); setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={`Collect from ${member.name}`}
      footer={<><button className="btn btn-ghost" onClick={onClose} type="button">Cancel</button><button form="pay-form" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save payment'}</button></>}>
      <form id="pay-form" onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <div className="banner info">Pending balance: <b>&nbsp;{inr(member.balance)}</b></div>
        <div className="form-grid">
          <div className="field"><label htmlFor="p-amt">Amount (₹)</label><input id="p-amt" className="input num" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} /></div>
          <div className="field"><label htmlFor="p-date">Payment date</label><input id="p-date" type="date" className="input" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} /></div>
        </div>
        <div className="field"><span className="label">Paid by</span><ModePills value={mode} onChange={setMode} /></div>
        <label className="toggle-row">
          <span><b>Send receipt on WhatsApp</b><small>Opens WhatsApp with a thank-you message</small></span>
          <span className="switch"><input type="checkbox" checked={receipt} onChange={(e) => setReceipt(e.target.checked)} /><i /></span>
        </label>
        {err && <div className="banner error" role="alert">{err}</div>}
      </form>
    </Modal>
  )
}

function RenewModal({ member, onClose, onDone }) {
  const toast = useToast()
  const plans = useFetch(() => api.plans(), [])
  const [planId, setPlanId] = useState(null)
  const [paid, setPaid] = useState('')
  const [mode, setMode] = useState('UPI')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const list = plans.data || []
  const plan = list.find((p) => p.id === planId) || list.find((p) => p.name === member.plan_name) || list[0]

  const pick = (p) => { setPlanId(p.id); setPaid(String(p.price)) }
  const effectivePaid = paid === '' && plan ? plan.price : Number(paid) || 0
  const start = member.end_date && member.days_left >= 0 ? 'after the current period ends' : 'today'

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      await api.renew(member.id, { plan_id: plan.id, paid_amount: Math.min(effectivePaid, plan.price), mode })
      toast.success(`${member.name} renewed on the ${plan.name} plan`)
      onDone()
    } catch (e2) { setErr(e2.message); setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={`Renew ${member.name}`} width={640}
      footer={<><button className="btn btn-ghost" onClick={onClose} type="button">Cancel</button><button form="renew-form" className="btn btn-primary" disabled={busy || !plan}>{busy ? 'Renewing…' : 'Renew plan'}</button></>}>
      <form id="renew-form" onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <div className="plan-grid">
          {list.map((p) => (
            <button type="button" key={p.id} className="plan-opt" aria-pressed={plan?.id === p.id} onClick={() => pick(p)}>
              <b>{p.name}</b><span className="pr num">{inr(p.price)}</span><small>{p.duration_days} days</small>
            </button>
          ))}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>The new period starts {start}.</p>
        <div className="field"><label htmlFor="r-paid">Paying now (₹)</label><input id="r-paid" className="input num" inputMode="numeric" value={paid === '' && plan ? String(plan.price) : paid} onChange={(e) => setPaid(e.target.value.replace(/\D/g, ''))} /></div>
        <div className="field"><span className="label">Paid by</span><ModePills value={mode} onChange={setMode} /></div>
        {err && <div className="banner error" role="alert">{err}</div>}
      </form>
    </Modal>
  )
}

function EditModal({ member, onClose, onDone }) {
  const toast = useToast()
  const [f, setF] = useState({
    name: member.name, phone: member.phone, gender: member.gender || '', dob: member.dob || '', batch: member.batch || '', trainer: member.trainer || '',
    emergency_name: member.emergency_name || '', emergency_phone: member.emergency_phone || '', notes: member.notes || '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const body = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === '' ? null : v]))
    try { await api.updateMember(member.id, body); toast.success('Details updated'); onDone() } catch (e2) { setErr(e2.message); setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title="Edit member" width={640}
      footer={<><button className="btn btn-ghost" onClick={onClose} type="button">Cancel</button><button form="edit-form" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></>}>
      <form id="edit-form" onSubmit={submit} className="form-grid">
        <div className="field"><label htmlFor="e-name">Full name</label><input id="e-name" className="input" required value={f.name} onChange={set('name')} /></div>
        <div className="field"><label htmlFor="e-phone">WhatsApp number</label><input id="e-phone" className="input" required inputMode="tel" value={f.phone} onChange={set('phone')} /></div>
        <div className="field"><label htmlFor="e-gender">Gender</label>
          <select id="e-gender" className="select" value={f.gender} onChange={set('gender')}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
        <div className="field"><label htmlFor="e-dob">Date of birth</label><input id="e-dob" type="date" className="input" value={f.dob} onChange={set('dob')} /></div>
        <div className="field"><label htmlFor="e-batch">Batch time</label>
          <select id="e-batch" className="select" value={f.batch} onChange={set('batch')}><option value="">Select</option>{['6 – 7 AM', '7 – 8 AM', '6 – 7 PM', '7 – 8 PM'].map((b) => <option key={b}>{b}</option>)}</select></div>
        <div className="field"><label htmlFor="e-trainer">Trainer</label><input id="e-trainer" className="input" value={f.trainer} onChange={set('trainer')} /></div>
        <div className="field"><label htmlFor="e-en">Emergency contact name</label><input id="e-en" className="input" value={f.emergency_name} onChange={set('emergency_name')} /></div>
        <div className="field"><label htmlFor="e-ep">Emergency contact phone</label><input id="e-ep" className="input" inputMode="tel" value={f.emergency_phone} onChange={set('emergency_phone')} /></div>
        <div className="field full"><label htmlFor="e-notes">Notes</label><textarea id="e-notes" className="textarea" value={f.notes} onChange={set('notes')} placeholder="Injuries, goals, anything staff should know" /></div>
        {err && <div className="banner error full" role="alert">{err}</div>}
      </form>
    </Modal>
  )
}

export default function MemberDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { settings, templates } = useApp()
  const { data: m, loading, error, reload } = useFetch(() => api.member(id), [id])
  const [modal, setModal] = useState(null)
  const [uploading, setUploading] = useState(false)

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      await api.uploadPhoto(m.id, await downscale(file))
      toast.success('Photo updated')
      reload()
    } catch (err) { toast.error(err.message) }
    setUploading(false)
  }
  const removePhoto = async () => { await api.deletePhoto(m.id); toast.success('Photo removed'); reload() }
  const del = async () => { await api.deleteMember(m.id); toast.success(`${m.name} deleted`); nav('/app/members') }
  const done = () => { setModal(null); reload() }

  if (error) return <div className="page"><Link to="/app/members" className="crumb"><ArrowLeft /> All members</Link><ErrorBanner error={error} onRetry={reload} /></div>
  if (loading || !m) return <div className="page"><Skeleton h={180} r={16} /><div className="split"><Skeleton h={260} r={16} /><Skeleton h={260} r={16} /></div></div>

  const cm = m.current_membership
  const pct = cm ? Math.round((cm.days_used / cm.total_days) * 100) : 0
  const kind = kindFor(m)
  const preview = messageFor(templates, 'en', kind, m, settings.gym_name)

  return (
    <div className="page">
      <div>
        <Link to="/app/members" className="crumb"><ArrowLeft /> All members</Link>
        <section className="card profile">
          <div className="profile-photo">
            <Avatar name={m.name} src={m.photo_url} size={132} />
            <label className="photo-edit" title="Change photo">
              <Camera size={18} /><span className="sr-only">{uploading ? 'Uploading photo' : 'Change photo'}</span>
              <input type="file" accept="image/*" onChange={onPhoto} disabled={uploading} aria-label="Change photo" />
            </label>
          </div>
          <div className="profile-info">
            <h1>{m.name}</h1>
            <div className="meta"><span className="num">+91 {m.phone}</span><span>Member {m.code}</span><span>Joined {fmtDate(m.joined_on)}</span></div>
            <div className="chips">
              <StatusChip status={m.status} daysLeft={m.days_left} />
              {m.balance > 0 && <span className="chip bad">{inr(m.balance)} pending</span>}
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-wa" onClick={() => sendOne({ member: m, kind, templates, settings }).then(() => { toast.success('WhatsApp opened'); reload() })}><MessageCircle /> WhatsApp reminder</button>
            {m.balance > 0 && <button className="btn btn-ghost" onClick={() => setModal('pay')}><CreditCard /> Record payment</button>}
            <button className="btn btn-primary" onClick={() => setModal('renew')}><RefreshCw /> Renew plan</button>
          </div>
        </section>
      </div>

      <div className="split">
        <div className="stack">
          <div className="two-up">
            <section className="card card-body">
              <p className="label">Current plan</p>
              {cm ? (
                <>
                  <p className="big-money num" style={{ marginTop: 6 }}>{inr(cm.fee)} <span style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 600 }}>{cm.plan_name}</span></p>
                  <div style={{ margin: '14px 0' }}>
                    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Plan used"><i style={{ width: pct + '%' }} /></div>
                    <p style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 8 }}>
                      {m.days_left >= 0 ? `${m.days_left} day${m.days_left === 1 ? '' : 's'} left` : `Expired ${daysLabel(m.days_left)}`} · {cm.days_used} of {cm.total_days} days used
                    </p>
                  </div>
                  <div className="stat-line"><span>Started</span><b>{fmtDate(cm.start_date)}</b></div>
                  <div className="stat-line"><span>Ends</span><b>{fmtDate(cm.end_date)}</b></div>
                </>
              ) : <Empty title="No plan yet" />}
            </section>
            <section className="card card-body">
              <p className="label">Fee status</p>
              <div className="fee-split">
                <div><small>Total</small><b className="num">{inr(m.fee_total)}</b></div>
                <div><small>Paid</small><b className="num" style={{ color: 'var(--ok)' }}>{inr(m.paid)}</b></div>
                <div><small>Balance</small><b className="num" style={{ color: m.balance > 0 ? 'var(--bad)' : undefined }}>{inr(m.balance)}</b></div>
              </div>
              {m.balance > 0 ? <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setModal('pay')}>Collect {inr(m.balance)}</button> : <p className="chip ok plain" style={{ fontSize: 14 }}>All fees paid</p>}
            </section>
          </div>

          <section className="card">
            <div className="card-head"><h2>Payment history</h2></div>
            {m.payments.length === 0 ? <Empty title="No payments yet" /> : (
              <div className="table-wrap" style={{ marginTop: 10 }}>
                <table className="table">
                  <thead><tr><th>Paid on</th><th>For period</th><th>Mode</th><th>Receipt</th><th className="right">Amount</th></tr></thead>
                  <tbody>
                    {m.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="num">{fmtDate(p.paid_on)}</td>
                        <td>{p.plan_name ? `${p.plan_name} · ${fmtDate(p.period_start, false)} – ${fmtDate(p.period_end, false)}` : '—'}</td>
                        <td>{p.mode}</td><td className="num">{p.receipt}</td>
                        <td className="right num"><b>{inr(p.amount)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="card">
            <div className="card-head"><h2>Details</h2><button className="link" onClick={() => setModal('edit')}><Pencil size={14} /> Edit</button></div>
            <div className="card-body">
              <div className="stat-line"><span>WhatsApp</span><b className="num">{m.phone}</b></div>
              <div className="stat-line"><span>Gender</span><b>{m.gender || '—'}</b></div>
              <div className="stat-line"><span>Date of birth</span><b>{m.dob ? fmtDate(m.dob) : '—'}</b></div>
              <div className="stat-line"><span>Batch</span><b>{m.batch || '—'}</b></div>
              <div className="stat-line"><span>Trainer</span><b>{m.trainer || '—'}</b></div>
              <div className="stat-line"><span>Emergency contact</span><b>{m.emergency_name ? `${m.emergency_name} · ${m.emergency_phone || ''}` : '—'}</b></div>
              {m.notes && <div className="stat-line"><span>Notes</span><b style={{ maxWidth: 220 }}>{m.notes}</b></div>}
              {m.photo_url && <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={removePhoto}>Remove photo</button>}
            </div>
          </section>
          <section className="card">
            <div className="card-head"><h2>Reminders sent</h2></div>
            <ul className="list" style={{ marginTop: 10 }}>
              {m.reminders.length === 0 && <li><span style={{ color: 'var(--muted)' }}>No reminders sent yet</span></li>}
              {m.reminders.slice(0, 5).map((r) => (
                <li key={r.id}><span style={{ textTransform: 'capitalize' }}>{r.kind === 'fee' ? 'Fee balance' : r.kind} reminder</span><small className="num" style={{ color: 'var(--faint)' }}>{fmtDate(r.sent_on)} · WhatsApp</small></li>
              ))}
            </ul>
          </section>
          <section className="card card-body">
            <p className="label" style={{ marginBottom: 10 }}>Next message preview</p>
            <div className="wa-preview"><div className="bubble">{preview}</div></div>
          </section>
          <button className="btn btn-danger" onClick={() => setModal('delete')}><Trash2 /> Delete member</button>
        </div>
      </div>

      {modal === 'pay' && <PaymentModal member={m} onClose={() => setModal(null)} onDone={done} />}
      {modal === 'renew' && <RenewModal member={m} onClose={() => setModal(null)} onDone={done} />}
      {modal === 'edit' && <EditModal member={m} onClose={() => setModal(null)} onDone={done} />}
      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Delete this member?"
        footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-danger" onClick={del}>Delete {m.name}</button></>}>
        <p style={{ color: 'var(--muted)' }}>This permanently removes {m.name}, their photo, payments and reminder history. This can’t be undone.</p>
      </Modal>
    </div>
  )
}
