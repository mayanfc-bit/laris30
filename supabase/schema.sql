-- =====================================================================
-- Missão 30 — schema completo do Supabase
-- Rode este arquivo inteiro no SQL Editor do painel do Supabase.
--
-- ATENÇÃO: se você já rodou este script antes, apague as 3 últimas
-- linhas (o bloco "Realtime") antes de rodar de novo — o Postgres não
-- deixa adicionar a mesma tabela duas vezes na publicação.
-- Todo o resto pode rodar quantas vezes quiser.
-- =====================================================================

-- ---------- Extensões ----------
create extension if not exists "pgcrypto";

-- ---------- Tabelas ----------

create table if not exists public.guests (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  name_key        text not null unique,
  created_at      timestamptz not null default now(),
  passes_used     int  not null default 0,
  passes_18_used  int  not null default 0,
  accepted_18plus boolean not null default false
);

create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  type        text not null check (type in ('fixed', 'random', 'adult')),
  difficulty  text not null check (difficulty in ('easy', 'medium', 'hard', 'adult')),
  sort_order  int  not null default 0
);

create table if not exists public.completions (
  id            uuid primary key default gen_random_uuid(),
  guest_id      uuid not null references public.guests(id)     on delete cascade,
  challenge_id  uuid not null references public.challenges(id) on delete cascade,
  media_url     text,
  caption       text,
  completed_at  timestamptz not null default now(),
  is_manual     boolean not null default false
);

create table if not exists public.drawn_challenges (
  id           uuid primary key default gen_random_uuid(),
  guest_id     uuid not null references public.guests(id)     on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  drawn_at     timestamptz not null default now(),
  status       text not null default 'active' check (status in ('active', 'passed', 'completed'))
);

-- ---------- Índices ----------
create index if not exists idx_completions_guest on public.completions(guest_id);
create index if not exists idx_completions_at    on public.completions(completed_at desc);
create index if not exists idx_drawn_guest       on public.drawn_challenges(guest_id);
create index if not exists idx_drawn_status      on public.drawn_challenges(guest_id, status);

create unique index if not exists uq_completion_guest_challenge
  on public.completions(guest_id, challenge_id);

create unique index if not exists uq_challenges_title
  on public.challenges(title);

-- =====================================================================
-- RLS
-- A festa é aberta: não existe login real, todo mundo usa a chave
-- anônima. Por isso leitura e escrita ficam liberadas.
-- =====================================================================

alter table public.guests           enable row level security;
alter table public.challenges       enable row level security;
alter table public.completions      enable row level security;
alter table public.drawn_challenges enable row level security;

drop policy if exists "party_read_guests"   on public.guests;
drop policy if exists "party_insert_guests" on public.guests;
drop policy if exists "party_update_guests" on public.guests;
drop policy if exists "party_delete_guests" on public.guests;

create policy "party_read_guests"   on public.guests for select using (true);
create policy "party_insert_guests" on public.guests for insert with check (true);
create policy "party_update_guests" on public.guests for update using (true) with check (true);
create policy "party_delete_guests" on public.guests for delete using (true);

drop policy if exists "party_read_challenges"   on public.challenges;
drop policy if exists "party_insert_challenges" on public.challenges;
drop policy if exists "party_update_challenges" on public.challenges;
drop policy if exists "party_delete_challenges" on public.challenges;

create policy "party_read_challenges"   on public.challenges for select using (true);
create policy "party_insert_challenges" on public.challenges for insert with check (true);
create policy "party_update_challenges" on public.challenges for update using (true) with check (true);
create policy "party_delete_challenges" on public.challenges for delete using (true);

drop policy if exists "party_read_completions"   on public.completions;
drop policy if exists "party_insert_completions" on public.completions;
drop policy if exists "party_update_completions" on public.completions;
drop policy if exists "party_delete_completions" on public.completions;

create policy "party_read_completions"   on public.completions for select using (true);
create policy "party_insert_completions" on public.completions for insert with check (true);
create policy "party_update_completions" on public.completions for update using (true) with check (true);
create policy "party_delete_completions" on public.completions for delete using (true);

drop policy if exists "party_read_drawn"   on public.drawn_challenges;
drop policy if exists "party_insert_drawn" on public.drawn_challenges;
drop policy if exists "party_update_drawn" on public.drawn_challenges;
drop policy if exists "party_delete_drawn" on public.drawn_challenges;

create policy "party_read_drawn"   on public.drawn_challenges for select using (true);
create policy "party_insert_drawn" on public.drawn_challenges for insert with check (true);
create policy "party_update_drawn" on public.drawn_challenges for update using (true) with check (true);
create policy "party_delete_drawn" on public.drawn_challenges for delete using (true);

-- =====================================================================
-- Storage: bucket público party-media (100 MB por arquivo)
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('party-media', 'party-media', true, 104857600)
on conflict (id) do update set public = true, file_size_limit = 104857600;

drop policy if exists "party_media_read"   on storage.objects;
drop policy if exists "party_media_write"  on storage.objects;
drop policy if exists "party_media_update" on storage.objects;
drop policy if exists "party_media_delete" on storage.objects;

create policy "party_media_read"   on storage.objects for select using (bucket_id = 'party-media');
create policy "party_media_write"  on storage.objects for insert with check (bucket_id = 'party-media');
create policy "party_media_update" on storage.objects for update using (bucket_id = 'party-media') with check (bucket_id = 'party-media');
create policy "party_media_delete" on storage.objects for delete using (bucket_id = 'party-media');

-- =====================================================================
-- Desafios — 114 no total (3 fixos, 99 sorteados, 12 adultos)
-- =====================================================================

insert into public.challenges (title, description, type, difficulty, sort_order) values
-- ---------- Fixos ----------
('Tire uma foto espontânea da Larissa (sem ela saber!)', 'Modo paparazzi ativado. Nada de posar — tem que ser flagrante.', 'fixed', 'easy', 1),
('Grave um vídeo durante os parabéns', 'Câmera na mão na hora do bolo. Pode cantar junto (desafinado vale).', 'fixed', 'easy', 2),
('Escreva no livrinho das memórias', 'Essa é offline: escreva no livrinho e marque como concluída aqui.', 'fixed', 'easy', 3),

-- ---------- Sorteados: Fácil ----------
('Tire uma selfie com alguém que você acabou de conhecer hoje', 'Amizade nova, foto nova.', 'random', 'easy', 10),
('Grave um conselho de vida de 15 segundos para a Larissa', 'Pode ser sábio, pode ser péssimo. Só tem que ser sincero.', 'random', 'easy', 11),
('Faça uma foto criativa com a decoração da festa', 'Use a decoração como cenário — capriche no ângulo.', 'random', 'easy', 12),
('Dance 10 segundos de uma música dos anos 2000 e grave', 'Volta pro auge. Sem vergonha.', 'random', 'easy', 13),
('Encontre alguém que você não via há mais de 1 ano — tire foto juntos', 'Reencontro registrado.', 'random', 'easy', 14),
('Faça uma pose dramática em frente à mesa de doces', 'Novela das nove, mas com brigadeiro.', 'random', 'easy', 15),
('Imite uma mania que você acha que a Larissa tem — use a imaginação!', 'Grave a imitação. Quanto mais exagerado, melhor.', 'random', 'easy', 16),
('Dance de um jeito que te lembre a Larissa e grave', 'Interprete a aniversariante em forma de dança.', 'random', 'easy', 17),

-- ---------- Sorteados: Médio ----------
('Monte um grupo de pelo menos 5 pessoas e façam uma pose temática juntos', 'Escolha um tema e comprometa todo mundo.', 'random', 'medium', 20),
('Recrie uma foto antiga com a Larissa', 'Mesma pose, mesma cara. O tempo passou, a foto não.', 'random', 'medium', 21),
('Faça um brinde em outro idioma (pode ser inventado!)', 'Sotaque conta pontos.', 'random', 'medium', 22),
('Grave um mini-discurso dramático sobre a importância dos 30 anos', 'Emoção, pausa, olhar ao longe. Vai.', 'random', 'medium', 23),
('Adivinhe a música com alguém assobiando — grave o processo', 'Grave a tentativa, acertando ou não.', 'random', 'medium', 24),
('Entreviste um convidado que você nunca falou antes', 'Três perguntas no mínimo. Vale microfone imaginário.', 'random', 'medium', 25),
('Invente uma frase que você acha que a Larissa diria com 80 anos e grave', 'Projeção de futuro em forma de bordão.', 'random', 'medium', 26),
('Faça uma mímica de como a Larissa reagiria ao ganhar um presente e peça pra alguém adivinhar', 'Sem falar. Só reação.', 'random', 'medium', 27),

-- ---------- Sorteados: Difícil ----------
('Faça um caraokê surpresa: cante 30 segundos ao vivo e grave', 'Ao vivo, sem playback, sem desculpa.', 'random', 'hard', 30),
('Ensine um passo de dança para pelo menos 3 pessoas e grave', 'Coreografia coletiva improvisada.', 'random', 'hard', 31),
('Grave uma mensagem para a Larissa abrir daqui a 10 anos', 'Cápsula do tempo em vídeo.', 'random', 'hard', 32),
('Faça uma declaração de amor platônica para a aniversariante em público', 'Voz alta. Plateia obrigatória.', 'random', 'hard', 33),
('Convença 4 pessoas a tirarem uma foto em formação de pirâmide', 'Segurança em primeiro lugar, foto em segundo.', 'random', 'hard', 34),
('Recrie do seu jeito como você imagina que foi o dia em que a Larissa nasceu — pode ser dramático!', 'Encenação livre. Elenco à vontade.', 'random', 'hard', 35),
('Apresente a Larissa como se ela fosse uma celebridade entrando num tapete vermelho', 'Locução completa, com nome artístico.', 'random', 'hard', 36),

-- ---------- Stand de bebidas ----------
('Peça um drink surpresa pro bartender e grave sua cara no primeiro gole', 'Sem escolher. O que vier, vem.', 'random', 'easy', 100),
('Faça um brinde com 3 pessoas que você acabou de conhecer', 'Copo levantado, nomes novos.', 'random', 'easy', 101),
('Alinhe os copos mais coloridos que achar e faça uma foto estilo cardápio', 'Fotografia gastronômica improvisada.', 'random', 'easy', 102),
('Fotografe o bartender em ação', 'Ele também faz parte da noite.', 'random', 'easy', 103),
('Invente um drink com o nome da Larissa e apresente ele ao bartender', 'Ingredientes a seu critério. Nome tem que ser bom.', 'random', 'medium', 104),
('Grave um comercial de 15 segundos vendendo o drink que está na sua mão', 'Slogan obrigatório.', 'random', 'medium', 105),
('Convença quem está no bar a mandar um recado em vídeo para a Larissa', 'Vale mais de uma pessoa no mesmo vídeo.', 'random', 'medium', 106),

-- ---------- Banda de pagode ----------
('Grave 15 segundos da banda tocando com a galera cantando junto', 'Som ambiente incluso.', 'random', 'easy', 110),
('Grave o refrão que a festa inteira cantou mais alto', 'Você vai saber qual é quando acontecer.', 'random', 'easy', 111),
('Grave alguém tocando (ou fingindo tocar) um instrumento de pagode', 'Pandeiro imaginário conta.', 'random', 'easy', 112),
('Peça uma música para a banda e grave o momento do pedido', 'A reação deles é parte do registro.', 'random', 'medium', 113),
('Tire uma foto com um integrante da banda', 'Aproveita o intervalo.', 'random', 'medium', 114),
('Grave a Larissa cantando junto com a banda', 'Sem avisar, de preferência.', 'random', 'medium', 115),
('Faça uma foto capa de DVD ao vivo com o palco no fundo', 'Pose de encarte. Compromisso total.', 'random', 'medium', 116),
('Puxe um coro na roda de pagode e grave a galera respondendo', 'Você começa, a festa responde.', 'random', 'hard', 117),

-- ---------- Piscina ----------
('Fotografe o reflexo da festa na água', 'A festa vista de outro ângulo.', 'random', 'easy', 120),
('Enfileire o máximo de pés que conseguir na borda e fotografe', 'Quantos couberem no enquadramento.', 'random', 'easy', 121),
('Faça uma pose de sereia dramática na beirada da piscina', 'Cabelo ao vento é opcional.', 'random', 'easy', 122),
('Grave alguém pulando na piscina em câmera lenta', 'Use o slow motion do celular.', 'random', 'medium', 123),
('Grave o primeiro que caiu (ou foi empurrado) na água', 'Momento histórico da noite.', 'random', 'medium', 124),
('Foto da piscina vista de cima com o máximo de gente dentro', 'Suba num lugar seguro e enquadre.', 'random', 'medium', 125),

-- ---------- Flamingo inflável ----------
('Tire uma foto abraçado com o flamingo inflável', 'Ele é o mascote da festa.', 'random', 'easy', 130),
('Dê um nome pro flamingo e apresente ele em vídeo', 'Nome completo, com sobrenome.', 'random', 'easy', 131),
('Grave alguém tentando subir no flamingo girante — e o resultado', 'O resultado é sempre bom.', 'random', 'medium', 132),
('Foto de 3 pessoas dividindo o flamingo ao mesmo tempo', 'Equilíbrio coletivo.', 'random', 'medium', 133),
('Tire uma foto da Larissa com o flamingo', 'Os dois protagonistas juntos.', 'random', 'medium', 134),
('Grave alguém girando no flamingo por 5 segundos sem cair', 'Cinco segundos. Cronometrados.', 'random', 'hard', 135),

-- ---------- Futebol de sabão ----------
('Grave o tombo mais engraçado da partida', 'Vai ter concorrência.', 'random', 'easy', 140),
('Grave a torcida gritando na beira do campo', 'O jogo é lá, o barulho é aqui.', 'random', 'easy', 141),
('Narre 20 segundos de jogo como locutor esportivo', 'Grite o gol mesmo que não tenha gol.', 'random', 'medium', 142),
('Foto do time inteiro coberto de espuma', 'Time posado, espuma escorrendo.', 'random', 'medium', 143),
('Entreviste o craque da partida no fim do jogo', 'Microfone imaginário, pergunta séria.', 'random', 'medium', 144),
('Faça um gol e comemore como jogador profissional — grave', 'Comemoração ensaiada vale mais.', 'random', 'hard', 145),

-- ---------- Mesa de decoração ----------
('Fotografe o detalhe da decoração que você achou mais bonito', 'Um detalhe só. Bem de perto.', 'random', 'easy', 150),
('Foto da mesa de decoração completa, antes de alguém bagunçar', 'Registro do estado original.', 'random', 'easy', 151),
('Tire uma foto sua ao lado do letreiro L30', 'Clássico obrigatório.', 'random', 'easy', 152),
('Foto do bolo antes do primeiro corte', 'Depois disso não volta mais.', 'random', 'easy', 153),
('Fotografe o doce mais bonito da mesa — e depois de você comer ele', 'Antes e depois. Duas fotos numa.', 'random', 'easy', 154),
('Apresente a mesa de decoração em vídeo como se fosse um programa de decoração', 'Voz de apresentador, gesto de mão.', 'random', 'medium', 155),

-- ---------- Lambe-lambe ----------
('Tire uma foto no lambe-lambe e fotografe a foto revelada', 'Foto da foto. Meta.', 'random', 'easy', 160),
('Fotografe quem está operando o lambe-lambe trabalhando', 'Quem registra também merece registro.', 'random', 'easy', 161),
('Faça uma foto no lambe-lambe com alguém que você conheceu hoje', 'Amizade impressa em papel.', 'random', 'medium', 162),
('Monte um grupo de 6 pessoas no lambe-lambe', 'Todo mundo tem que caber.', 'random', 'medium', 163),
('Tire uma foto no lambe-lambe imitando a pose típica da Larissa', 'Você sabe qual é.', 'random', 'medium', 164),

-- ---------- Caderninho de memórias ----------
('Fotografe a página que você escreveu no caderninho', 'Sua letra, eternizada duas vezes.', 'random', 'easy', 170),
('Fotografe alguém escrevendo no caderninho, concentrado, sem perceber', 'Momento sincero.', 'random', 'easy', 171),
('Convença alguém que ainda não escreveu no caderninho a escrever — e grave', 'Missão de recrutamento.', 'random', 'medium', 172),
('Grave você lendo em voz alta o que escreveu no caderninho', 'Coragem de ler o que escreveu.', 'random', 'hard', 173),

-- ---------- Com a Larissa ----------
('Tire uma foto espontânea da Larissa rindo', 'Rindo de verdade, não de foto.', 'random', 'easy', 180),
('Faça uma foto 3x4 bem séria ao lado da Larissa', 'Zero sorriso. Documento oficial.', 'random', 'easy', 181),
('Faça a pose mais ridícula que você conseguir com a Larissa', 'Sem limite de vergonha.', 'random', 'medium', 182),
('Foto de vocês dois imitando a expressão um do outro', 'Espelho humano.', 'random', 'medium', 183),
('Grave um vídeo de 20 segundos falando o que a Larissa significa pra você', 'Pode embargar a voz.', 'random', 'medium', 184),
('Grave a Larissa recebendo um abraço surpresa por trás', 'A reação é o registro.', 'random', 'medium', 185),
('Fotografe a Larissa com a família', 'Junte todo mundo antes que dispersem.', 'random', 'medium', 186),
('Grave a Larissa dançando sem saber que está sendo filmada', 'Modo documentarista.', 'random', 'medium', 187),
('Grave o momento exato em que a Larissa sopra a vela', 'Não pisca. Não perde.', 'random', 'medium', 188),
('Foto de vocês dois com o flamingo', 'Trio completo.', 'random', 'medium', 189),
('Grave uma pergunta para a Larissa responder só daqui a 10 anos', 'Cápsula do tempo em forma de pergunta.', 'random', 'hard', 190),
('Peça pra Larissa contar em 15 segundos a melhor lembrança que tem com você', 'Grave a resposta inteira.', 'random', 'hard', 191),

-- ---------- Gente e grupos ----------
('Tire uma foto com alguém que você nunca viu antes na vida', 'Hoje vocês se conheceram.', 'random', 'easy', 200),
('Fotografe o grupo mais barulhento da festa', 'Você já sabe qual é.', 'random', 'easy', 201),
('Reúna todo mundo que está com a mesma cor de roupa e faça uma foto', 'Time por cor.', 'random', 'medium', 202),
('Foto com a pessoa mais bem vestida da noite — e diga por quê', 'Justificativa na legenda.', 'random', 'medium', 203),
('Foto com quem veio de mais longe para estar aqui', 'Pergunte por aí até achar.', 'random', 'medium', 204),
('Foto com quem conhece a Larissa há mais tempo', 'Investigação necessária.', 'random', 'medium', 205),
('Reúna 8 pessoas para um pulo sincronizado', 'Todo mundo no ar ao mesmo tempo.', 'random', 'hard', 206),
('Grave 5 pessoas diferentes dizendo uma palavra só sobre a Larissa', 'Cinco palavras, um vídeo.', 'random', 'hard', 207),

-- ---------- Momentos que ninguém registra ----------
('Fotografe a festa do canto mais afastado que você conseguir chegar', 'A festa inteira num quadro só.', 'random', 'easy', 210),
('Grave 10 segundos só do som ambiente da festa, sem falar nada', 'O barulho da noite, puro.', 'random', 'easy', 211),
('Fotografe os sapatos abandonados pela festa', 'Sinal de que a coisa pegou.', 'random', 'easy', 212),
('Fotografe a mesa depois que a festa já detonou tudo', 'O antes e depois da mesa.', 'random', 'easy', 213),
('Fotografe o céu agora — o horário exato dessa festa', 'Registro do momento.', 'random', 'easy', 214),
('Fotografe quem está nos bastidores fazendo tudo acontecer', 'Cozinha, apoio, quem serve. Eles nunca aparecem.', 'random', 'medium', 215),
('Fotografe duas pessoas conversando sério num canto', 'De longe, sem interromper.', 'random', 'medium', 216),
('Grave o último que sair da pista de dança', 'Missão de fim de noite.', 'random', 'hard', 217),

-- ---------- 18+ ----------
('Faça uma dança sensual com a pessoa mais próxima de você agora', 'Consentimento primeiro, gingado depois.', 'adult', 'adult', 40),
('Dê um beijo na bochecha de alguém inesperado e grave a reação', 'A reação é a parte boa.', 'adult', 'adult', 41),
('Imite um gênio da lâmpada e conceda 3 desejos para alguém — os mais picantes possível', 'Seus desejos são ordens.', 'adult', 'adult', 42),
('Cante uma música romântica olhando nos olhos de alguém por 30 segundos', 'Sem desviar o olhar.', 'adult', 'adult', 43),
('Invente um codinome sedutor para a aniversariante e apresente ao grupo', 'Anúncio oficial, em voz alta.', 'adult', 'adult', 44),
('Faça uma pose de capa de revista adulta com quem estiver do seu lado', 'Editorial de luxo, produção zero.', 'adult', 'adult', 45),
('Dance coladinho com alguém na roda de pagode e grave', 'Pagode pede proximidade.', 'adult', 'adult', 220),
('Grave alguém contando o perrengue mais vergonhoso da vida', 'Sem editar depois.', 'adult', 'adult', 221),
('Faça uma pose de calendário com o flamingo', 'Mês de dezembro, capricho total.', 'adult', 'adult', 222),
('Peça um beijo no rosto de 3 pessoas seguidas e grave a sequência', 'Três em sequência, sem cortes.', 'adult', 'adult', 223),
('Grave a pior cantada da sua vida, feita com total convicção', 'Quanto pior, melhor.', 'adult', 'adult', 224),
('Faça uma pose de propaganda de cerveja na beira da piscina', 'Olhar ao longe, garrafa na mão.', 'adult', 'adult', 225)
on conflict (title) do update
  set description = excluded.description,
      type        = excluded.type,
      difficulty  = excluded.difficulty,
      sort_order  = excluded.sort_order;

-- =====================================================================
-- Realtime — as 3 linhas que NÃO podem rodar duas vezes.
-- Se você já rodou este script antes, apague daqui pra baixo.
-- =====================================================================

alter publication supabase_realtime add table public.completions;
alter publication supabase_realtime add table public.guests;
alter publication supabase_realtime add table public.drawn_challenges;
