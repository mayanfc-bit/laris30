import { Check, Circle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DifficultyMark, difficultyLabel } from './Icons'

/**
 * Lista de todas as missões sorteadas, só para consulta.
 * Mostra o que a pessoa já cumpriu e o que ainda falta. Não dá para
 * escolher daqui — o caminho continua sendo o sorteio.
 */
export default function MissionChecklist({ pool = [], statusById = new Map() }) {
  const [mostrarFeitas, setMostrarFeitas] = useState(true)

  const { feitas, total, lista } = useMemo(() => {
    const feitas = pool.filter((c) => statusById.get(c.id) === 'completed').length
    const lista = mostrarFeitas
      ? pool
      : pool.filter((c) => statusById.get(c.id) !== 'completed')
    return { feitas, total: pool.length, lista }
  }, [pool, statusById, mostrarFeitas])

  if (total === 0) return null

  const pct = total ? Math.round((feitas / total) * 100) : 0

  return (
    <section className="rounded-2xl border border-petroleum/10 bg-white/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-extrabold text-xl text-petroleum">Todas as missões</h2>
          <p className="text-sm text-petroleum/60">
            {feitas} de {total} concluídas
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarFeitas((v) => !v)}
          className="btn shrink-0 border border-petroleum/15 bg-white/80 !px-3 !py-1.5 text-xs text-petroleum/70"
        >
          {mostrarFeitas ? 'Só as que faltam' : 'Mostrar todas'}
        </button>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-petroleum/10">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {lista.map((c) => {
          const status = statusById.get(c.id)
          const feita = status === 'completed'
          const atual = status === 'active'

          return (
            <li
              key={c.id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                feita
                  ? 'border-emerald-300/70 bg-emerald-50/70'
                  : atual
                    ? 'border-tiffany bg-tiffany-soft'
                    : 'border-petroleum/10 bg-white/80'
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {feita ? (
                  <Check className="h-5 w-5 text-emerald-600" aria-label="Concluída" />
                ) : (
                  <Circle
                    className={`h-5 w-5 ${atual ? 'text-tiffany' : 'text-petroleum/25'}`}
                    aria-hidden="true"
                  />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm leading-snug ${
                    feita
                      ? 'text-emerald-900 line-through decoration-emerald-600/40'
                      : 'text-petroleum'
                  }`}
                >
                  {c.title}
                </span>
                <span className="mt-1 flex items-center gap-1.5">
                  <DifficultyMark level={c.difficulty} className="h-3 w-3" />
                  <span className="text-[11px] text-petroleum/50">
                    {difficultyLabel(c.difficulty)}
                    {atual && ' · é a sua agora'}
                  </span>
                </span>
              </span>
            </li>
          )
        })}

        {lista.length === 0 && (
          <li className="rounded-xl border border-dashed border-gold/50 bg-gold/5 p-6 text-center text-sm text-petroleum">
            Você cumpriu todas. Lenda.
          </li>
        )}
      </ul>
    </section>
  )
}
