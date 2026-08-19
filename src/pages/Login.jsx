import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ConfigWarning, ErrorNote, FullPageLoader, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { guest, loading, login } = useAuth()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  if (loading) return <FullPageLoader />
  if (guest) return <Navigate to="/app" replace />

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await login(name)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err.message || 'Não consegui entrar. Tenta de novo?')
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <form onSubmit={submit} className="mx-auto w-full max-w-md animate-fade-in space-y-5">
        <ConfigWarning />

        <div className="text-center">
          <img src="/brand/l30.svg" alt="L30" className="mx-auto h-20" />
          <h1 className="mt-4 font-display font-bold text-4xl">Qual é o seu nome?</h1>
          <p className="mt-2 text-sm text-petroleum/60">
            Sem senha, sem e-mail. Se você já entrou antes, é só digitar o mesmo nome que a gente
            recupera suas missões.
          </p>
        </div>

        <input
          className="input text-center text-lg"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          autoCapitalize="words"
          maxLength={60}
          autoFocus
          required
        />

        <ErrorNote>{error}</ErrorNote>

        <button className="btn-gold w-full text-base" disabled={busy || !name.trim()}>
          {busy ? (
            <>
              <Spinner /> Entrando…
            </>
          ) : (
            <>
              Entrar <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
