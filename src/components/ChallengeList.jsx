import { Check, Circle, SkipForward } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DifficultyMark, difficultyLabel } from './Icons'
import { ErrorNote, Modal, Spinner } from './ui'

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'todo', label: 'Disponíveis' },
  { id: 'done', label: 'Concluídas' },
]

/**
 * Lista completa das missões de um tipo, com o status de cada uma.
 * Se não houver missão em andamento, dá pra escolher uma daqui em vez de sortear.
 */
export default function ChallengeList({
  open,
  onClose,
  pool,
  statusById,
  canPick,
  dark = false,
  onPick,
}) {
  const [filter, setFilter] = useState('all')
  const [picking, setPicking] = useState(null)
  const [error, setError] = useState(null)

  const contagem = useMemo(() => {
    const done = pool.filter((c) => statusById.get(c.id) === 'completed').length
    return { done, total: pool.length }
  }, [pool, statusById])

  const shown = useMemo(
    () =>
      pool.filter((c) => {
        const s = statusById.get(c.id)
        if (filter === 'done') return s === 'completed'
        if (filter === 'todo') return !s
        return true
      }),
    [pool, statusById, filter]
  )

  async function pick(c) {
    if (!canPick || picking) return
    setPicking(c.id)
    setError(null)
    try {
      await onPick(c)
      onClose?.()
    } catch (err) {
      setError(err.message || 'Não deu pra escolher essa missão.')
    } finally {
      setPicking(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Lista de missões" tone={dark ? 'dark' : 'light'}>
      <p className={`-mt-1 text-sm ${dark ? 'text-cream/70' : 'text-petroleum/60'}`}>
        {contagem.done} de {contagem.total} concluídas
        {canPick ? ' · toque numa disponível para escolher' : ' · cumpra ou passe a atual para poder escolher'}
      </p>

      <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`btn shrink-0 !px-3.5 !py-1.5 text-xs ${
              filter === f.id
                ? 'bg-tiffany text-petroleum'
                : dark
                  ? 'border border-cream/25 bg-white/5 text-cream/70'
                  : 'border border-petroleum/15 bg-white/70 text-petroleum/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ErrorNote>{error}</ErrorNote>

      <ul className="mt-3 space-y-2">
        {shown.map((c) => {
          const status = statusById.get(c.id)
          const done = status === 'completed'
          const passed = status === 'passed'
          const isActive = status === 'active'
          const selectable = canPick && !status

          return (
            <li key={c.id}>
              <button
                type="button"
                disabled={!selectable}
                onClick={() => pick(c)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                  done
                    ? 'border-emerald-300/70 bg-emerald-50/70'
                    : isActive
                      ? 'border-tiffany bg-tiffany-soft'
                      : dark
                        ? 'border-cream/15 bg-white/5'
                        : 'border-petroleum/10 bg-white/70'
                } ${selectable ? 'hover:border-gold cursor-pointer' : 'cursor-default'} ${
                  passed ? 'opacity-50' : ''
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {picking === c.id ? (
                    <Spinner className="h-5 w-5 text-gold" />
                  ) : done ? (
                    <Check className="h-5 w-5 text-emerald-600" aria-label="Concluída" />
                  ) : passed ? (
                    <SkipForward className="h-5 w-5 text-petroleum/40" aria-label="Passada" />
                  ) : (
                    <Circle
                      className={`h-5 w-5 ${isActive ? 'text-tiffany' : 'text-petroleum/25'}`}
                      aria-hidden="true"
                    />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm leading-snug ${
                      done
                        ? 'text-emerald-900 line-through decoration-emerald-600/40'
                        : dark
                          ? 'text-cream'
                          : 'text-petroleum'
                    }`}
                  >
                    {c.title}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <DifficultyMark level={c.difficulty} dim={dark} className="h-3 w-3" />
                    <span className={`text-[11px] ${dark ? 'text-cream/55' : 'text-petroleum/50'}`}>
                      {difficultyLabel(c.difficulty)}
                      {isActive && ' · em andamento'}
                      {passed && ' · passada'}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          )
        })}

        {shown.length === 0 && (
          <li
            className={`rounded-xl border border-dashed p-6 text-center text-sm ${
              dark ? 'border-cream/20 text-cream/60' : 'border-petroleum/15 text-petroleum/50'
            }`}
          >
            Nada nesse filtro.
          </li>
        )}
      </ul>
    </Modal>
  )
}
