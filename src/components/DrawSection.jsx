import { Dices, List, SkipForward, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MAX_PASSES, drawChallenge, passChallenge, pickChallenge } from '../lib/api'
import ChallengeCard from './ChallengeCard'
import ChallengeList from './ChallengeList'
import { ErrorNote, Spinner } from './ui'

/**
 * Bloco de missão sorteada. Serve tanto para o sorteio normal quanto para o 18+.
 * @param {'random'|'adult'} kind
 */
export default function DrawSection({
  kind = 'random',
  guest,
  challenges,
  active,
  statusById,
  onOpenUpload,
  onChanged,
}) {
  const dark = kind === 'adult'
  const pool = challenges.filter((c) => c.type === kind)
  const passesUsed = (kind === 'adult' ? guest?.passes_18_used : guest?.passes_used) ?? 0
  const passesLeft = Math.max(0, MAX_PASSES - passesUsed)

  const [spinning, setSpinning] = useState(false)
  const [spinTitle, setSpinTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [exhausted, setExhausted] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearInterval(timer.current), [])

  /** Roleta: embaralha títulos por ~1,1s e revela o resultado. */
  function spin(run) {
    setError(null)
    setSpinning(true)
    const names = pool.map((c) => c.title)
    timer.current = setInterval(() => {
      setSpinTitle(names[Math.floor(Math.random() * names.length)] || '…')
    }, 90)

    const finish = (result) => {
      clearInterval(timer.current)
      setSpinning(false)
      setSpinTitle('')
      if (result?.exhausted) setExhausted(true)
      onChanged?.()
    }

    Promise.all([run(), new Promise((r) => setTimeout(r, 1100))])
      .then(([result]) => finish(result))
      .catch((err) => {
        clearInterval(timer.current)
        setSpinning(false)
        setSpinTitle('')
        setError(err.message || 'Deu ruim no sorteio. Tenta de novo.')
      })
  }

  const handleDraw = () => spin(() => drawChallenge(guest.id, kind))

  const handlePass = () => {
    if (passesLeft <= 0 || !active) return
    setBusy(true)
    spin(() => passChallenge(guest.id, active.id, kind).finally(() => setBusy(false)))
  }

  /** Escolher da lista: só liberado quando não há missão em andamento. */
  const handlePick = async (c) => {
    await pickChallenge(guest.id, c.id, kind)
    await onChanged?.()
  }

  /* ---------------- conteúdo, por estado ---------------- */

  let conteudo

  if (spinning) {
    conteudo = (
      <div
        className={`rounded-2xl border p-8 text-center shadow-card ${
          dark ? 'border-pink/45 bg-petroleum text-cream' : 'border-gold/45 bg-white/85'
        }`}
      >
        <Dices
          className={`mx-auto h-10 w-10 animate-spin ${dark ? 'text-pink' : 'text-gold'}`}
          aria-hidden="true"
        />
        <p className="mt-4 animate-shuffle font-display font-extrabold text-xl leading-snug">
          {spinTitle || 'Embaralhando…'}
        </p>
        <p className={`mt-2 text-xs ${dark ? 'text-cream/60' : 'text-petroleum/50'}`}>
          Sorteando sua missão…
        </p>
      </div>
    )
  } else if (active) {
    conteudo = (
      <>
        <ChallengeCard
          challenge={active}
          dark={dark}
          onAction={() => onOpenUpload(active)}
          actionLabel="Cumpri! Enviar mídia"
        />
        <div className="flex items-center justify-between gap-3">
          <span className={`text-xs ${dark ? 'text-cream/60' : 'text-petroleum/55'}`}>
            {passesLeft > 0
              ? `${passesLeft} ${passesLeft === 1 ? 'passe restante' : 'passes restantes'}`
              : 'Sem passes — essa você encara'}
          </span>
          <button
            className="btn-ghost !py-2 text-xs"
            onClick={handlePass}
            disabled={passesLeft <= 0 || busy}
          >
            {busy ? <Spinner className="h-4 w-4" /> : <SkipForward className="h-4 w-4" />}
            Passar para o próximo
          </button>
        </div>
      </>
    )
  } else if (exhausted || pool.length === 0) {
    conteudo = (
      <div
        className={`rounded-2xl border p-6 text-center ${
          dark ? 'border-pink/40 bg-petroleum text-cream' : 'border-gold/40 bg-white/70'
        }`}
      >
        <Sparkles className={`mx-auto h-8 w-8 ${dark ? 'text-pink' : 'text-gold'}`} />
        <p className="mt-3 font-display font-extrabold text-xl">Você zerou essa categoria!</p>
        <p className={`mt-1 text-sm ${dark ? 'text-cream/70' : 'text-petroleum/60'}`}>
          Não sobrou nenhuma missão nova por aqui. Lenda.
        </p>
      </div>
    )
  } else {
    conteudo = (
      <div className="space-y-2 text-center">
        <button
          className={`w-full !py-6 text-base ${dark ? 'btn-pink' : 'btn-gold'}`}
          onClick={handleDraw}
        >
          <Dices className="h-6 w-6" />
          {kind === 'adult' ? 'Sortear missão 18+' : 'Sortear minha missão'}
        </button>
        <p className={`text-xs ${dark ? 'text-cream/60' : 'text-petroleum/50'}`}>
          {passesLeft} de {MAX_PASSES} passes disponíveis
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {conteudo}

      {!spinning && (
        <button
          className={`btn w-full !py-3 text-sm ${
            dark
              ? 'border border-cream/25 bg-white/5 text-cream hover:bg-white/10'
              : 'btn-ghost'
          }`}
          onClick={() => setListOpen(true)}
        >
          <List className="h-4 w-4" /> Ver lista de missões
        </button>
      )}

      <ErrorNote>{error}</ErrorNote>

      <ChallengeList
        open={listOpen}
        onClose={() => setListOpen(false)}
        pool={pool}
        statusById={statusById || new Map()}
        canPick={!active}
        dark={dark}
        onPick={handlePick}
      />
    </div>
  )
}
