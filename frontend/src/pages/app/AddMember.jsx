import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, MessageCircle } from 'lucide-react'
import { api } from '../../api'
import { useFetch } from '../../hooks'
import { useApp } from '../../context'
import { ErrorBanner, PhotoPicker, useToast } from '../../components/ui'
import { MODES, fillTemplate, fmtDate, inr, todayISO, waLink } from '../../utils'

const BATCHES = ['6 – 7 AM', '7 – 8 AM', '6 – 7 PM', '7 – 8 PM']

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  const p = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export default function AddMember() {
  const nav = useNavigate()
  const toast = useToast()
  const { settings, templates } = useApp()
  const plans = useFetch(() => api.plans(), [])
  const [f, setF] = useState({ name: '', phone: '', gender: '', dob: '', batch: '', trainer: '', emergency_name: '', emergency_phone: '', join_date: todayISO() })
  const [photo, setPhoto] = useState(null)
  const [planId, setPlanId] = useState(null)
  const [paid, setPaid] = useState(null)
  const [mode, setMode] = useState('UPI')
  const [welcome, setWelcome] = useState(true)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [serverErr, setServerErr] = useState(null)

  const list = plans.data || []
  const plan = list.find((p) => p.id === planId) || list[1] || list[0]
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }) }
  const paidNum = paid === null ? plan?.price || 0 : Number(paid) || 0
  const balance = plan ? Math.max(0, plan.price - paidNum) : 0
  const endDate = plan ? addDays(f.join_date, plan.duration_days - 1) : null

  const validate = () => {
    const e = {}
    if (f.name.trim().length < 2) e.name = 'Enter the member’s full name'
    if (f.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit WhatsApp number'
    if (!plan) e.plan = 'Choose a plan'
    if (plan && paidNum > plan.price) e.paid = `Can’t be more than the plan fee (${inr(plan.price)})`
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (ev) => {
    ev.preventDefault()
    if (!validate()) {
      document.querySelector('[aria-invalid="true"]')?.focus()
      return
    }
    setBusy(true); setServerErr(null)
    const win = welcome ? window.open('about:blank', '_blank') : null
    try {
      const body = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === '' ? null : v]))
      const m = await api.createMember({ ...body, plan_id: plan.id, paid_amount: paidNum, payment_mode: mode })
      if (photo) await api.uploadPhoto(m.id, photo).catch(() => toast.error('Member saved, but the photo could not be uploaded'))
      if (win) {
        const text = fillTemplate(templates?.en?.welcome || '', { name: m.name, plan: plan.name, date: fmtDate(m.end_date, false), gym: settings.gym_name })
        win.location.href = waLink(m.phone, settings.country_code, text)
        api.logReminders({ member_ids: [m.id], kind: 'welcome', message: text }).catch(() => {})
      }
      toast.success(`${m.name} added`)
      nav(`/app/members/${m.id}`)
    } catch (err) {
      win?.close()
      setServerErr(err); setBusy(false)
    }
  }

  return (
    <div className="page">
      <div>
        <Link to="/app/members" className="crumb"><ArrowLeft /> All members</Link>
        <div className="page-head"><div><h1>Add member</h1><p>Takes under a minute. Only name, number and plan are required.</p></div></div>
      </div>
      <ErrorBanner error={serverErr} />
      <form className="form-layout" onSubmit={submit} noValidate>
        <div className="stack">
          <section className="card form-sec">
            <h2>Personal details</h2>
            <PhotoPicker onChange={setPhoto} />
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="a-name">Full name</label>
                <input id="a-name" className={'input' + (errors.name ? ' invalid' : '')} aria-invalid={!!errors.name} value={f.name} onChange={set('name')} placeholder="e.g. Karthik Raja" autoComplete="off" />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>
              <div className="field">
                <label htmlFor="a-phone">WhatsApp number</label>
                <div className="input-prefix"><span>+{settings.country_code}</span><input id="a-phone" className="input" aria-invalid={!!errors.phone} inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="98765 43210" autoComplete="off" /></div>
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>
              <div className="field"><label htmlFor="a-gender">Gender</label>
                <select id="a-gender" className="select" value={f.gender} onChange={set('gender')}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
              <div className="field"><label htmlFor="a-dob">Date of birth</label><input id="a-dob" type="date" className="input" value={f.dob} max={todayISO()} onChange={set('dob')} /></div>
              <div className="field"><label htmlFor="a-batch">Batch time</label>
                <select id="a-batch" className="select" value={f.batch} onChange={set('batch')}><option value="">Select</option>{BATCHES.map((b) => <option key={b}>{b}</option>)}</select></div>
              <div className="field"><label htmlFor="a-en">Emergency contact name</label><input id="a-en" className="input" value={f.emergency_name} onChange={set('emergency_name')} /></div>
              <div className="field"><label htmlFor="a-ep">Emergency contact phone</label><input id="a-ep" className="input" inputMode="tel" value={f.emergency_phone} onChange={set('emergency_phone')} /></div>
            </div>
          </section>

          <section className="card form-sec">
            <h2>Plan &amp; payment</h2>
            <div className="plan-grid" role="group" aria-label="Plan">
              {list.map((p) => (
                <button type="button" key={p.id} className="plan-opt" aria-pressed={plan?.id === p.id} onClick={() => { setPlanId(p.id); setPaid(null) }}>
                  <span className="tick"><Check size={13} strokeWidth={3.5} /></span>
                  <b>{p.name}</b><span className="pr num">{inr(p.price)}</span><small>{p.duration_days} days</small>
                </button>
              ))}
            </div>
            {errors.plan && <span className="error-text">{errors.plan}</span>}
            <div className="form-grid">
              <div className="field"><label htmlFor="a-join">Join date</label><input id="a-join" type="date" className="input" value={f.join_date} onChange={set('join_date')} /></div>
              <div className="field">
                <label htmlFor="a-paid">Paying now (₹)</label>
                <input id="a-paid" className={'input num' + (errors.paid ? ' invalid' : '')} aria-invalid={!!errors.paid} inputMode="numeric" value={paid === null ? String(paidNum) : paid} onChange={(e) => { setPaid(e.target.value.replace(/\D/g, '')); setErrors({ ...errors, paid: undefined }) }} />
                {errors.paid && <span className="error-text">{errors.paid}</span>}
              </div>
              <div className="field full"><span className="label">Paid by</span>
                <div className="pill-row" role="group" aria-label="Paid by">{MODES.map((m) => <button key={m} type="button" className="pill" aria-pressed={mode === m} onClick={() => setMode(m)}>{m}</button>)}</div></div>
            </div>
          </section>
        </div>

        <aside className="summary" aria-label="Summary">
          <h2>Summary</h2>
          <div>
            <div className="stat-line"><span>Plan</span><b>{plan?.name || '—'}</b></div>
            <div className="stat-line"><span>Starts</span><b>{fmtDate(f.join_date)}</b></div>
            <div className="stat-line"><span>Ends</span><b>{endDate ? fmtDate(endDate) : '—'}</b></div>
            <div className="stat-line"><span>Plan fee</span><b className="num">{plan ? inr(plan.price) : '—'}</b></div>
            <div className="stat-line"><span>Paying now</span><b className="num">{inr(paidNum)}</b></div>
            <div className="stat-line"><span>Balance</span><b className={'num ' + (balance > 0 ? 'pending' : 'ok')}>{balance > 0 ? `${inr(balance)} pending` : 'Fully paid'}</b></div>
          </div>
          <label className="toggle-row light">
            <span><b><MessageCircle size={15} style={{ verticalAlign: -2 }} /> Welcome message</b><small>Open WhatsApp after saving</small></span>
            <span className="switch"><input type="checkbox" checked={welcome} onChange={(e) => setWelcome(e.target.checked)} /><i /></span>
          </label>
          <button className="btn btn-lg btn-white" disabled={busy}>{busy ? 'Saving…' : 'Save member'}</button>
          <Link to="/app/members" className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.25)' }}>Cancel</Link>
        </aside>
      </form>
    </div>
  )
}
