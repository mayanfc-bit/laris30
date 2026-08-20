import { Dices, List, SkipForward, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { drawChallenge, passChallenge } from '../lib/api'
import ChallengeCard from './ChallengeCard'
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
  onOpenUpload,
  onChanged,
}) {
  const dark = false
  const pool = challenges.filter((c) => c.type === kind)

  const [spinning, setSpinning] = useState(false)
  const [spinTitle, setSpinTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [exhausted, setExhausted] = useState(false)
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
    if (!active) return
    setBusy(true)
    spin(() => passChallenge(guest.id, active.id, kind).finally(() => setBusy(false)))
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
        <button
          className={`btn w-full !py-3 text-sm ${
            dark ? 'border border-cream/25 bg-white/5 text-cream hover:bg-white/10' : 'btn-ghost'
          }`}
          onClick={handlePass}
          disabled={busy}
        >
          {busy ? <Spinner className="h-4 w-4" /> : <SkipForward className="h-4 w-4" />}
          Passar para a próxima
        </button>
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
      <button
        className={`w-full !py-6 text-base ${dark ? 'btn-pink' : 'btn-gold'}`}
        onClick={handleDraw}
      >
        <Dices className="h-6 w-6" />
        Sortear minha missão
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {conteudo}

      {!spinning && (
        <Link
          to="/app/missoes"
          className={`btn w-full !py-3 text-sm ${
            dark
              ? 'border border-cream/25 bg-white/5 text-cream hover:bg-white/10'
              : 'btn-ghost'
          }`}
        >
          <List className="h-4 w-4" /> Ver lista de missões
        </Link>
      )}

      <ErrorNote>{error}</ErrorNote>
    </div>
  )
}
