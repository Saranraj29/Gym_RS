import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertCircle, Camera, CheckCircle2, ImagePlus, Trash2, Upload, X } from 'lucide-react'
import { avatarGradient, daysLabel, initials, STATUS } from '../utils'

export function Avatar({ name, src, size = 40, square = false }) {
  const [broken, setBroken] = useState(false)
  useEffect(() => { setBroken(false) }, [src])
  return (
    <span
      className={'avatar' + (square ? ' square' : '')}
      style={{ width: size, height: size, fontSize: size * 0.36, background: src && !broken ? 'var(--surface-3)' : avatarGradient(name) }}
      aria-hidden="true"
    >
      {src && !broken ? <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} /> : initials(name)}
    </span>
  )
}

export function StatusChip({ status, daysLeft, compact }) {
  const s = STATUS[status] || STATUS.active
  let label = s.label
  if (!compact && status === 'due' && daysLeft != null) label = daysLeft === 0 ? 'Due today' : `Due in ${daysLabel(daysLeft)}`
  return <span className={'chip ' + s.tone}>{label}</span>
}

export function Skeleton({ h = 16, w = '100%', r }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />
}

export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && <span className="ico"><Icon size={26} /></span>}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="banner error" role="alert">
      <AlertCircle />
      <div style={{ flex: 1 }}>{error.message || String(error)}</div>
      {onRetry && <button className="btn btn-sm btn-ghost" onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, footer, width }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector('input:not([type=hidden]), select, textarea, button.btn-primary')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref} style={width ? { width: Math.min(width, 9999) } : undefined}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2)
    setItems((l) => [...l, { id, type, message }])
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4200)
  }, [])
  const api = useRef({ success: (m) => push('success', m), error: (m) => push('error', m) })
  useEffect(() => {
    api.current = { success: (m) => push('success', m), error: (m) => push('error', m) }
  }, [push])
  return (
    <ToastCtx.Provider value={api.current}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={'toast ' + t.type}>
            {t.type === 'success' ? <CheckCircle2 /> : <AlertCircle />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/** Shrinks big phone photos in the browser before upload (max 1024px, JPEG). */
export async function downscale(file, max = 1024) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.88))
    return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

export function PhotoPicker({ initialUrl, onChange, onRemoveExisting, label = 'Member photo' }) {
  const [preview, setPreview] = useState(initialUrl || null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const camRef = useRef(null)
  const hasNew = useRef(false)

  useEffect(() => () => hasNew.current && preview?.startsWith('blob:') && URL.revokeObjectURL(preview), [preview])

  const accept = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setBusy(true)
    const small = await downscale(file)
    setBusy(false)
    hasNew.current = true
    setPreview(URL.createObjectURL(small))
    onChange(small)
  }
  const remove = () => {
    setPreview(null)
    hasNew.current = false
    onChange(null)
    if (initialUrl && onRemoveExisting) onRemoveExisting()
  }

  return (
    <div className="photo-picker">
      <button
        type="button"
        className={'photo-drop' + (drag ? ' drag' : '')}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer.files?.[0]) }}
        aria-label={preview ? `Change ${label.toLowerCase()}` : `Add ${label.toLowerCase()}`}
      >
        {preview ? <img src={preview} alt="Selected member" /> : (
          <>
            <ImagePlus />
            <span>{busy ? 'Preparing…' : 'Add photo'}</span>
          </>
        )}
      </button>
      <div className="photo-actions">
        <div className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Upload /> Upload</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => camRef.current?.click()}><Camera /> Take photo</button>
          {preview && <button type="button" className="btn btn-danger btn-sm" onClick={remove}><Trash2 /> Remove</button>}
        </div>
        <p>A clear face photo helps front-desk staff identify members quickly. JPG or PNG, up to 8 MB.</p>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { accept(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={camRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => { accept(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}

export function Logo({ size = 36, text = true, to }) {
  const mark = (
    <span className="logo-mark" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
        <path d="M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11" />
      </svg>
    </span>
  )
  return (
    <span className="logo">
      {mark}
      {text && <span className="logo-text">FitTrack</span>}
    </span>
  )
}
