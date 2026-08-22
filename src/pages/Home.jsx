import { BookHeart, Check, Dices, Pin, PlusCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ChallengeCard from '../components/ChallengeCard'
import DrawSection from '../components/DrawSection'
import MissionChecklist from '../components/MissionChecklist'
import UploadModal from '../components/UploadModal'
import { ConfigWarning, ErrorNote, FullPageLoader, Modal, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { completeChallenge, getGuestState } from '../lib/api'
import { burst } from '../lib/confetti'

const TABS = [
  { id: 'fixed', label: 'Fixas', icon: Pin },
  { id: 'random', label: 'Sorteadas', icon: Dices },
]

export default function Home() {
  const { guest, setGuest } = useAuth()
  const [tab, setTab] = useState('fixed')
  const [state, setState] = useState(null)
  const [error, setError] = useState(null)
  const [uploadFor, setUploadFor] = useState(null)
  const [livreAberto, setLivreAberto] = useState(false)
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
                ? 'bg-tiffany text-petroleum'
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
            Valem para todos os convidados, a noite inteira.
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
          {/* Sem título nem texto de apoio: o bloco do sorteio é o principal
              da tela e precisa aparecer inteiro sem rolar. */}
          <DrawSection
            kind="random"
            guest={guest}
            challenges={state.challenges}
            active={derived.activeRandom}
            statusById={derived.statusById}
            onOpenUpload={setUploadFor}
            onChanged={load}
          />

          {/* Mostra o que já foi cumprido e o que falta. Tocar numa missão
              ainda não feita abre o envio direto, sem passar pelo sorteio. */}
          <MissionChecklist
            pool={state.challenges.filter((c) => c.type === 'random')}
            statusById={derived.statusById}
            onEscolher={setUploadFor}
          />
        </section>
      )}

      {/* ---------------- Desafio livre ---------------- */}
      <section className="animate-fade-in rounded-2xl border border-dashed border-gold/60 bg-white/60 p-4 text-center">
        <PlusCircle className="mx-auto h-7 w-7 text-gold" aria-hidden="true" />
        <h2 className="mt-2 font-display font-extrabold text-xl">Rolou algo fora da lista?</h2>
        <p className="mt-1 text-sm text-petroleum/60">
          Registre do seu jeito. Vai para a galeria igual às outras missões.
        </p>
        <button className="btn-ghost mt-3 w-full" onClick={() => setLivreAberto(true)}>
          <PlusCircle className="h-4 w-4" /> Criar meu desafio
        </button>
      </section>

      {/* ---------------- Modais ---------------- */}
      <UploadModal
        open={Boolean(uploadFor)}
        onClose={() => setUploadFor(null)}
        guest={guest}
        challenge={uploadFor}
        onDone={load}
      />

      <UploadModal
        open={livreAberto}
        onClose={() => setLivreAberto(false)}
        guest={guest}
        challenge={null}
        livre
        onDone={load}
      />

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
