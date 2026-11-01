import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowUpRight, CalendarClock, MapPin, MessageCircle, Plus, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import { api } from '../../api'
import { useFetch } from '../../hooks'
import { useApp } from '../../context'
import { Avatar, Empty, ErrorBanner, Skeleton, useToast } from '../../components/ui'
import { daysLabel, fmtDate, inr, longDate } from '../../utils'
import { sendOne, sentToast } from '../../reminders'

const PLAN_COLORS = ['#8b5cf6', '#f472b6', '#22d3ee', '#fbbf24', '#34d399']

function Kpi({ icon: Icon, tone, label, value, children, hero }) {
  return (
    <div className={'card kpi' + (hero ? ' hero-kpi' : '')}>
      <div className="kpi-top"><span>{label}</span><span className={'kpi-ico ' + tone}><Icon size={20} /></span></div>
      <div className="kpi-val num">{value}</div>
      <div className="kpi-sub">{children}</div>
    </div>
  )
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tip">
      <small>{label}</small>
      <b>{inr(payload[0].value)}</b>
      <small>{payload[0].payload.joined} new member{payload[0].payload.joined === 1 ? '' : 's'}</small>
    </div>
  )
}

export default function Dashboard() {
  const { settings, templates, locParam, locations, locationId, setLocationId } = useApp()
  const { data, loading, error, reload } = useFetch(() => api.dashboard(locParam), [locParam])
  const place = locationId === 'all' ? 'All locations' : locations.find((l) => String(l.id) === locationId)?.name
  const toast = useToast()

  const remind = async (m) => {
    sentToast(toast, m, await sendOne({ member: m, kind: 'renewal', templates, settings }))
  }

  const s = data?.stats
  const delta = s && s.collected_prev_30d > 0 ? Math.round(((s.collected_30d - s.collected_prev_30d) / s.collected_prev_30d) * 100) : null
  const totalPlans = data?.plans.reduce((a, p) => a + p.count, 0) || 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>{longDate()} · <span className="loc-tag" style={{ fontSize: 15 }}><MapPin /> {place}</span></p>
        </div>
        <div className="actions">
          <Link to="/app/reminders" className="btn btn-wa"><MessageCircle /> Send reminders</Link>
          <Link to="/app/members/new" className="btn btn-primary"><Plus /> Add member</Link>
        </div>
      </div>

      <ErrorBanner error={error} onRetry={reload} />

      <section className="grid cols-4" aria-label="Overview">
        {loading || !s ? (
          [0, 1, 2, 3].map((i) => <div key={i} className="card kpi"><Skeleton h={14} w="50%" /><Skeleton h={38} w="40%" /><Skeleton h={12} w="60%" /></div>)
        ) : (
          <>
            <Kpi icon={Users} tone="violet" label="Active members" value={s.active_members}>
              <span className="delta up"><TrendingUp size={13} /> {s.joined_30d}</span> joined in 30 days
            </Kpi>
            <Kpi icon={CalendarClock} tone="amber" label="Renewals due in 7 days" value={s.due_7_days}>
              {s.first_due ? `First one on ${fmtDate(s.first_due, false)}` : 'Nothing due this week'}
            </Kpi>
            <Kpi icon={AlertTriangle} tone="red" label="Expired, not renewed" value={s.expired}>
              <Link to="/app/members?status=expired">Follow up →</Link>{s.inactive > 0 && <span>· {s.inactive} inactive</span>}
            </Kpi>
            <Kpi icon={Wallet} tone="green" label="Fees pending" value={inr(s.pending_total)} hero>
              <Link to="/app/fees">{s.pending_count} members · View list →</Link>
            </Kpi>
          </>
        )}
      </section>

      <div className="split">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Collection · last 6 months</h2>
              {s && (
                <p className="kpi-sub" style={{ marginTop: 6 }}>
                  <b className="num" style={{ color: 'var(--text)', fontSize: 20, fontFamily: 'var(--font-display)' }}>{inr(s.collected_30d)}</b> in the last 30 days
                  {delta != null && (
                    <span className={'delta ' + (delta >= 0 ? 'up' : 'down')}>
                      {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {Math.abs(delta)}% vs previous 30 days
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div className="card-body">
            <div className="chart-wrap" style={{ color: 'var(--faint)' }}>
              {data && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.revenue} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: 'currentColor', fontSize: 12.5 }} />
                    <YAxis tickLine={false} axisLine={false} width={52} tick={{ fill: 'currentColor', fontSize: 12.5 }} tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)} />
                    <Tooltip content={<Tip />} cursor={{ stroke: '#8b5cf6', strokeOpacity: 0.4 }} />
                    <Area type="monotone" dataKey="collected" stroke="#a78bfa" strokeWidth={3} fill="url(#rev)" dot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h2>Members by plan</h2></div>
          <div className="card-body">
            {data && data.plans.length > 0 ? (
              <>
                <div className="donut-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.plans} dataKey="count" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={3} stroke="none" cornerRadius={6}>
                        {data.plans.map((p, i) => <Cell key={p.name} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="donut-center"><b className="num">{totalPlans}</b><small>live members</small></div>
                </div>
                <div className="legend">
                  {data.plans.map((p, i) => (
                    <div key={p.name}><span><i style={{ background: PLAN_COLORS[i % PLAN_COLORS.length] }} />{p.name}</span><b className="num">{p.count}</b></div>
                  ))}
                </div>
              </>
            ) : <Empty icon={Users} title="No members yet">Add your first member to see the plan split.</Empty>}
          </div>
        </section>
      </div>

      <div className="split">
        <section className="card">
          <div className="card-head">
            <h2>Renewals due this week</h2>
            <Link to="/app/members?status=due">See all {s?.due_7_days ?? ''} <ArrowUpRight size={15} /></Link>
          </div>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            {data && data.renewals_due.length === 0 ? (
              <Empty icon={CalendarClock} title="All clear">No renewals are due in the next 7 days.</Empty>
            ) : (
              <table className="table">
                <thead><tr><th>Member</th><th>Plan</th><th>Ends on</th><th>Left</th><th className="right">Action</th></tr></thead>
                <tbody>
                  {(data?.renewals_due || []).map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link to={`/app/members/${m.id}`} className="person">
                          <Avatar name={m.name} src={m.photo_url} size={40} />
                          <span className="meta"><span className="nm">{m.name}</span><span className="sub">{m.code}</span></span>
                        </Link>
                      </td>
                      <td>{m.plan_name}</td>
                      <td className="num">{fmtDate(m.end_date)}</td>
                      <td><span className="chip warn">{daysLabel(m.days_left)}</span></td>
                      <td className="right"><button className="btn btn-wa btn-sm" onClick={() => remind(m)}><MessageCircle /> Remind</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {loading && <div style={{ padding: 22, display: 'grid', gap: 14 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={40} />)}</div>}
          </div>
        </section>

        <div className="stack">
          {locationId === 'all' && data && data.locations.length > 1 && (
            <section className="card">
              <div className="card-head"><h2>By location</h2></div>
              <div style={{ marginTop: 10 }}>
                {data.locations.map((l) => (
                  <button key={l.id} className="loc-row" onClick={() => setLocationId(l.id)} aria-label={`Switch to ${l.name}`}>
                    <span><b>{l.name}</b><small>{l.live} live · {l.due} due · {l.inactive} inactive</small></span>
                    <span className={l.pending_total > 0 ? 'amount-bad' : ''} style={{ fontWeight: 700 }}>{inr(l.pending_total)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
          <section className="card">
            <div className="card-head"><h2>Biggest pending fees</h2><Link to="/app/fees">All {s?.pending_count ?? ''}</Link></div>
            <ul className="list" style={{ marginTop: 10 }}>
              {(data?.pending_top || []).map((m) => (
                <li key={m.id}>
                  <Link to={`/app/members/${m.id}`} className="person">
                    <Avatar name={m.name} src={m.photo_url} size={36} />
                    <span className="meta"><span className="nm">{m.name}</span><span className="sub">{m.plan_name}</span></span>
                  </Link>
                  <span className="amount-bad">{inr(m.balance)}</span>
                </li>
              ))}
              {data && data.pending_top.length === 0 && <li><span style={{ color: 'var(--muted)' }}>No pending fees 🎉</span></li>}
            </ul>
          </section>
          <section className="card">
            <div className="card-head"><h2>Recently joined</h2><Link to="/app/members">Members</Link></div>
            <ul className="list" style={{ marginTop: 10 }}>
              {(data?.recent_members || []).slice(0, 4).map((m) => (
                <li key={m.id}>
                  <Link to={`/app/members/${m.id}`} className="person">
                    <Avatar name={m.name} src={m.photo_url} size={36} />
                    <span className="meta"><span className="nm">{m.name}</span><span className="sub">{m.plan_name} · {fmtDate(m.joined_on, false)}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
