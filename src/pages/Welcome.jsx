import { ArrowRight, Gift } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { rain } from '../lib/confetti'
import { ConfigWarning, FullPageLoader } from '../components/ui'

export default function Welcome() {
  const { guest, loading } = useAuth()

  useEffect(() => {
    const stop = rain(2800)
    return () => stop?.()
  }, [])

  if (loading) return <FullPageLoader />
  if (guest) return <Navigate to="/app" replace />

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-full max-w-md animate-fade-in">
        <ConfigWarning />

        <img
          src="/brand/moldura.svg"
          alt=""
          aria-hidden="true"
          className="mx-auto mb-6 w-full max-w-[20rem]"
        />

        <h1 className="font-display font-extrabold text-5xl leading-none">Missão 30</h1>

        <p className="mx-auto mt-4 max-w-xs font-display font-extrabold text-xl leading-tight text-gold">
          The One Where Laris Turns Thirty
        </p>

        <img src="/brand/laris.svg" alt="Laris" className="mx-auto mt-5 h-8" />

        <p className="mx-auto mt-6 max-w-sm text-[15px] leading-relaxed text-petroleum/75">
          Quem conhece a Larissa sabe o quanto ela ama registrar momentos. Nada mais justo do que
          guardar essa noite tão especial pelos olhos de quem ela ama.
        </p>

        <p className="mx-auto mt-3 max-w-sm text-sm text-petroleum/55">
          Cumpra as missões, registre em foto ou vídeo, e tudo vira uma galeria coletiva da festa.
        </p>

        <p className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 rounded-full border border-pink/40 bg-pink/5 px-4 py-2 text-sm text-petroleum">
          <Gift className="h-4 w-4 shrink-0 text-pink" aria-hidden="true" />
          Quem fizer mais pontos leva o mini flamingo
        </p>

        <Link to="/entrar" className="btn-gold mt-8 w-full text-base">
          Entrar na festa <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="mt-6 text-xs text-petroleum/40">30 anos · 2026</p>
      </div>
    </div>
  )
}
