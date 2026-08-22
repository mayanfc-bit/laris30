/**
 * Pontuação da disputa pelo mini flamingo.
 *
 * A regra é simples de explicar em voz alta no meio da festa:
 * cada missão vale de 1 a 3 pontos, conforme a dificuldade.
 */

export const PONTOS_POR_NIVEL = { easy: 1, medium: 2, hard: 3, adult: 3 }

/** Desafio livre vale 1 ponto, sem limite de quantos contam. */
export const PONTOS_LIVRE = 1

export const rotuloNivel = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil', adult: 'Difícil' }

/**
 * Monta a classificação a partir dos convidados e de todos os envios.
 * @param {Array} guests   linhas de guests
 * @param {Array} gallery  completions com challenges(difficulty) embutido
 */
export function calcularRanking(guests = [], gallery = []) {
  const porConvidado = new Map(
    guests.map((g) => [
      g.id,
      {
        id: g.id,
        nome: g.name,
        pontos: 0,
        missoes: 0,
        livres: 0,
        ultimoEnvio: null,
      },
    ])
  )

  // Do mais antigo para o mais novo: assim o teto dos livres premia
  // quem registrou primeiro, e o desempate fica coerente.
  const ordenados = [...gallery].sort(
    (a, b) => new Date(a.completed_at) - new Date(b.completed_at)
  )

  for (const item of ordenados) {
    const p = porConvidado.get(item.guest_id)
    if (!p) continue

    p.missoes += 1
    p.ultimoEnvio = item.completed_at

    if (item.challenge_id) {
      p.pontos += PONTOS_POR_NIVEL[item.challenges?.difficulty] ?? 1
    } else {
      p.livres += 1
      p.pontos += PONTOS_LIVRE
    }
  }

  const lista = [...porConvidado.values()].sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    // Empate: ganha quem chegou lá primeiro.
    if (a.ultimoEnvio && b.ultimoEnvio) return new Date(a.ultimoEnvio) - new Date(b.ultimoEnvio)
    if (a.ultimoEnvio) return -1
    if (b.ultimoEnvio) return 1
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })

  // Posição com empate real: mesma pontuação, mesma colocação.
  let posicao = 0
  let anterior = null
  return lista.map((p, i) => {
    if (p.pontos !== anterior) {
      posicao = i + 1
      anterior = p.pontos
    }
    return { ...p, posicao }
  })
}
