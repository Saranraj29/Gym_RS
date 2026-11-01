import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, Camera, CalendarClock, Check, CheckCheck, ChevronDown,
  MapPin, Menu, MessageCircle, Phone, Users, Wallet, X,
} from 'lucide-react'
import { Logo } from '../components/ui'
import { api } from '../api'
import { faqs, features, hero, steps } from '../landingContent'
import { durationLabel, inr, waLink } from '../utils'
import '../styles/landing.css'

const ICONS = {
  users: Users, camera: Camera, wallet: Wallet, calendar: CalendarClock, whatsapp: MessageCircle, chart: BarChart3,
}

const NAV = [
  ['Home', '#home'],
  ['Features', '#features'],
  ['Pricing', '#pricing'],
  ['About', '#about'],
  ['Contact', '#contact'],
]

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    if (!('IntersectionObserver' in window)) return els.forEach((e) => e.classList.add('in'))
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [])
}

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className={'l-nav' + (scrolled || open ? ' solid' : '')}>
      <div className="container l-nav-in">
        <a href="#home" aria-label="FitTrack home"><Logo /></a>
        <nav className={'l-links' + (open ? ' open' : '')} aria-label="Primary">
          {NAV.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
          ))}
        </nav>
        <div className="l-nav-cta">
          <Link to="/app" className="btn btn-primary btn-sm">Get Started</Link>
          <button className="btn btn-ghost btn-icon l-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  const [a, b, c, accent, d] = hero.title
  return (
    <section id="home" className="hero">
      <div className="hero-bg" aria-hidden="true" />
    <div className="hero-photo">
      <img src="/images/hero.jpg" alt="Athlete curling a dumbbell in a gym" fetchpriority="high" />
      <svg className="stripe" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c4a1ff" />
            <stop offset="1" stopColor="#6d28d9" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <line x1="44" y1="0" x2="6" y2="100" stroke="url(#sg)" strokeWidth="10" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>

      <div className="container hero-in">
        <div className="hero-copy">
          <h1>
            {a}<br />{b}<br />{c}<span className="grad-text">{accent}</span>{d}
          </h1>
          <p className="lead">{hero.sub}</p>
          <ul className="checks">
            {hero.checks.map((t) => (
              <li key={t}><span><Check size={13} strokeWidth={3.5} /></span>{t}</li>
            ))}
          </ul>
          <div className="hero-cta">
            <Link to="/app" className="btn btn-primary btn-lg">Get Started Free <ArrowRight /></Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function SectionHead({ kicker, title, sub }) {
  return (
    <div className="sec-head reveal">
      <span className="kicker">{kicker}</span>
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  )
}

function Features() {
  return (
    <section id="features" className="sec">
      <div className="container">
        <SectionHead kicker="Features" title="Everything your front desk needs, nothing it doesn’t" sub="Replace the register, the spreadsheet and the memory of who paid — with one clean screen." />
        <div className="feature-grid">
          {features.map((f, i) => {
            const Icon = ICONS[f.icon]
            return (
              <article key={f.title} className="feature reveal" style={{ '--d': `${i * 60}ms` }}>
                <span className="feature-ico"><Icon size={24} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function How() {
  return (
    <section id="how" className="sec sec-alt">
      <div className="container">
        <SectionHead kicker="How it works" title="From sign-up to renewal in three steps" />
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={s.title} className="step reveal" style={{ '--d': `${i * 90}ms` }}>
              <span className="step-n">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Preview() {
  return (
    <section className="sec preview-sec">
      <div className="container">
        <SectionHead kicker="Product" title="Your whole gym, on one dashboard" sub="Active members, renewals due this week, pending fees and monthly collection — updated the moment you record a payment." />
        <div className="browser reveal">
          <div className="browser-bar"><i /><i /><i /><span>fittrack · dashboard</span></div>
          <img src="/images/preview-dashboard.png" alt="FitTrack dashboard showing members, renewals and monthly collection" loading="lazy" />
        </div>
      </div>
    </section>
  )
}

function WhatsApp() {
  return (
    <section className="sec sec-alt">
      <div className="container wa-grid">
        <div className="reveal">
          <span className="kicker">WhatsApp reminders</span>
          <h2 className="wa-title">Get paid on time without awkward conversations</h2>
          <p className="wa-lead">Pick who to remind — renewals due, fee balances or expired members — check the message, and send. The text is pre-filled for every member.</p>
          <ul className="wa-list">
            <li><Check size={18} /> English and தமிழ் templates, editable before sending</li>
            <li><Check size={18} /> Name, plan, date and amount filled in automatically</li>
            <li><Check size={18} /> See how many members paid after each reminder</li>
          </ul>
          <Link to="/app/reminders" className="btn btn-primary">Try reminders <ArrowRight /></Link>
        </div>
        <div className="chat reveal" aria-hidden="true">
          <div className="chat-head"><span className="chat-av">F</span><div><b>FitTrack Gym</b><small>online</small></div></div>
          <div className="bubble">Hi Priya, your Quarterly membership at FitTrack Gym ends on 5 Nov.<br />Renew before then to keep training without a break.<small>10:42 <CheckCheck size={14} /></small></div>
          <div className="bubble me">Will pay today evening 🙏<small>10:51</small></div>
          <div className="bubble">Thank you! See you at the 6 AM batch 💪<small>10:52 <CheckCheck size={14} /></small></div>
        </div>
      </div>
    </section>
  )
}

function usePublic(fn, fallback) {
  const [state, setState] = useState({ data: fallback, loading: true, error: false })
  useEffect(() => {
    let alive = true
    fn().then((data) => alive && setState({ data, loading: false, error: false })).catch(() => alive && setState({ data: fallback, loading: false, error: true }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return state
}

function Pricing() {
  // Same plans (and prices) as Plans & settings in the app — they come straight from the database.
  const { data: plans, loading, error } = usePublic(() => api.plans(), [])
  const base = plans[0]
  const popularId = plans.reduce((best, p) => (p.members > (best?.members ?? 0) ? p : best), null)?.id
  return (
    <section id="pricing" className="sec">
      <div className="container">
        <SectionHead kicker="Pricing" title="Simple membership plans" sub="Pick the plan that fits your routine — the longer you commit, the less you pay per month." />
        {loading && <div className="price-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="price skeleton" style={{ minHeight: 380 }} />)}</div>}
        {error && <p className="plans-note">Plans are unavailable right now. Please check back soon.</p>}
        <div className="price-grid">
          {plans.map((p, i) => {
            const perMonth = Math.round((p.price / p.duration_days) * 30)
            const saving = base && p.id !== base.id ? Math.round((1 - p.price / p.duration_days / (base.price / base.duration_days)) * 100) : 0
            const featured = p.id === popularId
            return (
              <article key={p.id} className={'price pop-in' + (featured ? ' featured' : '')} style={{ '--d': `${i * 80}ms` }}>
                {featured && <span className="badge">Most popular</span>}
                <h3>{p.name}</h3>
                <p className="price-note">{p.duration_days} days of membership</p>
                <p className="price-amt"><b>{inr(p.price)}</b> <span>/ {durationLabel(p.duration_days)}</span></p>
                <ul>
                  <li><Check size={17} />Valid for {p.duration_days} days</li>
                  <li><Check size={17} />About {inr(perMonth)} per month</li>
                  {saving > 0 && <li><Check size={17} />Save {saving}% vs {base.name}</li>}
                </ul>
                <Link to="/app" className={'btn ' + (featured ? 'btn-primary' : 'btn-dark')}>Get Started</Link>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function About() {
  const items = [
    ['Made for the front desk', 'Big buttons, clear status colours and fast search — it works when the queue is long.'],
    ['Your data, your server', 'A single SQLite file you can back up, move or open yourself. No lock-in.'],
    ['Built around WhatsApp', 'Because that is where your members already are.'],
  ]
  return (
    <section id="about" className="sec sec-alt">
      <div className="container about">
        <div className="reveal">
          <span className="kicker">About</span>
          <h2>Built for gym owners who’d rather be on the floor than in a spreadsheet</h2>
          <p className="about-lead">FitTrack takes the daily chores of running a gym — who joined, who paid, whose plan is about to end — and puts them on one clear screen, so nothing slips through the cracks.</p>
        </div>
        <div className="about-cards">
          {items.map(([t, d], i) => (
            <div key={t} className="about-card reveal" style={{ '--d': `${i * 80}ms` }}>
              <h3>{t}</h3><p>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <section className="sec">
      <div className="container faq">
        <SectionHead kicker="FAQ" title="Questions gym owners ask" />
        <div className="faq-list reveal">
          {faqs.map((f, i) => (
            <div key={f.q} className={'faq-item' + (open === i ? ' open' : '')}>
              <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                {f.q} <ChevronDown size={20} />
              </button>
              <div className="faq-a"><p>{f.a}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Contact() {
  const { data: locations, loading } = usePublic(() => api.locations(), [])
  const { data: settings } = usePublic(() => api.settings(), { gym_name: 'RS Arnold Gym', country_code: '91' })
  return (
    <section id="contact" className="sec sec-alt">
      <div className="container">
        <SectionHead kicker="Contact" title={`Visit ${settings.gym_name}`} sub="Drop by any of our locations or message us on WhatsApp." />
        <div className="loc-grid">
          {loading && [0, 1].map((i) => <div key={i} className="loc-card skeleton" style={{ minHeight: 170 }} />)}
          {locations.map((l, i) => (
            <article key={l.id} className="loc-card pop-in" style={{ '--d': `${i * 80}ms` }}>
              <span className="loc-ico"><MapPin size={22} /></span>
              <h3>{l.name}</h3>
              <p className="loc-addr">{l.address || 'Address coming soon'}</p>
              {l.phone && (
                <div className="loc-actions">
                  <a className="btn btn-dark btn-sm" href={`tel:${l.phone.replace(/\s/g, '')}`}><Phone /> {l.phone}</a>
                  <a className="btn btn-wa btn-sm" href={waLink(l.phone, settings.country_code)} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Cta() {
  return (
    <section className="cta-band">
      <div className="container cta-in reveal">
        <h2>Ready to run a tighter gym?</h2>
        <p>Open the app, add your first member and send your first reminder in minutes.</p>
        <Link to="/app" className="btn btn-lg btn-white">Get Started Free <ArrowRight /></Link>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="l-footer">
      <div className="container foot-in">
        <div><Logo /><p>Gym members, fees and renewals — simplified.</p></div>
        <nav aria-label="Footer">{NAV.map(([l, h]) => <a key={h} href={h}>{l}</a>)}</nav>
        <small>© {new Date().getFullYear()} FitTrack. All rights reserved.</small>
      </div>
    </footer>
  )
}

export default function Landing() {
  useReveal()
  return (
    <div className="landing" data-theme="dark">
      <Nav />
      <main>
        <Hero />
        <Features />
        <How />
        <Preview />
        <WhatsApp />
        <Pricing />
        <About />
        <Faq />
        <Contact />
        <Cta />
      </main>
      <Footer />
    </div>
  )
}
