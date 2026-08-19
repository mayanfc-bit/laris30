# Missão 30 🎉

Sistema de desafios interativos para os convidados da festa de 30 anos da **Larissa**.
Os convidados entram pelo QR Code, digitam o nome, recebem missões sorteadas e enviam foto/vídeo
de cada uma. Tudo cai numa galeria coletiva em tempo real e no perfil individual.

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Supabase (banco, storage e realtime)
- **Deploy:** Vercel
- **PWA:** instalável no celular, com service worker básico

---

## 1. Rodando localmente

```bash
npm install
```

Copie o `.env.example` para `.env` e preencha com os dados do seu projeto Supabase:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-publica
VITE_ADMIN_PASSWORD=larissa30
```

```bash
npm run dev
```

Abre em `http://localhost:5173`. Enquanto o `.env` não estiver preenchido, o app roda mas mostra
um aviso amarelo em todas as telas.

---

## 2. Configurando o Supabase

1. Crie um projeto novo em [supabase.com](https://supabase.com).
2. Vá em **SQL Editor → New query**, cole o conteúdo inteiro de
   [`supabase/schema.sql`](supabase/schema.sql) e rode.

O script faz tudo de uma vez:

| O que cria | Detalhe |
|---|---|
| Tabela `guests` | `id, name, name_key, created_at, passes_used, passes_18_used, accepted_18plus` |
| Tabela `challenges` | `id, title, description, type, difficulty, sort_order` |
| Tabela `completions` | `id, guest_id, challenge_id, media_url, caption, completed_at, is_manual` |
| Tabela `drawn_challenges` | `id, guest_id, challenge_id, drawn_at, status` |
| Políticas RLS | leitura e escrita liberadas para `anon` (a festa é aberta, sem login real) |
| Realtime | publicação ativada em `completions`, `guests` e `drawn_challenges` |
| Bucket `party-media` | público, limite de 100 MB por arquivo, aceita imagem e vídeo |
| Desafios | os 114 desafios já cadastrados (3 fixos, 99 sorteados, 12 adultos) |

O script pode rodar de novo sem duplicar nada, com **uma exceção**: as 3 últimas linhas
(o bloco *Realtime*) falham na segunda execução, porque o Postgres não deixa adicionar a mesma
tabela duas vezes na publicação. Se for rodar o script mais de uma vez, apague essas 3 linhas.

3. Em **Project Settings → API**, copie a **Project URL** e a **anon public key** para o `.env`.

> **Sobre a segurança:** as políticas são abertas de propósito. Não existe login real —
> a identificação é só pelo nome. Não coloque nada sensível nesse projeto Supabase, e prefira
> apagar os dados depois da festa.

---

## 3. Deploy na Vercel

### Pelo painel

1. Suba o projeto para um repositório no GitHub.
2. Em [vercel.com](https://vercel.com) → **Add New → Project** → importe o repositório.
3. Framework preset: **Vite** (build `npm run build`, output `dist`).
4. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_PASSWORD` (opcional)
5. Deploy.

### Pela CLI

```bash
npm i -g vercel
vercel link
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod --yes
```

O `vercel.json` já cuida do rewrite de SPA (para `/admin` e `/app/*` funcionarem no refresh) e
do cache correto do service worker.

---

## 4. QR Code

Depois do deploy, gere o QR Code apontando para a URL do projeto
(ex.: `https://missao-30.vercel.app`) em qualquer gerador — [qr-code-generator.com](https://www.qr-code-generator.com),
por exemplo. É esse QR que vai nas mesas da festa.

---

## 5. Telas

| Rota | O que é |
|---|---|
| `/` | Boas-vindas, com confetes e o botão "Entrar na festa" |
| `/entrar` | Cadastro só com o nome (recupera o perfil se o nome já existir) |
| `/app` | Home do convidado: abas **Fixas**, **Sorteadas** e **18+** |
| `/app/galeria` | Galeria coletiva em mosaico, com filtros e atualização em tempo real |
| `/app/perfil` | Progresso, conquistas e os envios da pessoa |
| `/admin` | Painel da aniversariante (senha `larissa30`) |

### Regras do jogo

- **Missões fixas:** 3, iguais para todo mundo. A do livrinho das memórias é marcada manualmente,
  sem upload.
- **Missões sorteadas:** um desafio ativo por vez. Ao enviar a mídia, libera o próximo sorteio.
- **Passes:** 2 por pessoa nas sorteadas + 2 exclusivos no 18+. Ao passar, o próximo é sorteado na hora.
- **Sem repetição:** um desafio já sorteado (mesmo que passado) nunca volta para a mesma pessoa.
- **18+:** fica bloqueada até a pessoa confirmar no modal. Depois disso funciona igual, com visual escuro.
- **Persistência:** o convidado é guardado no `localStorage` e revalidado no banco — fechar o app
  não perde nada.

---

## 6. Painel da aniversariante

Em `/admin`, senha padrão `larissa30` (trocável pela env `VITE_ADMIN_PASSWORD`).
A senha fica no frontend por simplicidade — é uma trava social, não segurança de verdade.

Mostra total de convidados, missões concluídas, mídias enviadas, quantos toparam o 18+,
o ranking de missões mais completadas, o progresso individual de cada convidado e a galeria
completa. O botão **Baixar .zip** monta o pacote no próprio navegador, organizado em pastas
por convidado. Com muitos vídeos isso demora — é preciso deixar a aba aberta.

---

## 7. Identidade visual

| Token | Hex |
|---|---|
| Tiffany | `#81D8D0` |
| Tiffany claro | `#B9E8E3` |
| Tiffany suave | `#DDF4F1` |
| Dourado | `#C99A4A` |
| Pink | `#E2336B` |
| Creme (fundo) | `#F8F4EE` |
| Azul petróleo | `#145A63` |

Tipografia: **Playfair Display ExtraBold (800)** nos destaques e títulos + **Manrope** no corpo e na interface, via Google Fonts.
Os logos vetoriais (`L30`, `LARIS` e a moldura estilo Friends) estão em `public/brand/`.

---

## 8. Estrutura

```
missao-30/
├── public/
│   ├── brand/         # logos SVG (l30, laris, moldura)
│   ├── icons/         # ícones do PWA
│   ├── manifest.json
│   └── sw.js          # service worker
├── src/
│   ├── components/    # Layout, ChallengeCard, DrawSection, UploadModal, MediaTile, ui
│   ├── context/       # AuthContext (login por nome)
│   ├── lib/           # supabase, api, badges, confetti
│   ├── pages/         # Welcome, Login, Home, Gallery, Profile, Admin
│   ├── App.jsx
│   └── main.jsx
├── supabase/schema.sql
├── .env.example
└── vercel.json
```
