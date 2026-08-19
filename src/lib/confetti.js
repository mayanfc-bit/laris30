import confetti from 'canvas-confetti'

export const PARTY_COLORS = ['#81D8D0', '#B9E8E3', '#C99A4A', '#E2336B', '#145A63', '#F8F4EE']

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Estouro rápido — usado ao concluir uma missão. */
export function burst(origin = { x: 0.5, y: 0.6 }) {
  if (reduced()) return
  confetti({ particleCount: 90, spread: 75, origin, colors: PARTY_COLORS, scalar: 0.9 })
  setTimeout(
    () => confetti({ particleCount: 50, spread: 100, origin, colors: PARTY_COLORS, scalar: 0.7 }),
    140
  )
}

/** Chuva suave e contínua — usada na tela de boas-vindas. */
export function rain(durationMs = 2600) {
  if (reduced()) return () => {}
  const end = Date.now() + durationMs
  let raf
  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      colors: PARTY_COLORS,
      scalar: 0.8,
    })
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      colors: PARTY_COLORS,
      scalar: 0.8,
    })
    if (Date.now() < end) raf = requestAnimationFrame(frame)
  }
  frame()
  return () => raf && cancelAnimationFrame(raf)
}
