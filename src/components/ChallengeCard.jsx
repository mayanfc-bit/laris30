import { Check, Lock, Upload } from 'lucide-react'
import { StatusBadge } from './ui'

export const DIFFICULTY = {
  easy: { label: 'Fácil', dot: '🟢' },
  medium: { label: 'Médio', dot: '🟡' },
  hard: { label: 'Difícil', dot: '🔴' },
  adult: { label: '18+', dot: '🔞' },
}

export default function ChallengeCard({
  challenge,
  done = false,
  locked = false,
  dark = false,
  actionLabel = 'Enviar foto/vídeo',
  onAction,
  children,
}) {
  const diff = DIFFICULTY[challenge?.difficulty] || DIFFICULTY.easy

  return (
    <article
      className={`rounded-2xl border p-4 shadow-card transition ${
        dark
          ? 'border-pink/45 bg-petroleum text-cream'
          : done
            ? 'border-emerald-300/70 bg-emerald-50/70'
            : 'border-gold/45 bg-white/85'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className={`text-xs font-medium ${dark ? 'text-pink' : 'text-gold'}`}>
          {diff.dot} {diff.label}
        </span>
        {done ? (
          <StatusBadge tone="done">
            <Check className="h-3.5 w-3.5" /> Concluída
          </StatusBadge>
        ) : locked ? (
          <StatusBadge tone="locked">
            <Lock className="h-3.5 w-3.5" /> Bloqueada
          </StatusBadge>
        ) : (
          <StatusBadge tone={dark ? 'pink' : 'active'}>Pendente</StatusBadge>
        )}
      </div>

      <h3 className={`font-display font-bold text-xl leading-snug ${dark ? 'text-cream' : 'text-petroleum'}`}>
        {challenge?.title}
      </h3>

      {challenge?.description && (
        <p className={`mt-1 text-sm ${dark ? 'text-cream/70' : 'text-petroleum/60'}`}>
          {challenge.description}
        </p>
      )}

      {children}

      {!done && !locked && onAction && (
        <button
          className={`mt-4 w-full ${dark ? 'btn-pink' : 'btn-primary'}`}
          onClick={() => onAction(challenge)}
        >
          <Upload className="h-4 w-4" /> {actionLabel}
        </button>
      )}
    </article>
  )
}
