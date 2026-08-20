/** Regras das conquistas do perfil. Tudo derivado do estado, nada salvo no banco. */

const RULES = [
  {
    id: 'primeira',
    label: 'Primeira missão',
    hint: 'Enviou a primeira missão da noite.',
    test: ({ completions }) => completions.length >= 1,
  },
  {
    id: 'parabens',
    label: 'Passou nos parabéns',
    hint: 'Gravou o vídeo dos parabéns.',
    test: ({ completions, challengeById }) =>
      completions.some((c) => challengeById.get(c.challenge_id)?.title?.includes('parabéns')),
  },
  {
    id: 'memorias',
    label: 'Deixou registrado',
    hint: 'Escreveu no livrinho das memórias.',
    test: ({ completions }) => completions.some((c) => c.is_manual),
  },
  {
    id: 'paparazzi',
    label: 'Paparazzi oficial',
    hint: 'Flagrou a Larissa sem ela saber.',
    test: ({ completions, challengeById }) =>
      completions.some((c) => challengeById.get(c.challenge_id)?.title?.includes('espontânea')),
  },
  {
    id: 'trio',
    label: 'Trio de ouro',
    hint: 'Completou as 3 missões fixas.',
    test: ({ completions, challengeById }) =>
      completions.filter((c) => challengeById.get(c.challenge_id)?.type === 'fixed').length >= 3,
  },
  {
    id: 'maratona',
    label: 'Maratonista',
    hint: 'Cinco missões ou mais na conta.',
    test: ({ completions }) => completions.length >= 5,
  },
  {
    id: 'lenda',
    label: 'Lenda da festa',
    hint: 'Dez missões ou mais. Respeito.',
    test: ({ completions }) => completions.length >= 10,
  },
  {
    id: 'semmedo',
    label: 'Sem medo',
    hint: 'Nao pulou nenhuma missao.',
    test: ({ guest, completions }) =>
      completions.length >= 3 && (guest?.passes_used ?? 0) === 0,
  },
  {
    id: 'dificil',
    label: 'Modo difícil',
    hint: 'Completou uma missão difícil.',
    test: ({ completions, challengeById }) =>
      completions.some((c) => challengeById.get(c.challenge_id)?.difficulty === 'hard'),
  },
]

export function computeBadges({ guest, completions, challenges }) {
  const challengeById = new Map((challenges || []).map((c) => [c.id, c]))
  const ctx = { guest, completions: completions || [], challengeById }
  return RULES.map((r) => ({
    id: r.id,
    label: r.label,
    hint: r.hint,
    earned: (() => {
      try {
        return Boolean(r.test(ctx))
      } catch {
        return false
      }
    })(),
  }))
}
