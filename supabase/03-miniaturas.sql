-- =====================================================================
-- Missão 30 — atualização 3: miniaturas
--
-- Guarda a URL de uma versão leve de cada envio. O arquivo original
-- continua intacto em media_url — a miniatura é só para a galeria
-- carregar rápido e não estourar o tráfego durante a festa.
--
-- Rode inteiro no SQL Editor do Supabase.
-- =====================================================================

alter table public.completions add column if not exists thumb_url text;

-- Envios que já existem ficam sem miniatura (thumb_url null); o app cai
-- no arquivo original nesses casos, então nada quebra.

-- ---------------------------------------------------------------------
-- Limite por arquivo: 100 MB -> 200 MB
-- ---------------------------------------------------------------------
-- Com o plano Pro sobra espaco, entao um video mais longo em alta
-- qualidade passa a caber. Acima disso o upload no wi-fi da festa fica
-- lento demais e comeca a falhar, por isso nao subimos mais.
update storage.buckets set file_size_limit = 209715200 where id = 'party-media';
