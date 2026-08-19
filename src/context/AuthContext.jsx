import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react'
import { signInByName, getGuest } from '../lib/api'

const STORAGE_KEY = 'missao30:guest'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [guest, setGuest] = useState(null)
  const [loading, setLoading] = useState(true)

  // Retoma a sessão salva no aparelho e revalida contra o banco.
  useEffect(() => {
    let alive = true
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      setLoading(false)
      return
    }
    let cached
    try {
      cached = JSON.parse(raw)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      setLoading(false)
      return
    }
    setGuest(cached)
    getGuest(cached.id)
      .then((fresh) => {
        if (!alive) return
        if (fresh) {
          setGuest(fresh)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
        } else {
          localStorage.removeItem(STORAGE_KEY)
          setGuest(null)
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async (name) => {
    const g = await signInByName(name)
    setGuest(g)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(g))
    return g
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setGuest(null)
  }, [])

  const refresh = useCallback(async () => {
    if (!guest?.id) return null
    const fresh = await getGuest(guest.id)
    if (fresh) {
      setGuest(fresh)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    }
    return fresh
  }, [guest?.id])

  const value = useMemo(
    () => ({ guest, loading, login, logout, refresh, setGuest }),
    [guest, loading, login, logout, refresh]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
