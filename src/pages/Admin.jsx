import {
  ArrowLeft,
  Crown,
  Download,
  Images,
  RefreshCw,
  Trophy,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MediaTile, { isVideoUrl } from '../components/MediaTile'
import { ConfigWarning, ErrorNote, FullPageLoader, Modal, Spinner } from '../components/ui'
import { getAdminData, subscribeCompletions } from '../lib/api'

const PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'larissa30'
const SESSION_KEY = 'missao30:admin'

export default function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === 'ok')

  if (!authed) return <PasswordGate onOk={() => setAuthed(true)} />
  return <Dashboard />
}

/* ------------------------------------------------------------------ */

function PasswordGate({ onOk }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)

  function submit(e) {
    e.preventDefault()
    if (value === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'ok')
      onOk()
    } else {
      setError('Senha incorreta.')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm animate-fade-in space-y-4 text-center">
        <Crown className="mx-auto h-10 w-10 text-gold" aria-hidden="true" />
        <h1 className="font-display font-bold text-3xl">Painel da aniversariante</h1>
        <p className="text-sm text-petroleum/60">The One With the Birthday Girl. Só a Larissa passa daqui. 👑</p>
        <input
          type="password"
          className="input text-center"
          placeholder="Senha"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <ErrorNote>{error}</ErrorNote>
        <button className="btn-gold w-full">Entrar</button>
        <Link to="/" className="block text-sm text-petroleum/50 underline underline-offset-2">
          Voltar para a festa
        </Link>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [zip, setZip] = useState(null) // { done, total }
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    try {
      setData(await getAdminData())
      setError(null)
    } catch (err) {
      setError(err.message || 'Não consegui carregar o painel.')
    }
  }, [])

  useEffect(() => {
    load()
    return subscribeCompletions(load)
  }, [load])

  /** Baixa todas as mídias num único .zip, montado no navegador. */
  async function downloadAll() {
    const withMedia = (data?.gallery || []).filter((g) => g.media_url)
    if (!withMedia.length || zip) return

    setZip({ done: 0, total: withMedia.length })
    try {
      const { default: JSZip } = await import('jszip')
      const bundle = new JSZip()
      const used = new Set()

      for (let i = 0; i < withMedia.length; i++) {
        const item = withMedia[i]
        try {
          const res = await fetch(item.media_url)
          if (!res.ok) throw new Error(res.statusText)
          const blob = await res.blob()

          const ext = item.media_url.split('.').pop().split('?')[0].slice(0, 5)
          const slug = (s) =>
            String(s || 'sem-nome')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-zA-Z0-9]+/g, '-')
              .replace(/^-|-$/g, '')
              .slice(0, 40)
              .toLowerCase()

          let name = `${slug(item.guests?.name)}/${slug(item.challenges?.title)}.${ext}`
          let n = 2
          while (used.has(name)) {
            name = `${slug(item.guests?.name)}/${slug(item.challenges?.title)}-${n++}.${ext}`
          }
          used.add(name)
          bundle.file(name, blob)
        } catch {
          // Uma mídia falhou — segue o baile.
        }
        setZip({ done: i + 1, total: withMedia.length })
      }

      const out = await bundle.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(out)
      const a = document.createElement('a')
      a.href = url
      a.download = 'missao-30-galeria.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    } catch (err) {
      setError(err.message || 'Falhou ao montar o zip.')
    } finally {
      setZip(null)
    }
  }

  if (!data) {
    if (!error) return <FullPageLoader label="Carregando o painel…" />
    return (
      <div className="mx-auto max-w-xl space-y-4 px-4 py-10">
        <ConfigWarning />
        <ErrorNote onRetry={load}>{error}</ErrorNote>
      </div>
    )
  }

  const t = data.totals

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <ConfigWarning />

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-4xl">Painel da aniversariante</h1>
          <p className="text-sm text-petroleum/60">The One With the Birthday Girl — tudo que rolou na Missão 30.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost !py-2 text-sm" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
          <Link to="/app" className="btn-ghost !py-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> App
          </Link>
        </div>
      </header>

      <ErrorNote onRetry={load}>{error}</ErrorNote>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={Users} value={t?.guests ?? 0} label="convidados" />
        <Kpi icon={Trophy} value={t?.completions ?? 0} label="missões concluídas" />
        <Kpi icon={Images} value={t?.media ?? 0} label="fotos e vídeos" />
        <Kpi icon={Crown} value={t?.adultAccepted ?? 0} label="entraram no 18+" />
      </section>

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-title">Baixar tudo</h2>
          <button className="btn-gold !py-2 text-sm" onClick={downloadAll} disabled={Boolean(zip)}>
            {zip ? (
              <>
                <Spinner className="h-4 w-4" /> {zip.done}/{zip.total}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Baixar .zip ({t?.media ?? 0})
              </>
            )}
          </button>
        </div>
        <p className="text-sm text-petroleum/60">
          O zip é montado no navegador e organizado em pastas por convidado. Com muitos vídeos isso
          pode demorar — deixe a aba aberta.
        </p>
        {zip && (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-petroleum/10">
            <div
              className="h-full rounded-full bg-gold transition-all"
              style={{ width: `${(zip.done / zip.total) * 100}%` }}
            />
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="section-title mb-3">Convidados</h2>
          <ul className="divide-y divide-petroleum/10">
            {data.guests.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{g.name}</p>
                  <p className="text-xs text-petroleum/50">
                    {g.passes_used + g.passes_18_used} passes usados
                    {g.accepted_18plus && ' · 18+ 🔥'}
                  </p>
                </div>
                <span className="badge bg-tiffany-soft text-petroleum">
                  {g.completions} {g.completions === 1 ? 'missão' : 'missões'}
                </span>
              </li>
            ))}
            {data.guests.length === 0 && (
              <li className="py-6 text-center text-sm text-petroleum/50">Ninguém entrou ainda.</li>
            )}
          </ul>
        </section>

        <section className="card">
          <h2 className="section-title mb-3">Missões mais completadas</h2>
          <ul className="divide-y divide-petroleum/10">
            {data.challenges
              .filter((c) => c.completions > 0)
              .slice(0, 15)
              .map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 py-2.5">
                  <p className="min-w-0 text-sm leading-snug">{c.title}</p>
                  <span className="badge shrink-0 bg-gold/15 text-gold">{c.completions}</span>
                </li>
              ))}
            {data.challenges.every((c) => c.completions === 0) && (
              <li className="py-6 text-center text-sm text-petroleum/50">
                Nenhuma missão concluída ainda.
              </li>
            )}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="section-title mb-3">Galeria completa</h2>
        {data.gallery.length === 0 ? (
          <div className="card py-10 text-center text-sm text-petroleum/50">Galeria vazia.</div>
        ) : (
          <div className="masonry">
            {data.gallery.map((item) => (
              <MediaTile key={item.id} item={item} onOpen={setOpen} />
            ))}
          </div>
        )}
      </section>

      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.guests?.name || 'Missão'}>
        {open?.media_url &&
          (isVideoUrl(open.media_url) ? (
            <video src={open.media_url} controls autoPlay playsInline className="w-full rounded-xl" />
          ) : (
            <img src={open.media_url} alt="" className="w-full rounded-xl" />
          ))}
        <p className="mt-3 text-sm text-petroleum/70">{open?.challenges?.title}</p>
        {open?.caption && <p className="mt-1">{open.caption}</p>}
        {open?.media_url && (
          <a href={open.media_url} target="_blank" rel="noreferrer" className="btn-ghost mt-4 w-full">
            Abrir em tamanho real
          </a>
        )}
      </Modal>
    </div>
  )
}

function Kpi({ icon: Icon, value, label }) {
  return (
    <div className="card text-center">
      <Icon className="mx-auto h-5 w-5 text-tiffany" aria-hidden="true" />
      <p className="mt-1 font-display font-bold text-4xl text-petroleum">{value}</p>
      <p className="text-xs text-petroleum/60">{label}</p>
    </div>
  )
}
