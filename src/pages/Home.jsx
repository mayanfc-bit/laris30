import { BookHeart, Check, Dices, Lock, Pin } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ChallengeCard from '../components/ChallengeCard'
import DrawSection from '../components/DrawSection'
import UploadModal from '../components/UploadModal'
import { ConfigWarning, ErrorNote, FullPageLoader, Modal, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { acceptAdultSection, completeChallenge, getGuestState } from '../lib/api'
import { burst } from '../lib/confetti'

const TABS = [
  { id: 'fixed', label: 'Fixas', icon: Pin },
  { id: 'random', label: 'Sorteadas', icon: Dices },
  { id: 'adult', label: '18+', icon: Lock },
]

export default function Home() {
  const { guest, setGuest } = useAuth()
  const [tab, setTab] = useState('fixed')
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)
  const [uploadFor, setUploadFor] = useState(null)
  const [askAdult, setAskAdult] = useState(false)
  const [manualFor, setManualFor] = useState(null)
  const [manualBusy, setManualBusy] = useState(false)

  const load = useCallback(async () => {
    if (!guest?.id) return
    try {
      const next = await getGuestState(guest.id)
      setState(next)
      if (next.guest) setGuest(next.guest)
      setError(null)
    } catch (err) {
      setError(err.message || 'Não consegui carregar suas missões.')
    }
  }, [guest?.id, setGuest])

  useEffect(() => {
    load()
  }, [load])

  const derived = useMemo(() => {
    if (!state) return null
    const { challenges, completions, drawn } = state
    const byId = new Map(challenges.map((c) => [c.id, c]))
    const doneIds = new Set(completions.map((c) => c.challenge_id))
    const activeOf = (kind) => {
      const hit = drawn.find(
        (d) => d.status === 'active' && byId.get(d.challenge_id)?.type === kind
      )
      return hit ? byId.get(hit.challenge_id) : null
    }
    // Status de cada desafio, para a lista mostrar o check.
    // completed vence sobre o que estiver em drawn_challenges.
    const statusById = new Map()
    for (const d of drawn) statusById.set(d.challenge_id, d.status)
    for (const id of doneIds) statusById.set(id, 'completed')

    const fixed = challenges.filter((c) => c.type === 'fixed')

    return {
      byId,
      doneIds,
      statusById,
      fixed,
      fixedDone: fixed.length > 0 && fixed.every((c) => doneIds.has(c.id)),
      activeRandom: activeOf('random'),
      activeAdult: activeOf('adult'),
      total: completions.length,
    }
  }, [state])

  // Assim que as três fixas estiverem completas, o sorteio vira a tela
  // principal. Só na primeira carga — depois disso a aba é escolha do usuário.
  const [tabDefinida, setTabDefinida] = useState(false)
  useEffect(() => {
    if (!derived || tabDefinida) return
    if (derived.fixedDone) setTab('random')
    setTabDefinida(true)
  }, [derived, tabDefinida])

  async function confirmAdult() {
    const updated = await acceptAdultSection(guest.id)
    setGuest(updated)
    setAskAdult(false)
    await load()
  }

  async function markManual() {
    if (!manualFor || manualBusy) return
    setManualBusy(true)
    try {
      await completeChallenge({
        guestId: guest.id,
        challengeId: manualFor.id,
        isManual: true,
      })
      burst()
      setManualFor(null)
      await load()
    } catch (err) {
      setError(err.message || 'Não deu pra marcar. Tenta de novo?')
    } finally {
      setManualBusy(false)
    }
  }

  if (!state && !error) return <FullPageLoader label="Carregando suas missões…" />

  const adultUnlocked = Boolean(guest?.accepted_18plus)

  return (
    <div className="space-y-5">
      <ConfigWarning />

      <header className="card flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-petroleum/60">Oi,</p>
          <h1 className="font-display font-extrabold text-3xl leading-tight">{guest?.name}</h1>
        </div>
        <div className="text-right">
          <p className="font-display font-extrabold text-4xl text-gold">{derived?.total ?? 0}</p>
          <p className="text-xs text-petroleum/60">
            {derived?.total === 1 ? 'missão feita' : 'missões feitas'}
          </p>
        </div>
      </header>

      <ErrorNote onRetry={load}>{error}</ErrorNote>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`btn shrink-0 !px-4 !py-2 text-sm ${
              tab === id
                ? id === 'adult'
                  ? 'bg-petroleum text-cream'
                  : 'bg-tiffany text-petroleum'
                : 'border border-petroleum/15 bg-white/70 text-petroleum/70'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ---------------- Missões fixas ---------------- */}
      {tab === 'fixed' && derived && (
        <section className="space-y-3 animate-fade-in">
          <h2 className="section-title">Missões de todo mundo</h2>
          <p className="-mt-2 text-sm text-petroleum/60">
            Essas três valem para todos os convidados, a noite inteira.
          </p>
          {derived.fixed.map((c) => {
            const isManual = c.title.toLowerCase().includes('livrinho')
            const done = derived.doneIds.has(c.id)
            return (
              <ChallengeCard
                key={c.id}
                challenge={c}
                done={done}
                onAction={isManual ? () => setManualFor(c) : () => setUploadFor(c)}
                actionLabel={isManual ? 'Já escrevi — marcar como feita' : 'Enviar foto/vídeo'}
              />
            )
          })}
        </section>
      )}

      {/* ---------------- Missões sorteadas ---------------- */}
      {tab === 'random' && derived && (
        <section className="space-y-3 animate-fade-in">
          <h2 className="section-title">Sua missão sorteada</h2>
          <p className="-mt-2 text-sm text-petroleum/60">
            Cumpra, envie o registro e sorteie a próxima. Nenhum desafio se repete pra você.
          </p>
          <DrawSection
            kind="random"
            guest={guest}
            challenges={state.challenges}
            active={derived.activeRandom}
            statusById={derived.statusById}
            onOpenUpload={setUploadFor}
            onChanged={load}
          />
        </section>
      )}

      {/* ---------------- Missões 18+ ---------------- */}
      {tab === 'adult' && derived && (
        <section className="space-y-3 animate-fade-in">
          {!adultUnlocked ? (
            <div className="rounded-2xl border border-pink/40 bg-petroleum p-8 text-center text-cream shadow-card">
              <Lock className="mx-auto h-10 w-10 text-pink" aria-hidden="true" />
              <h2 className="mt-4 font-display font-extrabold text-3xl">Missões 18+</h2>
              <p className="mt-2 font-display font-extrabold text-lg text-pink">The One After Vegas</p>
              <p className="mt-1 text-cream/70">Disponível para os corajosos…</p>
              <button className="btn-pink mt-6 w-full" onClick={() => setAskAdult(true)}>
                Quero entrar
              </button>
            </div>
          ) : (
            <>
              <h2 className="section-title">Área dos corajosos</h2>
              <p className="-mt-2 text-sm text-petroleum/60">
                Mesmas regras, clima diferente. Bom senso e consentimento sempre.
              </p>
              <DrawSection
                kind="adult"
                guest={guest}
                challenges={state.challenges}
                active={derived.activeAdult}
                statusById={derived.statusById}
                onOpenUpload={setUploadFor}
                onChanged={load}
              />
            </>
          )}
        </section>
      )}

      {/* ---------------- Modais ---------------- */}
      <UploadModal
        open={Boolean(uploadFor)}
        onClose={() => setUploadFor(null)}
        guest={guest}
        challenge={uploadFor}
        onDone={load}
      />

      <Modal open={askAdult} onClose={() => setAskAdult(false)} title="The One After Vegas" tone="dark">
        <p className="text-cream/80">Você tem certeza? É só pra quem já tá no clima.</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="btn-ghost !bg-white/10 !text-cream" onClick={() => setAskAdult(false)}>
            Deixa pra lá
          </button>
          <button className="btn-pink" onClick={confirmAdult}>
            Sim, tô dentro
          </button>
        </div>
      </Modal>

      <Modal
        open={Boolean(manualFor)}
        onClose={() => !manualBusy && setManualFor(null)}
        title="Livrinho das memórias"
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <BookHeart className="h-12 w-12 text-gold" aria-hidden="true" />
          <p className="text-petroleum/70">
            Essa missão é no papel mesmo. Já escreveu sua mensagem no livrinho?
          </p>
          <div className="grid w-full grid-cols-2 gap-3">
            <button
              className="btn-ghost"
              onClick={() => setManualFor(null)}
              disabled={manualBusy}
            >
              Ainda não
            </button>
            <button className="btn-gold" onClick={markManual} disabled={manualBusy}>
              {manualBusy ? <Spinner /> : <Check className="h-4 w-4" />} Já escrevi
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
