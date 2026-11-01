import { useEffect, useState } from 'react'
import { Database, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../api'
import { useFetch } from '../../hooks'
import { useApp } from '../../context'
import { ErrorBanner, Modal, Skeleton, useToast } from '../../components/ui'
import { inr } from '../../utils'

function PlanModal({ plan, onClose, onDone }) {
  const toast = useToast()
  const [f, setF] = useState({ name: plan?.name || '', price: String(plan?.price ?? ''), duration_days: String(plan?.duration_days ?? '') })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    const body = { name: f.name.trim(), price: Number(f.price), duration_days: Number(f.duration_days) }
    try {
      if (plan) await api.updatePlan(plan.id, body); else await api.createPlan(body)
      toast.success(plan ? 'Plan updated' : 'Plan added')
      onDone()
    } catch (e2) { setErr(e2.message); setBusy(false) }
  }
  return (
    <Modal open onClose={onClose} title={plan ? `Edit ${plan.name}` : 'New plan'}
      footer={<><button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button><button form="plan-form" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save plan'}</button></>}>
      <form id="plan-form" onSubmit={submit} className="form-grid">
        <div className="field full"><label htmlFor="pl-name">Plan name</label><input id="pl-name" className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Monthly" /></div>
        <div className="field"><label htmlFor="pl-price">Price (₹)</label><input id="pl-price" className="input num" required inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, '') })} /></div>
        <div className="field"><label htmlFor="pl-days">Duration (days)</label><input id="pl-days" className="input num" required inputMode="numeric" value={f.duration_days} onChange={(e) => setF({ ...f, duration_days: e.target.value.replace(/\D/g, '') })} /></div>
        {err && <div className="banner error full" role="alert">{err}</div>}
      </form>
    </Modal>
  )
}

export default function Settings() {
  const toast = useToast()
  const { settings, reloadSettings } = useApp()
  const plans = useFetch(() => api.plans(), [])
  const [f, setF] = useState(null)
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [del, setDel] = useState(null)

  useEffect(() => { if (settings && f === null && settings.whatsapp_number !== undefined) setF({ ...settings }) }, [settings, f])

  const save = async () => {
    setBusy(true)
    try {
      const { gym_name, whatsapp_number, address, upi_id, country_code, reminder_method, rule_before_expiry, rule_on_expiry, rule_fee_balance } = f
      await api.saveSettings({ gym_name, whatsapp_number, address, upi_id, country_code, reminder_method, rule_before_expiry, rule_on_expiry, rule_fee_balance })
      reloadSettings()
      toast.success('Settings saved')
    } catch (e) { toast.error(e.message) }
    setBusy(false)
  }
  const removePlan = async () => {
    try { await api.deletePlan(del.id); toast.success(`${del.name} removed`); setDel(null); plans.reload() } catch (e) { toast.error(e.message) }
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Plans &amp; settings</h1><p>Membership plans, gym details and how reminders go out</p></div>
        <div className="actions"><button className="btn btn-primary" onClick={save} disabled={busy || !f}>{busy ? 'Saving…' : 'Save settings'}</button></div>
      </div>
      <ErrorBanner error={plans.error} onRetry={plans.reload} />

      <section aria-label="Membership plans">
        <h2 style={{ fontSize: 17, marginBottom: 12 }}>Membership plans</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {plans.loading && !plans.data && [0, 1, 2, 3].map((i) => <Skeleton key={i} h={190} r={16} />)}
          {(plans.data || []).map((p) => (
            <article key={p.id} className="card plan-card">
              <span className="nm">{p.name}</span>
              <span className="pr num">{inr(p.price)}</span>
              <span className="sub">{p.duration_days} days · {p.members} member{p.members === 1 ? '' : 's'}</span>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setModal(p)}><Pencil /> Edit plan</button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDel(p)} aria-label={`Delete ${p.name}`}><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
          <button className="card plan-card add" onClick={() => setModal({})}><Plus size={24} /><b>New plan</b></button>
        </div>
      </section>

      {f && (
        <div className="split split-even">
          <section className="card form-sec">
            <h2>Gym details</h2>
            <div className="form-grid">
              <div className="field full"><label htmlFor="g-name">Gym name</label><input id="g-name" className="input" value={f.gym_name} onChange={set('gym_name')} /></div>
              <div className="field"><label htmlFor="g-wa">WhatsApp number for reminders</label><input id="g-wa" className="input" inputMode="tel" value={f.whatsapp_number} onChange={set('whatsapp_number')} placeholder="98765 43210" /></div>
              <div className="field"><label htmlFor="g-cc">Country code</label><div className="input-prefix"><span>+</span><input id="g-cc" className="input" inputMode="numeric" value={f.country_code} onChange={(e) => setF({ ...f, country_code: e.target.value.replace(/\D/g, '') })} /></div></div>
              <div className="field full"><label htmlFor="g-addr">Address</label><input id="g-addr" className="input" value={f.address} onChange={set('address')} /></div>
              <div className="field full"><label htmlFor="g-upi">UPI ID (shown in fee reminders)</label><input id="g-upi" className="input" value={f.upi_id} onChange={set('upi_id')} placeholder="yourgym@upi" /></div>
            </div>
          </section>

          <div className="stack">
            <section className="card form-sec">
              <h2>How reminders are sent</h2>
              <label className="radio-card">
                <input type="radio" name="method" checked={f.reminder_method === 'click'} onChange={() => setF({ ...f, reminder_method: 'click' })} />
                <span><b>One-click send (free)</b><small>Opens WhatsApp with the message already typed for each member. You just press send.</small></span>
              </label>
              <label className="radio-card disabled">
                <input type="radio" name="method" disabled />
                <span><b>Fully automatic (WhatsApp Business API) <span className="chip info plain" style={{ marginLeft: 6 }}>Coming soon</span></b><small>Messages go out on their own at the set time. Needs a WhatsApp Business API provider and has a small per-message cost.</small></span>
              </label>
            </section>
            <section className="card form-sec">
              <h2>Reminder rules</h2>
              {[
                ['rule_before_expiry', 'Before expiry', 'Remind members 7 days before their plan ends'],
                ['rule_on_expiry', 'On expiry day', 'Remind on the day the plan ends'],
                ['rule_fee_balance', 'Fee balance', 'Weekly reminder while a balance is pending'],
              ].map(([key, title, sub]) => (
                <label key={key} className="toggle-row">
                  <span><b>{title}</b><small>{sub}</small></span>
                  <span className="switch"><input type="checkbox" checked={!!f[key]} onChange={(e) => setF({ ...f, [key]: e.target.checked })} /><i /></span>
                </label>
              ))}
              <p style={{ fontSize: 13, color: 'var(--faint)' }}>Rules are saved now and take effect once automatic sending is connected. In one-click mode, use the WhatsApp reminders page.</p>
            </section>
          </div>
        </div>
      )}

      <section className="card card-body" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span className="kpi-ico violet"><Database size={20} /></span>
        <div>
          <h2 style={{ fontSize: 16 }}>Where your data lives</h2>
          <p style={{ color: 'var(--muted)', marginTop: 4 }}>Members, payments and photos are stored in the <code>DB/</code> folder next to the app (<code>gym.db</code> + <code>photos/</code>). To back up, copy that folder.</p>
        </div>
      </section>

      {modal && <PlanModal plan={modal.id ? modal : null} onClose={() => setModal(null)} onDone={() => { setModal(null); plans.reload() }} />}
      <Modal open={!!del} onClose={() => setDel(null)} title={`Remove ${del?.name}?`}
        footer={<><button className="btn btn-ghost" onClick={() => setDel(null)}>Cancel</button><button className="btn btn-danger" onClick={removePlan}>Remove plan</button></>}>
        <p style={{ color: 'var(--muted)' }}>Existing members keep their history. The plan just won’t be offered to new sign-ups or renewals.</p>
      </Modal>
    </div>
  )
}
