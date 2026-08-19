import { Images } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import MediaTile, { isVideoUrl } from '../components/MediaTile'
import { ConfigWarning, ErrorNote, FullPageLoader, Modal } from '../components/ui'
import { listGallery, subscribeCompletions } from '../lib/api'

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'fixed', label: 'Fixas' },
  { id: 'random', label: 'Sorteadas' },
  { id: 'adult', label: '18+' },
]

export default function Gallery() {
  const [items, setItems] = useState(null)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    try {
      setItems(await listGallery())
      setError(null)
    } catch (err) {
      setError(err.message || 'Não consegui carregar a galeria.')
    }
  }, [])

  useEffect(() => {
    load()
    return subscribeCompletions(load) // tempo real
  }, [load])

  const shown = useMemo(
    () =>
      (items || []).filter((i) => filter === 'all' || i.challenges?.type === filter),
    [items, filter]
  )

  if (!items && !error) return <FullPageLoader label="Carregando a galeria…" />

  return (
    <div className="space-y-4">
      <ConfigWarning />

      <div>
        <h1 className="section-title">Galeria da festa</h1>
        <p className="text-sm text-petroleum/60">
          {items?.length || 0} {items?.length === 1 ? 'registro' : 'registros'} · atualiza sozinha
        </p>
      </div>

      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`btn shrink-0 !px-4 !py-2 text-sm ${
              filter === f.id
                ? f.id === 'adult'
                  ? 'bg-petroleum text-cream'
                  : 'bg-tiffany text-petroleum'
                : 'border border-petroleum/15 bg-white/70 text-petroleum/70'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ErrorNote onRetry={load}>{error}</ErrorNote>

      {shown.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Images className="h-10 w-10 text-tiffany" aria-hidden="true" />
          <p className="font-display font-extrabold text-xl">The One With No Photos Yet</p>
          <p className="text-sm text-petroleum/60">Ainda não tem nada aqui. Seja o primeiro a cumprir uma missão. 😉</p>
        </div>
      ) : (
        <div className="masonry animate-fade-in">
          {shown.map((item) => (
            <MediaTile key={item.id} item={item} onOpen={setOpen} />
          ))}
        </div>
      )}

      <Modal open={Boolean(open)} onClose={() => setOpen(null)} title={open?.guests?.name || 'Missão'}>
        {open?.media_url &&
          (isVideoUrl(open.media_url) ? (
            <video src={open.media_url} controls autoPlay playsInline className="w-full rounded-xl" />
          ) : (
            <img src={open.media_url} alt="" className="w-full rounded-xl" />
          ))}
        <p className="mt-3 text-sm text-petroleum/70">{open?.challenges?.title}</p>
        {open?.caption && <p className="mt-1 text-petroleum">{open.caption}</p>}
        {open?.media_url && (
          <a
            href={open.media_url}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost mt-4 w-full"
          >
            Abrir em tamanho real
          </a>
        )}
      </Modal>
    </div>
  )
}
