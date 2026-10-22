import { NextRequest, NextResponse } from 'next/server'
import { getCaller, unauthorized, forbidden, tcConfig } from '@/lib/auth'
import { TIDE_SIMULATED } from '@/lib/tide/mode'

// The realm's admin policy (signed bytes) authorises a council member's policy-signing request.
// Fetched with the council member's OWN token; this route only relays it (no server credential).
export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  if (!caller.isCouncil) return forbidden('council only')
  // Plan C: the simulated network needs no realm admin policy.
  if (TIDE_SIMULATED) return NextResponse.json({ policy: Buffer.from('simulated').toString('base64') })
  const cfg = tcConfig as unknown as Record<string, string>
  const base = String(cfg['auth-server-url']).replace(/\/$/, '')
  const res = await fetch(`${base}/admin/realms/${cfg.realm}/iga/role-policies/name/tide-realm-admin`, {
    headers: { Authorization: `Bearer ${caller.token}` },
    cache: 'no-store',
  })
  const text = await res.text()
  if (!res.ok) return NextResponse.json({ error: `TideCloak returned ${res.status}: ${text.slice(0, 300)}` }, { status: 502 })
  const json = JSON.parse(text)
  return NextResponse.json({ policy: json.policy ?? json })
}
