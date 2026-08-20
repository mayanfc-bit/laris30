import {
  Cake,
  Camera,
  Crown,
  Footprints,
  Medal,
  Mountain,
  NotebookPen,
  ShieldCheck,
  Target,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/* Marcador de dificuldade                                             */
/* ------------------------------------------------------------------ */

const LEVELS = {
  easy: { label: 'Fácil', bars: 1, color: '#4FBDB2' },
  medium: { label: 'Médio', bars: 2, color: '#C99A4A' },
  hard: { label: 'Difícil', bars: 3, color: '#E2336B' },
  adult: { label: '18+', bars: 3, color: '#E2336B' },
}

export const difficultyLabel = (level) => (LEVELS[level] || LEVELS.easy).label

/**
 * Três barras crescentes, preenchidas conforme a dificuldade.
 * Desenhado à mão para seguir a paleta da festa — nada de emoji.
 */
export function DifficultyMark({ level = 'easy', className = 'h-4 w-4', dim = false }) {
  const { bars, color } = LEVELS[level] || LEVELS.easy
  const empty = dim ? 'rgba(248,244,238,0.28)' : 'rgba(20,90,99,0.18)'
  const shape = [
    { x: 1, y: 9.5, h: 5.5 },
    { x: 6.4, y: 6, h: 9 },
    { x: 11.8, y: 2.5, h: 12.5 },
  ]

  return (
    <svg viewBox="0 0 16 17" className={className} aria-hidden="true" focusable="false">
      {shape.map((s, i) => (
        <rect
          key={s.x}
          x={s.x}
          y={s.y}
          width="3.2"
          height={s.h}
          rx="1.6"
          fill={i < bars ? color : empty}
        />
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Ícones das conquistas                                               */
/* ------------------------------------------------------------------ */

const BADGE_ICONS = {
  primeira: Target,
  parabens: Cake,
  memorias: NotebookPen,
  paparazzi: Camera,
  trio: Medal,
  maratona: Footprints,
  lenda: Crown,
  semmedo: ShieldCheck,
  dificil: Mountain,
}

/** Ícone da conquista dentro de um disco, dourado quando conquistada. */
export function BadgeIcon({ id, earned = false, className = 'h-10 w-10' }) {
  const Icon = BADGE_ICONS[id] || Target
  return (
    <span
      className={`mx-auto flex items-center justify-center rounded-full border transition ${className} ${
        earned
          ? 'border-gold/50 bg-gold/15 text-gold'
          : 'border-petroleum/10 bg-petroleum/5 text-petroleum/35'
      }`}
    >
      <Icon className="h-5 w-5" strokeWidth={earned ? 2.2 : 1.8} aria-hidden="true" />
    </span>
  )
}
