import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeIcon } from '../components/Icons'
import MediaTile, { isVideoUrl } from '../components/MediaTile'
import { ConfigWarning, ErrorNote, FullPageLoader, Modal } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { getGuestState } from '../lib/api'
import { computeBadges } from '../lib/badges'

export default function Profile() {
  const { guest, logout } = useAuth()
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    if (!guest?.id) return
    try {
      setState(await getGuestState(guest.id))
      setError(null)
    } catch (err) {
      setError(err.message || 'Não consegui carregar seu perfil.')
    }
  }, [guest?.id])

  useEffect(() => {
    load()
  }, [load])

  const badges = useMemo(
    () =>
      state
        ? computeBadges({
            guest: state.guest || guest,
            completions: state.completions,
            challenges: state.challenges,
          })
        : [],
    [state, guest]
  )

  const enriched = useMemo(() => {
    if (!state) return []
    const byId = new Map(state.challenges.map((c) => [c.id, c]))
    return state.completions.map((c) => ({
      ...c,
      challenges: c.challenge_id ? byId.get(c.challenge_id) : null,
      guests: { name: guest?.name },
    }))
  }, [state, guest?.name])

  if (!state && !error) return <FullPageLoader label="Carregando seu perfil…" />

  const earned = badges.filter((b) => b.earned)
  const total = state?.completions.length || 0
  const totalChallenges = state?.challenges.length || 0

  return (
    <div className="space-y-5">
      <ConfigWarning />

      <header className="card text-center">
        <p className="text-sm text-petroleum/60">The One With</p>
        <h1 className="font-display font-extrabold text-4xl leading-tight">{guest?.name}</h1>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat value={total} label={total === 1 ? 'missão' : 'missões'} />
          <Stat value={earned.length} label="conquistas" />
          <Stat
            value={(guest?.passes_used ?? 0) + (guest?.passes_18_used ?? 0)}
            label="missões puladas"
          />
        </div>
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-petroleum/10">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${totalChallenges ? (total / totalChallenges) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-petroleum/50">
            {total} de {totalChallenges} desafios da festa
          </p>
        </div>
      </header>

      <ErrorNote onRetry={load}>{error}</ErrorNote>

      <section>
        <h2 className="section-title mb-3">Conquistas</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {badges.map((b) => (
            <div
              key={b.id}
              title={b.hint}
              className={`rounded-xl border p-3 text-center transition ${
                b.earned
                  ? 'border-gold/60 bg-gold/10'
                  : 'border-petroleum/10 bg-white/50 opacity-60'
              }`}
            >
              <BadgeIcon id={b.id} earned={b.earned} className="h-10 w-10" />
              <p
                className={`mt-2 text-xs font-medium leading-tight ${
                  b.earned ? 'text-petroleum' : 'text-petroleum/50'
                }`}
              >
                {b.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title mb-3">Meus envios</h2>
        {enriched.length === 0 ? (
          <div className="card py-10 text-center text-sm text-petroleum/60">
            Você ainda não enviou nada. Bora começar?
          </div>
        ) : (
          <div className="masonry">
            {enriched.map((item) => (
              <MediaTile key={item.id} item={item} showAuthor={false} onOpen={setOpen} />
            ))}
          </div>
        )}
      </section>

      <button className="btn-ghost w-full" onClick={logout}>
        Sair da festa
      </button>

      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.challenges?.title || 'Missão'}>
        {open?.media_url &&
          (isVideoUrl(open.media_url) ? (
            <video src={open.media_url} controls autoPlay playsInline className="w-full rounded-xl" />
          ) : (
            <img src={open.media_url} alt="" className="w-full rounded-xl" />
          ))}
        {open?.caption && <p className="mt-3 text-petroleum">{open.caption}</p>}
      </Modal>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div className="rounded-xl bg-tiffany-soft py-3">
      <p className="font-display font-extrabold text-3xl text-petroleum">{value}</p>
      <p className="text-[11px] leading-tight text-petroleum/60">{label}</p>
    </div>
  )
}
