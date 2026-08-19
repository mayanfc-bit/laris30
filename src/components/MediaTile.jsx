import { BookHeart, PlayCircle } from 'lucide-react'

const VIDEO_EXT = /\.(mp4|mov|webm|m4v|avi|mkv|3gp)(\?|$)/i
export const isVideoUrl = (url) => Boolean(url) && VIDEO_EXT.test(url)

/** Card de uma conclusão na galeria / no perfil. */
export default function MediaTile({ item, showAuthor = true, onOpen }) {
  const url = item.media_url
  const video = isVideoUrl(url)
  const author = item.guests?.name
  const title = item.challenges?.title
  const adult = item.challenges?.type === 'adult'

  return (
    <figure
      className={`overflow-hidden rounded-2xl border bg-white/85 shadow-card ${
        adult ? 'border-pink/45' : 'border-gold/35'
      }`}
    >
      {url ? (
        <button
          type="button"
          onClick={() => onOpen?.(item)}
          className="relative block w-full"
          aria-label={`Abrir mídia de ${author || 'convidado'}`}
        >
          {video ? (
            <>
              <video src={url} className="w-full" preload="metadata" muted playsInline />
              <span className="absolute inset-0 flex items-center justify-center bg-petroleum/25">
                <PlayCircle className="h-12 w-12 text-white/90" aria-hidden="true" />
              </span>
            </>
          ) : (
            <img src={url} alt={title || 'Missão'} loading="lazy" className="w-full" />
          )}
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-tiffany-soft p-5 text-petroleum/70">
          <BookHeart className="h-6 w-6 text-gold" aria-hidden="true" />
          <span className="text-sm">Missão marcada manualmente</span>
        </div>
      )}

      <figcaption className="space-y-1 p-3">
        {showAuthor && author && (
          <p className="font-display font-bold text-lg leading-tight text-petroleum">{author}</p>
        )}
        {title && <p className="text-xs leading-snug text-petroleum/60">{title}</p>}
        {item.caption && <p className="text-sm text-petroleum/80">{item.caption}</p>}
        {adult && <span className="badge bg-pink/10 text-pink">18+</span>}
      </figcaption>
    </figure>
  )
}
