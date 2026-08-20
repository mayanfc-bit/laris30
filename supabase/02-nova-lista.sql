-- =====================================================================
-- Missão 30 — atualização 2
--
-- O que este script faz:
--   1. Cria suporte a "desafio livre" (o convidado registra algo que não
--      está na lista)
--   2. Preserva os envios que já existem antes de trocar a lista
--   3. Substitui os 114 desafios antigos pelos 63 novos
--   4. Encerra a seção 18+
--
-- Rode inteiro no SQL Editor do Supabase, de uma vez só.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Estrutura para o desafio livre
-- ---------------------------------------------------------------------
-- O envio livre não aponta para nenhum desafio da lista: guarda o título
-- que a própria pessoa escreveu.
alter table public.completions alter column challenge_id drop not null;
alter table public.completions add column if not exists custom_title text;

-- A trava de "um envio por desafio" passa a valer só para os desafios da
-- lista. Desafio livre pode ter quantos a pessoa quiser.
drop index if exists uq_completion_guest_challenge;
create unique index uq_completion_guest_challenge
  on public.completions (guest_id, challenge_id)
  where challenge_id is not null;

-- ---------------------------------------------------------------------
-- 2. Preserva o que já foi enviado
-- ---------------------------------------------------------------------
-- Sem isso, apagar a lista antiga apagaria junto as fotos já enviadas,
-- porque completions tem "on delete cascade" para challenges.
-- Cada envio antigo vira um registro livre, guardando o nome do desafio.
update public.completions c
set custom_title = ch.title,
    challenge_id = null
from public.challenges ch
where c.challenge_id = ch.id;

-- ---------------------------------------------------------------------
-- 3. Limpa a lista antiga
-- ---------------------------------------------------------------------
delete from public.drawn_challenges;
delete from public.challenges;

-- ---------------------------------------------------------------------
-- 4. Nova lista — 63 desafios (10 fixos, 53 sorteados)
-- ---------------------------------------------------------------------
insert into public.challenges (title, description, type, difficulty, sort_order) values

-- ---------- Fixos: valem para todos ----------
('Tire uma foto espontânea da Larissa (sem ela saber!)', 'De preferência, rindo de verdade.', 'fixed', 'easy', 1),
('Envie um vídeo dos parabéns — se você tiver', 'Algo rápido. Vá aproveitar a festa!', 'fixed', 'easy', 2),
('Escreva no livrinho das memórias', 'Essa é offline: escreva no livrinho e marque como concluída aqui.', 'fixed', 'easy', 3),
('Tire uma foto com a Larissa', 'Vocês dois no mesmo quadro. Simples assim.', 'fixed', 'easy', 4),
('Grave um vídeo dizendo o que você mais admira na Larissa', 'Eu sei que é difícil escolher só uma coisa.', 'fixed', 'medium', 5),
('Bata uma foto provando que você já segue a @trevoacaiimprensa', 'Ela sempre sabe...', 'fixed', 'easy', 6),
('Filme a Larissa fazendo um discurso ou alguém fazendo um discurso pra ela', 'Na hora dos parabéns.', 'fixed', 'medium', 7),
('Tire uma foto no lambe-lambe', 'Foto da foto. Meta.', 'fixed', 'easy', 8),
('Bata uma foto do momento exato em que a Larissa sopra a vela', 'Não pisca. Não perde.', 'fixed', 'easy', 9),
('Conte sua melhor ou mais engraçada lembrança com a Larissa', 'Se não tiver, invente uma.', 'fixed', 'medium', 10),

-- ---------- Sorteados ----------
('Tire uma selfie com alguém que você conheceu hoje', 'Amizade nova, foto nova.', 'random', 'easy', 20),
('Grave um conselho de vida de 15 a 30 segundos para a Larissa', 'Pode ser sábio, pode ser péssimo. Só tem que ser sincero.', 'random', 'medium', 21),
('Faça uma foto criativa com a decoração da festa', 'Use a decoração como cenário — capriche no ângulo.', 'random', 'easy', 22),
('Grave um vídeo imitando uma mania que você acha que a Larissa tem', 'Quanto mais exagerado, melhor.', 'random', 'medium', 23),
('Dance de um jeito que te lembre a Larissa e grave', 'Interprete a aniversariante em forma de dança.', 'random', 'medium', 24),
('Recrie uma foto antiga sua com a Larissa', 'Mesma pose, mesma cara. O tempo passou, a foto não.', 'random', 'medium', 25),
('Entreviste um convidado que você nunca falou antes', 'Três perguntas no mínimo. Vale microfone imaginário.', 'random', 'medium', 26),
('Invente uma frase que você acha que a Larissa diria com 80 anos e grave', 'Projeção de futuro em forma de bordão.', 'random', 'medium', 27),
('Grave um vídeo dizendo a frase ou palavra que a Larissa mais costuma falar', 'Capriche na imitação da voz.', 'random', 'easy', 28),
('Grave uma mensagem para a Larissa', 'Cápsula do tempo em vídeo.', 'random', 'medium', 29),
('Convença 4 pessoas a tirarem uma foto em formação de pirâmide', 'Segurança em primeiro lugar, foto em segundo.', 'random', 'hard', 30),
('Grave uma queda no futebol de sabão', 'Isso não vai demorar nem 10 segundos — não se preocupe.', 'random', 'easy', 31),
('Faça um brinde com 3 pessoas que você acabou de conhecer', 'Copo levantado, nomes novos.', 'random', 'easy', 32),
('Grave 15 segundos da banda tocando com a galera cantando junto', 'Som ambiente incluso.', 'random', 'easy', 33),
('Bata foto de alguém que você sente que vai bodar hoje', 'A noite é uma criança.', 'random', 'easy', 34),
('Grave a Larissa cantando', 'Sem avisar, de preferência.', 'random', 'medium', 35),
('Puxe um coro na roda de pagode e grave a galera respondendo', 'Você começa, a festa responde.', 'random', 'hard', 36),
('Faça um gol de bicicleta ou letra no futebol de sabão', 'Use o slow motion do celular.', 'random', 'hard', 37),
('Foto da galera curtindo na piscina', 'Suba num lugar seguro e enquadre.', 'random', 'easy', 38),
('Tire uma foto abraçado com o flamingo inflável', 'Ele é o mascote da festa.', 'random', 'easy', 39),
('Dê um nome pro flamingo e apresente ele em vídeo', 'Nome completo, com sobrenome.', 'random', 'easy', 40),
('Tire uma foto da Larissa com o flamingo', 'Os dois protagonistas juntos.', 'random', 'medium', 41),
('Grave o tombo mais engraçado da partida', 'Vai ter concorrência.', 'random', 'easy', 42),
('Narre 20 segundos de jogo do futebol de sabão como locutor esportivo', 'Grite o gol mesmo que não tenha gol.', 'random', 'medium', 43),
('Foto do time inteiro coberto de espuma', 'Time posado, espuma escorrendo.', 'random', 'medium', 44),
('Fotografe o detalhe da decoração que você achou mais bonito', 'Um detalhe só. Bem de perto.', 'random', 'easy', 45),
('Foto da mesa de decoração completa, antes de alguém bagunçar', 'Registro do estado original.', 'random', 'easy', 46),
('Apresente a mesa de decoração em vídeo como se fosse um programa de decoração', 'Voz de apresentador, gesto de mão.', 'random', 'medium', 47),
('Faça uma foto no lambe-lambe com alguém que você conheceu hoje', 'Amizade impressa em papel.', 'random', 'medium', 48),
('Tire uma foto do seu grupo no lambe-lambe', 'Todo mundo tem que caber.', 'random', 'medium', 49),
('Tire uma foto no lambe-lambe imitando a pose típica da Larissa', 'Você sabe qual é.', 'random', 'medium', 50),
('Fotografe a página que você escreveu no caderninho', 'Sua letra, eternizada duas vezes.', 'random', 'easy', 51),
('Fotografe alguém escrevendo no caderninho, concentrado, sem perceber', 'Momento sincero.', 'random', 'easy', 52),
('Convença alguém que ainda não escreveu no caderninho a escrever — e grave', 'Missão de recrutamento.', 'random', 'medium', 53),
('Fotografe ou grave duas pessoas que você acha que vão ficar hoje', 'Vai que, né...', 'random', 'easy', 54),
('Faça uma foto 3x4 bem séria ao lado da Larissa', 'Zero sorriso. Documento oficial.', 'random', 'easy', 55),
('Grave um vídeo de 20 segundos falando o que a Larissa significa pra você', 'Pode embargar a voz.', 'random', 'medium', 56),
('Grave a Larissa recebendo um abraço surpresa por trás', 'A reação é o registro.', 'random', 'medium', 57),
('Fotografe a Larissa com a família', 'Junte todo mundo antes que dispersem.', 'random', 'medium', 58),
('Grave a Larissa dançando sem saber que está sendo filmada', 'Modo documentarista.', 'random', 'medium', 59),
('Grave uma pergunta para a Larissa responder só daqui a 10 anos', 'Cápsula do tempo em forma de pergunta.', 'random', 'hard', 60),
('Peça pra Larissa contar em 15 segundos a melhor lembrança que tem com você', 'Grave a resposta inteira.', 'random', 'hard', 61),
('Reúna um grupo para um pulo sincronizado', 'Todo mundo no ar ao mesmo tempo.', 'random', 'hard', 62),
('Fotografe a festa do canto mais afastado que você conseguir chegar', 'A festa inteira num quadro só.', 'random', 'easy', 63),
('Grave 10 segundos só do som ambiente da festa, sem falar nada', 'O barulho da noite, puro.', 'random', 'easy', 64),
('Fotografe o céu agora — o horário exato dessa festa', 'Registro do momento.', 'random', 'easy', 65),
('Grave quem está nos bastidores fazendo tudo acontecer', 'Cozinha, apoio, quem serve. Eles nunca aparecem.', 'random', 'medium', 66),
('Fotografe ou grave duas pessoas conversando sério num canto', 'De longe, sem interromper.', 'random', 'medium', 67),
('Dance coladinho com a Larissa na roda de pagode e grave', 'Não tão coladinho assim, tô de olho. Ass: Mayan.', 'random', 'hard', 68),
('Diga no que a Larissa mais amadureceu nesses 30 anos', 'Você sabe que se pensar bem vai conseguir encontrar algo...', 'random', 'medium', 69),
('Conte qual a coisa mais legal que você já viu a Larissa fazendo', 'Por você ou por outra pessoa. Deve ter existido algo.', 'random', 'medium', 70),
('Grave alguém bêbado', 'Pode ser qualquer um, inclusive a aniversariante.', 'random', 'easy', 71),
('Grave 3 pessoas diferentes dizendo uma palavra só sobre a Larissa', 'Três palavras, um vídeo.', 'random', 'medium', 72);
