import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

if (!isConfigured) {
  // Não quebra o app: as telas mostram um aviso pedindo o .env.
  console.warn(
    '[Missão 30] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados. ' +
      'Copie .env.example para .env e preencha.'
  )
}

export const supabase = isConfigured
  ? createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null

export const MEDIA_BUCKET = 'party-media'
export const MAX_FILE_BYTES = 200 * 1024 * 1024 // 200 MB
// Passes sao ilimitados: nao existe mais limite para pular missao.
