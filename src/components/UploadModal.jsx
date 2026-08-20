import { Camera, ImagePlus, PartyPopper, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { completeChallenge, uploadMedia, uploadThumbnail } from '../lib/api'
import { gerarMiniatura } from '../lib/thumbnail'
import { burst } from '../lib/confetti'
import { ErrorNote, Modal, Spinner } from './ui'

const CHEERS = [
  'Missão cumprida! A Larissa agradece.',
  'Registrado! Isso vai render história.',
  'Boa! Mais uma pra galeria da festa.',
  'Enviado! Você tá jogando bonito hoje.',
  'PIVOT! Deu certo, tá salvo.',
  'How you doin’? Missão registrada.',
  'Could this BE any more cumprida?',
  'Guardado no Central Perk da festa.',
]

export default function UploadModal({ open, onClose, guest, challenge, livre = false, onDone }) {
  const [file, setFile] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const cameraRef = useRef(null)
  const fileRef = useRef(null)

  const adult = false

  // Limpa tudo a cada abertura e revoga a URL do preview ao sair.
  useEffect(() => {
    if (open) {
      setFile(null)
      setPreview(null)
      setTitulo('')
      setCaption('')
      setBusy(false)
      setProgress(0)
      setError(null)
      setSuccess(null)
    }
  }, [open, challenge?.id])

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  function choose(e) {
    const f = e.target.files?.[0]
    e.target.value = '' // permite reescolher o mesmo arquivo
    if (!f) return
    setError(null)
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submit() {
    if (!file || busy) return
    setBusy(true)
    setError(null)
    try {
      // A miniatura sai antes: se falhar, o envio segue sem ela.
      const mini = await gerarMiniatura(file)
      const mediaUrl = await uploadMedia(guest.id, file, (p) => setProgress(p * 0.9))
      const thumbUrl = await uploadThumbnail(guest.id, mini)
      setProgress(100)
      await completeChallenge({
        guestId: guest.id,
        challengeId: livre ? null : challenge.id,
        customTitle: livre ? titulo : null,
        mediaUrl,
        thumbUrl,
        caption,
      })
      burst()
      setSuccess(CHEERS[Math.floor(Math.random() * CHEERS.length)])
      onDone?.()
    } catch (err) {
      setError(err.message || 'Não deu pra enviar. Tenta de novo?')
    } finally {
      setBusy(false)
      setProgress(0)
    }
  }

  const isVideo = file?.type?.startsWith('video/')
  const sizeMb = file ? (file.size / 1024 / 1024).toFixed(1) : null

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={success ? 'Enviado!' : livre ? 'Criar meu desafio' : 'Enviar missão'}
      tone={adult ? 'dark' : 'light'}
      footer={
        success ? null : (
          <div className="space-y-2">
            {busy && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-petroleum/10">
                <div
                  className="h-full rounded-full bg-tiffany transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            <button
              className="btn-gold w-full"
              onClick={submit}
              disabled={!file || busy || (livre && !titulo.trim())}
            >
              {busy ? (
                <>
                  <Spinner /> Enviando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Enviar missão
                </>
              )}
            </button>
          </div>
        )
      }
    >
      {success ? (
        <div className="flex flex-col items-center gap-4 py-6 text-center animate-pop-in">
          <PartyPopper className="h-14 w-14 text-gold" aria-hidden="true" />
          <p className="font-display font-extrabold text-2xl">{success}</p>
          <p className="text-sm text-petroleum/60">{livre ? titulo : challenge?.title}</p>
          <button className="btn-primary mt-2 w-full" onClick={onClose}>
            Voltar para as missões
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {livre ? (
            <label className="block">
              <span className="mb-1 block text-sm text-petroleum/70">
                O que você quer registrar?
              </span>
              <input
                className="input"
                maxLength={90}
                placeholder="Ex: A dança do meu tio na pista"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                disabled={busy}
                autoFocus
              />
            </label>
          ) : (
            <p className="text-sm text-petroleum/70">{challenge?.title}</p>
          )}

          {preview ? (
            <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-black/5">
              {isVideo ? (
                <video src={preview} controls playsInline className="max-h-[45dvh] w-full" />
              ) : (
                <img src={preview} alt="Prévia do envio" className="max-h-[45dvh] w-full object-contain" />
              )}
              <button
                onClick={() => {
                  URL.revokeObjectURL(preview)
                  setFile(null)
                  setPreview(null)
                }}
                disabled={busy}
                className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-petroleum shadow"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Trocar
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button className="btn-primary flex-col !py-6" onClick={() => cameraRef.current?.click()}>
                <Camera className="h-6 w-6" />
                Usar câmera
              </button>
              <button className="btn-ghost flex-col !py-6" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-6 w-6" />
                Da galeria
              </button>
            </div>
          )}

          <input
            ref={cameraRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="hidden"
            onChange={choose}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={choose}
          />

          {file && (
            <p className={`text-xs ${adult ? 'text-cream/60' : 'text-petroleum/50'}`}>
              {isVideo ? 'Vídeo' : 'Foto'} • {sizeMb} MB {Number(sizeMb) > 200 && '(acima do limite!)'}
            </p>
          )}

          <label className="block">
            <span className={`mb-1 block text-sm ${adult ? 'text-cream/80' : 'text-petroleum/70'}`}>
              Legenda <span className="opacity-60">(opcional)</span>
            </span>
            <textarea
              className="input min-h-[72px] resize-none"
              maxLength={280}
              placeholder="Conta o que rolou…"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={busy}
            />
          </label>

          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Modal>
  )
}
