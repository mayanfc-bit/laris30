import { Dices, SkipForward, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { drawChallenge, passChallenge } from '../lib/api'
import ChallengeCard from './ChallengeCard'
import { ErrorNote, Spinner } from './ui'

/** Bloco da missão sorteada — o principal da tela. */
export default function DrawSection({
  kind = 'random',
  guest,
  challenges,
  active,
  onOpenUpload,
  onChanged,
}) {
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
      <div className="flex min-h-[46dvh] flex-col items-center justify-center rounded-3xl border-2 border-gold/50 bg-white/85 p-8 text-center shadow-card">
        <Dices className="h-14 w-14 animate-spin text-gold" aria-hidden="true" />
        <p className="mt-5 animate-shuffle font-display font-extrabold text-2xl leading-snug">
          {spinTitle || 'Embaralhando…'}
        </p>
        <p className="mt-3 text-xs text-petroleum/50">Sorteando sua missão…</p>
      </div>
    )
  } else if (active) {
    conteudo = (
      <>
        <ChallengeCard
          challenge={active}
          destaque
          onAction={() => onOpenUpload(active)}
          actionLabel="Cumpri! Enviar mídia"
        />
        <button className="btn-ghost w-full !py-3 text-sm" onClick={handlePass} disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : <SkipForward className="h-4 w-4" />}
          Passar para a próxima
        </button>
      </>
    )
  } else if (exhausted || pool.length === 0) {
    conteudo = (
      <div
        className="rounded-2xl border border-gold/40 bg-white/70 p-6 text-center"
      >
        <Sparkles className="mx-auto h-8 w-8 text-gold" />
        <p className="mt-3 font-display font-extrabold text-xl">Você zerou essa categoria!</p>
        <p className="mt-1 text-sm text-petroleum/60">
          Não sobrou nenhuma missão nova por aqui. Lenda.
        </p>
      </div>
    )
  } else {
    // Estado principal da tela: o botão de sortear ocupa o bloco inteiro.
    conteudo = (
      <button
        onClick={handleDraw}
        className="flex min-h-[46dvh] w-full flex-col items-center justify-center gap-4 rounded-3xl
                   border-2 border-gold bg-gold text-white shadow-glow transition
                   hover:brightness-105 active:scale-[.985]"
      >
        <Dices className="h-16 w-16" aria-hidden="true" />
        <span className="font-display font-extrabold text-3xl leading-none">
          Sortear minha missão
        </span>
        <span className="max-w-[16rem] text-sm text-white/85">
          Toque para receber seu próximo desafio da festa
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-3">
      {conteudo}
      <ErrorNote>{error}</ErrorNote>
    </div>
  )
}
