import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutGrid, List, MessageCircle, Plus, Search, UserX } from 'lucide-react'
import { api } from '../../api'
import { useDebounced, useFetch } from '../../hooks'
import { useApp } from '../../context'
import { Avatar, Empty, ErrorBanner, Skeleton, StatusChip, useToast } from '../../components/ui'
import { fmtDate, inr } from '../../utils'
import { kindFor, sendOne } from '../../reminders'

const FILTERS = [
  ['all', 'All'],
  ['due', 'Renewal due'],
  ['pending', 'Fee pending'],
  ['expired', 'Expired'],
  ['active', 'Active'],
]

export default function Members() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('fittrack-members-view') || 'table' } catch { return 'table' }
  })
  const status = params.get('status') || 'all'
  const plan = params.get('plan') || 'all'
  const sort = params.get('sort') || 'joined'
  const page = Number(params.get('page') || 1)
  const dq = useDebounced(q, 250)
  const pageSize = 12
  const { settings, templates } = useApp()
  const toast = useToast()

  const plans = useFetch(() => api.plans(), [])
  const { data, loading, error, reload } = useFetch(
    () => api.members({ q: dq, status, plan, sort, page, page_size: pageSize }),
    [dq, status, plan, sort, page],
  )

  const patch = (changes) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v === '' || v === 'all' || v == null ? next.delete(k) : next.set(k, v)))
    if (!('page' in changes)) next.delete('page')
    setParams(next, { replace: true })
  }
  useEffect(() => { if (dq !== (params.get('q') || '')) patch({ q: dq }) }, [dq]) // eslint-disable-line
  useEffect(() => { try { localStorage.setItem('fittrack-members-view', view) } catch { /* ignore */ } }, [view])

  const counts = data?.counts
  const total = data?.total ?? 0
  const from = total ? (page - 1) * pageSize + 1 : 0
  const to = Math.min(total, page * pageSize)
  const pages = Math.max(1, Math.ceil(total / pageSize))

  const remind = async (m) => {
    await sendOne({ member: m, kind: kindFor(m), templates, settings })
    toast.success(`WhatsApp opened for ${m.name}`)
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Members</h1>
          <p>{counts ? `${counts.active + counts.due} active · ${counts.due} due this week · ${counts.expired} expired` : 'Loading…'}</p>
        </div>
        <div className="actions"><Link to="/app/members/new" className="btn btn-primary"><Plus /> Add member</Link></div>
      </div>

      <div className="toolbar">
        <div className="search">
          <Search />
          <label className="sr-only" htmlFor="msearch">Search members</label>
          <input id="msearch" type="search" className="input" placeholder="Search by name, phone or ID" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="sr-only" htmlFor="mplan">Plan</label>
        <select id="mplan" className="select" value={plan} onChange={(e) => patch({ plan: e.target.value })}>
          <option value="all">All plans</option>
          {(plans.data || []).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        <label className="sr-only" htmlFor="msort">Sort</label>
        <select id="msort" className="select" value={sort} onChange={(e) => patch({ sort: e.target.value })}>
          <option value="joined">Newest first</option>
          <option value="name">Name A–Z</option>
          <option value="ends">Ending soonest</option>
          <option value="balance">Highest balance</option>
        </select>
        <div className="segmented" role="group" aria-label="View">
          <button aria-pressed={view === 'table'} onClick={() => setView('table')}><List /> Table</button>
          <button aria-pressed={view === 'cards'} onClick={() => setView('cards')}><LayoutGrid /> Photos</button>
        </div>
      </div>

      <div className="pill-row" role="group" aria-label="Filter by status">
        {FILTERS.map(([id, label]) => (
          <button key={id} className="pill" aria-pressed={status === id} onClick={() => patch({ status: id })}>
            {label}{counts && <span className="count num">{counts[id === 'all' ? 'all' : id]}</span>}
          </button>
        ))}
      </div>

      <ErrorBanner error={error} onRetry={reload} />

      {view === 'table' ? (
        <section className="card" style={{ overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Member</th><th>Plan</th><th>Joined</th><th>Ends on</th><th>Status</th><th>Fee due</th><th className="right">Actions</th></tr>
              </thead>
              <tbody>
                {loading && !data && [...Array(6)].map((_, i) => <tr key={i}><td colSpan={7}><Skeleton h={40} /></td></tr>)}
                {(data?.items || []).map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link to={`/app/members/${m.id}`} className="person">
                        <Avatar name={m.name} src={m.photo_url} size={42} />
                        <span className="meta"><span className="nm">{m.name}</span><span className="sub num">{m.code} · {m.phone}</span></span>
                      </Link>
                    </td>
                    <td>{m.plan_name || '—'}</td>
                    <td className="num">{fmtDate(m.joined_on)}</td>
                    <td className="num">{fmtDate(m.end_date)}</td>
                    <td><StatusChip status={m.status} daysLeft={m.days_left} /></td>
                    <td className="num">{m.balance > 0 ? <b className="amount-bad">{inr(m.balance)}</b> : <span style={{ color: 'var(--faint)' }}>Paid</span>}</td>
                    <td className="right" style={{ whiteSpace: 'nowrap' }}><span className="row-actions">
                      <button className="btn btn-wa btn-icon" onClick={() => remind(m)} aria-label={`Send WhatsApp reminder to ${m.name}`}><MessageCircle size={18} /></button>
                      <Link to={`/app/members/${m.id}`} className="btn btn-ghost btn-sm" style={{ minHeight: 40 }}>View</Link>
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.items.length === 0 && <Empty icon={UserX} title="No members match these filters">Try a different search, or clear the filters.</Empty>}
          <div className="pager">
            <span>{total ? `Showing ${from}–${to} of ${total} members` : '—'}</span>
            <div className="btns">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => patch({ page: page - 1 })}><ChevronLeft /> Previous</button>
              <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => patch({ page: page + 1 })}>Next <ChevronRight /></button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="member-cards">
            {loading && !data && [...Array(8)].map((_, i) => <Skeleton key={i} h={300} r={16} />)}
            {(data?.items || []).map((m) => (
              <article key={m.id} className="card mcard">
                <Link to={`/app/members/${m.id}`} className="mcard-photo" aria-label={`Open ${m.name}`}>
                  <Avatar name={m.name} src={m.photo_url} size={220} />
                  <StatusChip status={m.status} daysLeft={m.days_left} compact />
                </Link>
                <div className="mcard-body">
                  <h3>{m.name}</h3>
                  <div className="row num"><span>{m.code}</span><span>{m.plan_name}</span></div>
                  <div className="row"><span>Ends {fmtDate(m.end_date, false)}</span>{m.balance > 0 ? <b className="amount-bad num">{inr(m.balance)}</b> : <span>Paid</span>}</div>
                  <div className="mcard-actions">
                    <button className="btn btn-wa btn-sm" onClick={() => remind(m)} aria-label={`Send WhatsApp reminder to ${m.name}`}><MessageCircle /> Remind</button>
                    <Link to={`/app/members/${m.id}`} className="btn btn-ghost btn-sm">View</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {data && data.items.length === 0 && <section className="card"><Empty icon={UserX} title="No members match these filters">Try a different search, or clear the filters.</Empty></section>}
          <div className="pager card" style={{ borderRadius: 16 }}>
            <span>{total ? `Showing ${from}–${to} of ${total} members` : '—'}</span>
            <div className="btns">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => patch({ page: page - 1 })}><ChevronLeft /> Previous</button>
              <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => patch({ page: page + 1 })}>Next <ChevronRight /></button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
