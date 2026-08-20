import { Check, Upload } from 'lucide-react'
import { DifficultyMark, difficultyLabel } from './Icons'
import { StatusBadge } from './ui'

/**
 * Card de um desafio.
 * @param {boolean} destaque  versão grande, usada na missão sorteada em
 *                            andamento — é o bloco principal da tela.
 */
export default function ChallengeCard({
  challenge,
  done = false,
  destaque = false,
  actionLabel = 'Enviar foto/vídeo',
  onAction,
  children,
}) {
  const level = challenge?.difficulty || 'easy'

  return (
    <article
      className={`rounded-2xl border shadow-card transition ${
        destaque ? 'flex min-h-[46dvh] flex-col rounded-3xl border-2 p-6' : 'p-4'
      } ${done ? 'border-emerald-300/70 bg-emerald-50/70' : 'border-gold/45 bg-white/85'}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gold">
          <DifficultyMark level={level} className="h-3.5 w-3.5" />
          {difficultyLabel(level)}
        </span>
        {done ? (
          <StatusBadge tone="done">
            <Check className="h-3.5 w-3.5" /> Concluída
          </StatusBadge>
        ) : (
          <StatusBadge tone="active">Pendente</StatusBadge>
        )}
      </div>

      <div className={destaque ? 'flex flex-1 flex-col justify-center py-4' : ''}>
        <h3
          className={`font-display font-extrabold leading-snug text-petroleum ${
            destaque ? 'text-3xl' : 'text-xl'
          }`}
        >
          {challenge?.title}
        </h3>

        {challenge?.description && (
          <p className={`mt-2 text-petroleum/60 ${destaque ? 'text-base' : 'text-sm'}`}>
            {challenge.description}
          </p>
        )}
      </div>

      {children}

      {!done && onAction && (
        <button
          className={`btn-primary w-full ${destaque ? 'mt-2 !py-4 text-base' : 'mt-4'}`}
          onClick={() => onAction(challenge)}
        >
          <Upload className={destaque ? 'h-5 w-5' : 'h-4 w-4'} /> {actionLabel}
        </button>
      )}
    </article>
  )
}
