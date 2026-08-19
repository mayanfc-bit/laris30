import { AlertTriangle, Loader2, X } from 'lucide-react'
import { useEffect } from 'react'
import { isConfigured } from '../lib/supabase'

export function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />
}

export function FullPageLoader({ label = 'Carregando…' }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-petroleum/70">
      <Spinner className="h-8 w-8 text-tiffany" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorNote({ children, onRetry }) {
  if (!children) return null
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-pink/30 bg-pink/5 p-3 text-sm text-pink"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p>{String(children)}</p>
        {onRetry && (
          <button onClick={onRetry} className="mt-2 underline underline-offset-2">
            Tentar de novo
          </button>
        )}
      </div>
    </div>
  )
}

/** Aviso fixo quando o .env do Supabase não foi preenchido. */
export function ConfigWarning() {
  if (isConfigured) return null
  return (
    <div className="mx-auto mb-4 max-w-xl rounded-xl border border-gold/50 bg-gold/10 p-3 text-sm text-petroleum">
      <strong className="font-medium">Supabase não configurado.</strong> Copie{' '}
      <code className="rounded bg-white/70 px-1">.env.example</code> para{' '}
      <code className="rounded bg-white/70 px-1">.env</code>, preencha a URL e a anon key, e
      reinicie o servidor.
    </div>
  )
}

export function Modal({ open, onClose, title, children, tone = 'light' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  const dark = tone === 'dark'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-petroleum/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className={`max-h-[92dvh] w-full max-w-lg animate-pop-in overflow-y-auto rounded-t-3xl border p-5 sm:rounded-3xl ${
          dark
            ? 'border-pink/40 bg-petroleum text-cream'
            : 'border-gold/40 bg-cream text-petroleum'
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className={`font-display text-2xl font-semibold ${dark ? 'text-cream' : ''}`}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className={`rounded-full p-1.5 transition ${
              dark ? 'hover:bg-white/10' : 'hover:bg-petroleum/10'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const TONES = {
  done: 'bg-emerald-100 text-emerald-800',
  active: 'bg-tiffany-soft text-petroleum',
  locked: 'bg-petroleum/10 text-petroleum/50',
  gold: 'bg-gold/15 text-gold',
  pink: 'bg-pink/10 text-pink',
}

export function StatusBadge({ tone = 'active', children }) {
  return <span className={`badge ${TONES[tone] || TONES.active}`}>{children}</span>
}
