'use client'
// The app imports TideCloak from here. Live mode: the real @tidecloak/nextjs provider and hook.
// Plan C (default): the same surface backed by the simulated realm in /api/sim/*.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { TideCloakProvider as LiveProvider, useTideCloak as useLiveTideCloak } from '@tidecloak/nextjs'
import { TIDE_SIMULATED } from './mode'
import { setSimToken } from './sim-client'

interface Me { name: string; display: string; realmRoles: string[]; isCouncil: boolean }
interface SimCtx {
  authenticated: boolean
  isInitializing: boolean
  token: string | null
  me: Me | null
  login: () => void
  logout: () => void
  getToken: () => Promise<string | null>
  forceRefreshToken: () => Promise<void>
  getValueFromToken: (k: string) => string | null
  hasRealmRole: (r: string) => boolean
  hasClientRole: (r: string, client?: string) => boolean
}

const TOKEN_KEY = 'langtrust-sim-token'
const Ctx = createContext<SimCtx | null>(null)

function SimProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [me, setMe] = useState<Me | null>(null)
  const [isInitializing, setInit] = useState(true)

  const loadMe = useCallback(async (t: string | null) => {
    setSimToken(t ?? '')
    if (!t) { setMe(null); return }
    const r = await fetch('/api/sim/session', { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' })
    if (r.ok) setMe(await r.json())
    else { localStorage.removeItem(TOKEN_KEY); setToken(null); setMe(null) }
  }, [])

  useEffect(() => {
    const t = localStorage.getItem(TOKEN_KEY)
    setToken(t)
    loadMe(t).finally(() => setInit(false))
  }, [loadMe])

  const value = useMemo<SimCtx>(() => ({
    authenticated: !!me,
    isInitializing,
    token,
    me,
    login: () => { window.location.href = '/sim-login' },
    logout: () => { localStorage.removeItem(TOKEN_KEY); window.location.href = '/' },
    getToken: async () => token,
    forceRefreshToken: () => loadMe(token),
    getValueFromToken: (k) => (k === 'preferred_username' ? me?.name ?? null : null),
    hasRealmRole: (r) => !!me?.realmRoles.includes(r),
    hasClientRole: (r) => r === 'tide-realm-admin' && !!me?.isCouncil,
  }), [me, token, isInitializing, loadMe])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export async function simSignIn(user: string) {
  const r = await fetch('/api/sim/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user }) })
  if (!r.ok) throw new Error((await r.json()).error)
  localStorage.setItem(TOKEN_KEY, (await r.json()).token)
}

function useSimTideCloak() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTideCloak outside TideCloakProvider')
  return c
}

export function TideCloakProvider({ config, children }: { config: unknown; children: ReactNode }) {
  if (TIDE_SIMULATED) return <SimProvider>{children}</SimProvider>
  return <LiveProvider config={config as Parameters<typeof LiveProvider>[0]['config']}>{children}</LiveProvider>
}

export const useTideCloak = (TIDE_SIMULATED ? useSimTideCloak : useLiveTideCloak) as unknown as typeof useLiveTideCloak
export const useSimSession = () => useContext(Ctx)
