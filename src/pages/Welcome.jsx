import { ArrowRight } from 'lucide-react'
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

        <h1 className="font-display text-5xl font-semibold leading-none">Missão 30</h1>
        <img src="/brand/laris.svg" alt="Laris" className="mx-auto mt-4 h-8" />
        <p className="mt-3 text-petroleum/70">O aniversário da Larissa</p>

        <p className="mx-auto mt-6 max-w-sm text-sm text-petroleum/60">
          Cada convidado recebe missões durante a festa. Cumpra, registre em foto ou vídeo e tudo
          vai parar na galeria coletiva da noite.
        </p>

        <Link to="/entrar" className="btn-gold mt-8 w-full text-base">
          Entrar na festa <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="mt-6 text-xs text-petroleum/40">30 anos · 2026</p>
      </div>
    </div>
  )
}
