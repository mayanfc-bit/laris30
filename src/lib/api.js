import { supabase, MEDIA_BUCKET, MAX_FILE_BYTES, MAX_PASSES } from './supabase'

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Normaliza o nome para a chave de login: minúsculo, sem acento, espaços colapsados. */
export function nameKey(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

/** Deixa o nome apresentável: "maria  da SILVA" → "Maria Da Silva". */
export function prettyName(name) {
  return String(name)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s|')\S/g, (c) => c.toUpperCase())
}

function requireClient() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado. Crie o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
    )
  }
  return supabase
}

function unwrap({ data, error }) {
  if (error) throw error
  return data
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

/* ------------------------------------------------------------------ */
/* Convidados                                                          */
/* ------------------------------------------------------------------ */

/** Entra na festa: recupera o perfil pelo nome ou cria um novo. */
export async function signInByName(rawName) {
  const db = requireClient()
  const key = nameKey(rawName)
  if (!key) throw new Error('Digite seu nome para entrar.')

  const existing = unwrap(
    await db.from('guests').select('*').eq('name_key', key).maybeSingle()
  )
  if (existing) return existing

  const { data, error } = await db
    .from('guests')
    .insert({ name: prettyName(rawName), name_key: key })
    .select()
    .single()

  // Corrida: alguém com o mesmo nome entrou entre o select e o insert.
  if (error?.code === '23505') {
    return unwrap(await db.from('guests').select('*').eq('name_key', key).single())
  }
  if (error) throw error
  return data
}

export async function getGuest(id) {
  const db = requireClient()
  return unwrap(await db.from('guests').select('*').eq('id', id).maybeSingle())
}

export async function listGuests() {
  const db = requireClient()
  return unwrap(await db.from('guests').select('*').order('created_at', { ascending: true }))
}

/* ------------------------------------------------------------------ */
/* Desafios                                                            */
/* ------------------------------------------------------------------ */

export async function listChallenges() {
  const db = requireClient()
  return unwrap(
    await db.from('challenges').select('*').order('sort_order', { ascending: true })
  )
}

/** Tudo que a Home precisa saber sobre um convidado, numa tacada só. */
export async function getGuestState(guestId) {
  const db = requireClient()
  const [challenges, completions, drawn, guest] = await Promise.all([
    listChallenges(),
    unwrap(
      await db
        .from('completions')
        .select('*')
        .eq('guest_id', guestId)
        .order('completed_at', { ascending: false })
    ),
    unwrap(
      await db
        .from('drawn_challenges')
        .select('*')
        .eq('guest_id', guestId)
        .order('drawn_at', { ascending: false })
    ),
    getGuest(guestId),
  ])
  return { guest, challenges, completions, drawn }
}

/**
 * Sorteia um desafio ainda não visto por este convidado.
 * @param {'random'|'adult'} kind
 */
export async function drawChallenge(guestId, kind = 'random') {
  const db = requireClient()

  const [challenges, drawn] = await Promise.all([
    listChallenges(),
    unwrap(await db.from('drawn_challenges').select('challenge_id, status').eq('guest_id', guestId)),
  ])

  // Já existe um ativo desse tipo? Devolve ele em vez de sortear outro.
  const pool = challenges.filter((c) => c.type === kind)
  const poolIds = new Set(pool.map((c) => c.id))
  const active = drawn.find((d) => d.status === 'active' && poolIds.has(d.challenge_id))
  if (active) return { challenge: pool.find((c) => c.id === active.challenge_id), reused: true }

  const seen = new Set(drawn.map((d) => d.challenge_id))
  const available = pool.filter((c) => !seen.has(c.id))
  if (available.length === 0) {
    return { challenge: null, reused: false, exhausted: true }
  }

  const chosen = pick(available)
  unwrap(
    await db
      .from('drawn_challenges')
      .insert({ guest_id: guestId, challenge_id: chosen.id, status: 'active' })
      .select()
      .single()
  )
  return { challenge: chosen, reused: false }
}

/**
 * Passa o desafio ativo e sorteia outro na hora.
 * @param {'random'|'adult'} kind
 */
export async function passChallenge(guestId, challengeId, kind = 'random') {
  const db = requireClient()
  const guest = await getGuest(guestId)
  const field = kind === 'adult' ? 'passes_18_used' : 'passes_used'
  const used = guest?.[field] ?? 0
  if (used >= MAX_PASSES) throw new Error('Seus passes acabaram! Esse aí você encara. 😄')

  unwrap(
    await db
      .from('drawn_challenges')
      .update({ status: 'passed' })
      .eq('guest_id', guestId)
      .eq('challenge_id', challengeId)
      .eq('status', 'active')
  )
  unwrap(await db.from('guests').update({ [field]: used + 1 }).eq('id', guestId))

  const next = await drawChallenge(guestId, kind)
  return { ...next, passesUsed: used + 1 }
}

/* ------------------------------------------------------------------ */
/* Upload e conclusão                                                  */
/* ------------------------------------------------------------------ */

function extOf(file) {
  const fromName = file.name?.split('.').pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  return (file.type?.split('/')[1] || 'bin').toLowerCase()
}

/** Sobe a mídia para o bucket público e devolve a URL final. */
export async function uploadMedia(guestId, file, onProgress) {
  const db = requireClient()
  if (!file) throw new Error('Escolha uma foto ou vídeo.')
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(0)} MB). O limite é 100 MB.`
    )
  }
  const isMedia = file.type.startsWith('image/') || file.type.startsWith('video/')
  if (!isMedia) throw new Error('Só valem fotos e vídeos.')

  onProgress?.(10)
  const path = `${guestId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extOf(file)}`
  const { error } = await db.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
  if (error) throw error
  onProgress?.(90)

  const { data } = db.storage.from(MEDIA_BUCKET).getPublicUrl(path)
  onProgress?.(100)
  return data.publicUrl
}

/** Registra a conclusão e fecha o sorteio correspondente, se houver. */
export async function completeChallenge({
  guestId,
  challengeId,
  mediaUrl = null,
  caption = null,
  isManual = false,
}) {
  const db = requireClient()

  const { data, error } = await db
    .from('completions')
    .insert({
      guest_id: guestId,
      challenge_id: challengeId,
      media_url: mediaUrl,
      caption: caption?.trim() || null,
      is_manual: isManual,
    })
    .select()
    .single()

  if (error && error.code !== '23505') throw error // 23505 = já concluída, tudo bem

  await db
    .from('drawn_challenges')
    .update({ status: 'completed' })
    .eq('guest_id', guestId)
    .eq('challenge_id', challengeId)
    .eq('status', 'active')

  return data
}

export async function acceptAdultSection(guestId) {
  const db = requireClient()
  return unwrap(
    await db
      .from('guests')
      .update({ accepted_18plus: true })
      .eq('id', guestId)
      .select()
      .single()
  )
}

/* ------------------------------------------------------------------ */
/* Galeria                                                             */
/* ------------------------------------------------------------------ */

/** Feed completo: conclusões + nome de quem enviou + desafio. */
export async function listGallery() {
  const db = requireClient()
  return unwrap(
    await db
      .from('completions')
      .select('*, guests(name), challenges(title, type, difficulty)')
      .order('completed_at', { ascending: false })
  )
}

/** Assina o realtime da tabela completions. Devolve a função de cancelar. */
export function subscribeCompletions(onChange) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('missao30-completions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'completions' }, onChange)
    .subscribe()
  return () => supabase.removeChannel(channel)
}

/* ------------------------------------------------------------------ */
/* Painel da aniversariante                                            */
/* ------------------------------------------------------------------ */

export async function getAdminData() {
  const [guests, challenges, gallery] = await Promise.all([
    listGuests(),
    listChallenges(),
    listGallery(),
  ])

  const byGuest = new Map(guests.map((g) => [g.id, { ...g, completions: 0, media: 0 }]))
  const byChallenge = new Map(challenges.map((c) => [c.id, { ...c, completions: 0 }]))

  for (const item of gallery) {
    const g = byGuest.get(item.guest_id)
    if (g) {
      g.completions += 1
      if (item.media_url) g.media += 1
    }
    const c = byChallenge.get(item.challenge_id)
    if (c) c.completions += 1
  }

  return {
    guests: [...byGuest.values()].sort((a, b) => b.completions - a.completions),
    challenges: [...byChallenge.values()].sort((a, b) => b.completions - a.completions),
    gallery,
    totals: {
      guests: guests.length,
      completions: gallery.length,
      media: gallery.filter((g) => g.media_url).length,
      adultAccepted: guests.filter((g) => g.accepted_18plus).length,
    },
  }
}

export { MAX_PASSES }
