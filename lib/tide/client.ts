'use client'
// Browser helpers: authenticated fetch to our API, and readable messages for Tide refusals.
import { useCallback } from 'react'
import { useTideCloak } from '@/lib/tide/sdk'

export function useApi() {
  const { getToken, token } = useTideCloak()
  return useCallback(
    async (path: string, init: RequestInit = {}) => {
      const t = (await getToken().catch(() => null)) || token
      const headers = new Headers(init.headers)
      if (t) headers.set('Authorization', `Bearer ${t}`)
      if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json')
      return fetch(path, { ...init, headers })
    },
    [getToken, token],
  )
}

// A contract refusal arrives as "Could not reach enough VVK ORKs": every ORK answered "no".
// Pull the contract's own message out of the error chain so the UI can say what happened.
export function explainTideError(err: unknown): string {
  const parts: string[] = []
  let e: any = err
  for (let i = 0; e && i < 5; i++) {
    if (e.message) parts.push(String(e.message))
    else if (typeof e === 'string') parts.push(e)
    e = e.cause
  }
  const all = parts.join(' | ') || String(err)
  // Plan C: refusals from the simulated network.
  const sim = all.match(/\[TIDE-ORK-SIM\] ([^|]+)/)
  if (sim) return `Refused by the Tide network (simulated): ${sim[1].trim()}`
  const known = [
    'role not found',
    'not found in list of roles',
    'Tags do not contain assignmentId',
    'subjectId does not match',
    'not found in doken',
    'has not been signed',
  ].find((k) => all.includes(k))
  if (!known) return all
  // e.g. "... (got 0 of 14 required, 20 of 20 failed) ... cause: TideError: _tide_decryptor not found in list of roles."
  const nodes = all.match(/(\d+) of (\d+) failed/)
  const reason = (all.match(/cause: (?:TideError: )?([^|]+)/)?.[1] ?? all.match(/\[TIDE-ORK-[A-Z-]+\] ([^-|]+)/)?.[1] ?? known).trim()
  return `Refused by the Tide network${nodes ? ` (${nodes[1]} of ${nodes[2]} nodes said no)` : ''}: ${reason}`
}

export const short = (s: string, n = 10) => (s && s.length > n * 2 ? `${s.slice(0, n)}…${s.slice(-6)}` : s)
