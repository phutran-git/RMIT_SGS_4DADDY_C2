import { NextRequest, NextResponse } from 'next/server'
import { TIDE_SIMULATED } from '@/lib/tide/mode'
import { SIM_USERS, issueToken } from '@/lib/tide/sim-server'
import { getCaller, unauthorized } from '@/lib/auth'
import { updateDb, audit } from '@/lib/store'

// Plan C sign-in. GET: the personas (no token) or who I am (with token). POST { user }: a token.
export async function GET(req: NextRequest) {
  if (!TIDE_SIMULATED) return NextResponse.json({ error: 'live mode' }, { status: 404 })
  if (!req.headers.get('authorization')) {
    return NextResponse.json(Object.entries(SIM_USERS).map(([id, u]) => ({ id, display: u.display, council: u.council })))
  }
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  return NextResponse.json({ name: caller.name, display: SIM_USERS[caller.name].display, realmRoles: caller.realmRoles, isCouncil: caller.isCouncil })
}

export async function POST(req: NextRequest) {
  if (!TIDE_SIMULATED) return NextResponse.json({ error: 'live mode' }, { status: 404 })
  const { user } = await req.json()
  if (!SIM_USERS[user]) return NextResponse.json({ error: 'unknown persona' }, { status: 400 })
  await updateDb((db) => audit(db, user, 'sign-in', 'simulated TideCloak (Plan C)'))
  return NextResponse.json({ token: issueToken(user) })
}
