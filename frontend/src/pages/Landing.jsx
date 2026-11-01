import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, Building2, Camera, CalendarClock, Check, CheckCheck, ChevronDown, Clock3, Mail,
  MapPin, Menu, MessageCircle, Phone, Send, Target, TrendingUp, Users, Wallet, X,
} from 'lucide-react'
import { Logo } from '../components/ui'
import { api } from '../api'
import { contact, faqs, features, hero, pricing, stats, steps } from '../landingContent'
import '../styles/landing.css'

const ICONS = {
  users: Users, camera: Camera, wallet: Wallet, calendar: CalendarClock, whatsapp: MessageCircle, chart: BarChart3,
  building: Building2, target: Target, clock: Clock3,
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
          <span className="eyebrow"><span className="dot" /> Built for gym owners in India</span>
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
            <a href="#contact" className="btn btn-lg btn-dark">Book a Demo</a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="float-card fc-1" aria-hidden="true">
            <span className="fc-ico wa"><MessageCircle size={18} /></span>
            <div>
              <b>Renewal reminder sent</b>
              <small>Karthik R · expires in 2 days</small>
            </div>
            <CheckCheck size={18} className="fc-tick" />
          </div>
          <div className="float-card fc-2" aria-hidden="true">
            <div>
              <small>Collected this month</small>
              <b className="big">₹1,48,200</b>
            </div>
            <span className="fc-up"><TrendingUp size={14} /> 12%</span>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="statbar">
          {stats.map((s) => {
            const Icon = ICONS[s.icon]
            return (
              <div className="stat" key={s.label}>
                <span className="stat-ico"><Icon size={22} /></span>
                <div><b>{s.value}</b><small>{s.label}</small></div>
              </div>
            )
          })}
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

function Pricing() {
  return (
    <section id="pricing" className="sec">
      <div className="container">
        <SectionHead kicker="Pricing" title="Simple plans that grow with your gym" sub="Start free. Upgrade when you outgrow it." />
        <div className="price-grid">
          {pricing.map((p, i) => (
            <article key={p.name} className={'price reveal' + (p.featured ? ' featured' : '')} style={{ '--d': `${i * 80}ms` }}>
              {p.featured && <span className="badge">Most popular</span>}
              <h3>{p.name}</h3>
              <p className="price-note">{p.note}</p>
              <p className="price-amt"><b>{p.price}</b> <span>{p.per}</span></p>
              <ul>{p.features.map((f) => <li key={f}><Check size={17} />{f}</li>)}</ul>
              <Link to="/app" className={'btn ' + (p.featured ? 'btn-primary' : 'btn-dark')}>{p.cta}</Link>
            </article>
          ))}
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
  const [form, setForm] = useState({ name: '', phone: '', gym_name: '', message: '' })
  const [state, setState] = useState({ busy: false, done: false, error: '' })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    setState({ busy: true, done: false, error: '' })
    try {
      await api.demoRequest(form)
      setState({ busy: false, done: true, error: '' })
      setForm({ name: '', phone: '', gym_name: '', message: '' })
    } catch (err) {
      setState({ busy: false, done: false, error: err.message })
    }
  }
  return (
    <section id="contact" className="sec sec-alt">
      <div className="container contact">
        <div className="reveal">
          <span className="kicker">Contact</span>
          <h2>Book a free demo</h2>
          <p className="about-lead">Tell us about your gym and we’ll walk you through FitTrack — usually in 15 minutes.</p>
          <ul className="contact-list">
            <li><Mail size={18} /> {contact.email}</li>
            <li><Phone size={18} /> {contact.phone}</li>
            <li><MapPin size={18} /> {contact.address}</li>
          </ul>
        </div>
        <form className="contact-form reveal" onSubmit={submit}>
          {state.done ? (
            <div className="sent"><span><CheckCheck size={28} /></span><h3>Request received</h3><p>Thanks! We’ll get in touch shortly to schedule your demo.</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setState({ busy: false, done: false, error: '' })}>Send another</button></div>
          ) : (
            <>
              <div className="form-grid">
                <div className="field"><label htmlFor="c-name">Your name</label><input id="c-name" className="input" required minLength={2} value={form.name} onChange={set('name')} placeholder="e.g. Saranraj" /></div>
                <div className="field"><label htmlFor="c-phone">WhatsApp number</label><input id="c-phone" className="input" required minLength={7} inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="98765 43210" /></div>
                <div className="field full"><label htmlFor="c-gym">Gym name</label><input id="c-gym" className="input" value={form.gym_name} onChange={set('gym_name')} placeholder="Your gym" /></div>
                <div className="field full"><label htmlFor="c-msg">Anything we should know?</label><textarea id="c-msg" className="textarea" value={form.message} onChange={set('message')} placeholder="Number of members, what you use today…" /></div>
              </div>
              {state.error && <div className="banner error" role="alert">{state.error}</div>}
              <button className="btn btn-primary btn-lg" disabled={state.busy}><Send /> {state.busy ? 'Sending…' : 'Request a demo'}</button>
            </>
          )}
        </form>
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
