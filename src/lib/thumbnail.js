/**
 * Geração de miniaturas no navegador.
 *
 * O arquivo original NUNCA é alterado — a miniatura é um segundo arquivo,
 * pequeno, usado só na galeria. Isso mantém a qualidade intacta no que a
 * Larissa vai guardar e evita que 40 celulares baixem as mídias inteiras
 * durante a festa.
 *
 * Tudo aqui falha em silêncio: se o navegador não der conta, devolve null
 * e o app volta a mostrar o arquivo original.
 */

const LADO_MAX = 720 // maior lado da miniatura, em pixels
const QUALIDADE = 0.72

function desenhar(fonte, largura, altura) {
  const escala = Math.min(LADO_MAX / largura, LADO_MAX / altura, 1)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(largura * escala)
  canvas.height = Math.round(altura * escala)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(fonte, 0, 0, canvas.width, canvas.height)
  return canvas
}

function paraBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', QUALIDADE)
  })
}

/** Miniatura de uma foto. */
async function deImagem(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = reject
      el.src = url
    })
    return await paraBlob(desenhar(img, img.naturalWidth, img.naturalHeight))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Miniatura de um vídeo: um quadro do começo vira a capa. */
async function deVideo(file) {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'metadata'
  video.src = url

  try {
    await new Promise((resolve, reject) => {
      const limite = setTimeout(() => reject(new Error('timeout')), 8000)
      video.onloadedmetadata = () => {
        // Um pouco depois do início: o primeiro quadro costuma ser preto.
        video.currentTime = Math.min(1, (video.duration || 2) / 4)
      }
      video.onseeked = () => {
        clearTimeout(limite)
        resolve()
      }
      video.onerror = () => {
        clearTimeout(limite)
        reject(new Error('video ilegível'))
      }
    })
    return await paraBlob(desenhar(video, video.videoWidth, video.videoHeight))
  } finally {
    URL.revokeObjectURL(url)
    video.removeAttribute('src')
    video.load()
  }
}

/**
 * Devolve um Blob JPEG pequeno, ou null se não der para gerar.
 * @param {File} file
 */
export async function gerarMiniatura(file) {
  try {
    if (file.type.startsWith('image/')) return await deImagem(file)
    if (file.type.startsWith('video/')) return await deVideo(file)
  } catch {
    // Formato exótico, vídeo que o navegador não decodifica, memória curta.
    // Segue sem miniatura.
  }
  return null
}
