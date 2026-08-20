import { Gift, Medal, Trophy } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConfigWarning, ErrorNote, FullPageLoader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { getRankingData, subscribeCompletions } from '../lib/api'
import { MAX_LIVRES_PONTUANDO, calcularRanking } from '../lib/ranking'

export default function Ranking() {
  const { guest } = useAuth()
  const [dados, setDados] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setDados(await getRankingData())
      setError(null)
    } catch (err) {
      setError(err.message || 'Não consegui carregar o ranking.')
    }
  }, [])

  useEffect(() => {
    load()
    return subscribeCompletions(load) // atualiza sozinho durante a festa
  }, [load])

  const lista = useMemo(
    () => (dados ? calcularRanking(dados.guests, dados.gallery) : []),
    [dados]
  )

  const eu = lista.find((p) => p.id === guest?.id)
  const comPontos = lista.filter((p) => p.pontos > 0)

  if (!dados && !error) return <FullPageLoader label="Carregando o ranking…" />

  return (
    <div className="space-y-4">
      <ConfigWarning />

      <div>
        <h1 className="section-title">Ranking</h1>
        <p className="text-sm text-petroleum/60">
          {comPontos.length} {comPontos.length === 1 ? 'convidado pontuando' : 'convidados pontuando'}{' '}
          · atualiza sozinho
        </p>
      </div>

      {/* ---------------- O prêmio ---------------- */}
      <section className="rounded-2xl border-2 border-pink/50 bg-pink/5 p-4">
        <div className="flex items-start gap-3">
          <Gift className="mt-0.5 h-7 w-7 shrink-0 text-pink" aria-hidden="true" />
          <div>
            <h2 className="font-display font-extrabold text-xl text-petroleum">
              O prêmio é o mini flamingo
            </h2>
            <p className="mt-1 text-sm text-petroleum/70">
              O filhote do flamingo da piscina vai embora com quem terminar a noite em primeiro
              lugar. Cumpra missões, some pontos e leve o bichinho pra casa.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- Sua posição ---------------- */}
      {eu && (
        <section className="card flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-petroleum/60">Você está em</p>
            <p className="font-display font-extrabold text-3xl leading-tight text-petroleum">
              {eu.pontos > 0 ? `${eu.posicao}º lugar` : 'Sem pontos ainda'}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display font-extrabold text-4xl text-gold">{eu.pontos}</p>
            <p className="text-xs text-petroleum/60">{eu.pontos === 1 ? 'ponto' : 'pontos'}</p>
          </div>
        </section>
      )}

      <ErrorNote onRetry={load}>{error}</ErrorNote>

      {/* ---------------- A classificação ---------------- */}
      {comPontos.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <Trophy className="h-10 w-10 text-tiffany" aria-hidden="true" />
          <p className="font-display font-extrabold text-xl">A disputa ainda não começou</p>
          <p className="text-sm text-petroleum/60">
            A primeira missão cumprida abre o placar.
          </p>
        </div>
      ) : (
        <ol className="space-y-2">
          {comPontos.map((p) => {
            const souEu = p.id === guest?.id
            const podio = p.posicao <= 3
            const cor =
              p.posicao === 1
                ? 'text-gold'
                : p.posicao === 2
                  ? 'text-petroleum/60'
                  : 'text-[#B07A42]'

            return (
              <li
                key={p.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                  souEu
                    ? 'border-tiffany bg-tiffany-soft'
                    : podio
                      ? 'border-gold/50 bg-white/85'
                      : 'border-petroleum/10 bg-white/70'
                }`}
              >
                <span className="flex w-9 shrink-0 items-center justify-center">
                  {podio ? (
                    <Medal
                      className={`h-6 w-6 ${cor}`}
                      strokeWidth={p.posicao === 1 ? 2.4 : 2}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="font-display font-extrabold text-lg text-petroleum/45">
                      {p.posicao}
                    </span>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display font-extrabold text-lg leading-tight text-petroleum">
                    {p.nome}
                    {souEu && <span className="ml-2 text-xs font-sans text-petroleum/50">você</span>}
                  </span>
                  <span className="text-xs text-petroleum/55">
                    {p.missoes} {p.missoes === 1 ? 'missão' : 'missões'}
                    {p.livres > 0 && ` · ${p.livres} ${p.livres === 1 ? 'livre' : 'livres'}`}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block font-display font-extrabold text-2xl text-gold">
                    {p.pontos}
                  </span>
                  <span className="text-[11px] text-petroleum/50">
                    {p.pontos === 1 ? 'ponto' : 'pontos'}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {/* ---------------- Como pontua ---------------- */}
      <section className="rounded-2xl border border-petroleum/10 bg-white/60 p-4">
        <h2 className="font-display font-extrabold text-lg text-petroleum">Como pontua</h2>
        <ul className="mt-2 space-y-1.5 text-sm text-petroleum/70">
          <li className="flex justify-between gap-3">
            <span>Missão fácil</span>
            <span className="font-medium text-gold">1 ponto</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Missão média</span>
            <span className="font-medium text-gold">2 pontos</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Missão difícil</span>
            <span className="font-medium text-gold">3 pontos</span>
          </li>
          <li className="flex justify-between gap-3">
            <span>Desafio livre</span>
            <span className="font-medium text-gold">1 ponto</span>
          </li>
        </ul>
        <p className="mt-3 text-xs text-petroleum/50">
          Só os {MAX_LIVRES_PONTUANDO} primeiros desafios livres pontuam — depois disso eles
          continuam indo para a galeria, mas não somam. Empate se resolve por quem chegou à
          pontuação primeiro.
        </p>
      </section>
    </div>
  )
}
