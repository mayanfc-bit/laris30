import { ArrowLeft, Check, Circle, SkipForward } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DifficultyMark, difficultyLabel } from '../components/Icons'
import { ConfigWarning, ErrorNote, FullPageLoader, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { getGuestState, pickChallenge } from '../lib/api'

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'todo', label: 'Disponíveis' },
  { id: 'done', label: 'Concluídas' },
]

/**
 * Lista completa das missões, como página própria.
 * Era um modal e não rolava direito no celular — página normal resolve,
 * porque quem rola é o corpo do documento.
 */
export default function Missions() {
  const { guest } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const kind = 'random'

  const [state, setState] = useState(null)
  const [filter, setFilter] = useState('all')
  const [picking, setPicking] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!guest?.id) return
    try {
      setState(await getGuestState(guest.id))
      setError(null)
    } catch (err) {
      setError(err.message || 'Não consegui carregar as missões.')
    }
  }, [guest?.id])

  useEffect(() => {
    load()
  }, [load])

  const dados = useMemo(() => {
    if (!state) return null
    const pool = state.challenges.filter((c) => c.type === kind)
    const doneIds = new Set(state.completions.map((c) => c.challenge_id))
    const statusById = new Map()
    for (const d of state.drawn) statusById.set(d.challenge_id, d.status)
    for (const id of doneIds) statusById.set(id, 'completed')
    const poolIds = new Set(pool.map((c) => c.id))
    const temAtiva = state.drawn.some((d) => d.status === 'active' && poolIds.has(d.challenge_id))
    return {
      pool,
      statusById,
      temAtiva,
      feitas: pool.filter((c) => statusById.get(c.id) === 'completed').length,
    }
  }, [state, kind])

  const shown = useMemo(() => {
    if (!dados) return []
    return dados.pool.filter((c) => {
      const s = dados.statusById.get(c.id)
      if (filter === 'done') return s === 'completed'
      // "Disponíveis" inclui as passadas, que voltaram a ser escolhíveis.
      if (filter === 'todo') return s !== 'completed' && s !== 'active'
      return true
    })
  }, [dados, filter])

  async function pick(c) {
    if (picking) return
    setPicking(c.id)
    setError(null)
    try {
      await pickChallenge(guest.id, c.id, kind)
      navigate('/app')
    } catch (err) {
      setError(err.message || 'Não deu pra escolher essa missão.')
      setPicking(null)
    }
  }

  if (!state && !error) return <FullPageLoader label="Carregando as missões…" />

  return (
    <div className="space-y-4">
      <ConfigWarning />

      <div className="flex items-center gap-3">
        <Link
          to="/app"
          className="rounded-full p-2 text-petroleum/60 transition hover:bg-petroleum/10"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="section-title">Lista de missões</h1>
          <p className="text-sm text-petroleum/60">
            {dados?.feitas ?? 0} de {dados?.pool.length ?? 0} concluídas
          </p>
        </div>
      </div>

      <p className="rounded-xl border border-tiffany/50 bg-tiffany-soft p-3 text-sm text-petroleum">
        Toque em qualquer missão para escolhê-la como a sua atual.
        {dados?.temAtiva && ' A que estiver em andamento volta para a lista.'}
      </p>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`btn shrink-0 !px-4 !py-2 text-sm ${
              filter === f.id
                ? 'bg-tiffany text-petroleum'
                : 'border border-petroleum/15 bg-white/70 text-petroleum/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ErrorNote onRetry={load}>{error}</ErrorNote>

      <ul className="space-y-2">
        {shown.map((c) => {
          const status = dados.statusById.get(c.id)
          const done = status === 'completed'
          const passed = status === 'passed'
          const isActive = status === 'active'
          // Só o que já foi concluído fica fora de alcance. Passada volta a valer.
          const selectable = !done && !isActive

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
                      : 'border-petroleum/10 bg-white/75'
                } ${selectable ? 'cursor-pointer hover:border-gold' : 'cursor-default'} ${
                  passed ? 'opacity-70' : ''
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
                        : 'text-petroleum'
                    }`}
                  >
                    {c.title}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5">
                    <DifficultyMark level={c.difficulty} className="h-3 w-3" />
                    <span className="text-[11px] text-petroleum/50">
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
          <li className="rounded-xl border border-dashed border-petroleum/15 p-8 text-center text-sm text-petroleum/50">
            Nada nesse filtro.
          </li>
        )}
      </ul>
    </div>
  )
}
