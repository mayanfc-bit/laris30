import { Check, Lock, Upload } from 'lucide-react'
import { DifficultyMark, difficultyLabel } from './Icons'
import { StatusBadge } from './ui'

export default function ChallengeCard({
  challenge,
  done = false,
  locked = false,
  dark = false,
  actionLabel = 'Enviar foto/vídeo',
  onAction,
  children,
}) {
  const level = challenge?.difficulty || 'easy'

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
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
            dark ? 'text-pink' : 'text-gold'
          }`}
        >
          <DifficultyMark level={level} dim={dark} className="h-3.5 w-3.5" />
          {difficultyLabel(level)}
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

      <h3 className={`font-display font-extrabold text-xl leading-snug ${dark ? 'text-cream' : 'text-petroleum'}`}>
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
