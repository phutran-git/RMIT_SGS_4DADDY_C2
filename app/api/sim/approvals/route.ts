import { NextRequest, NextResponse } from 'next/server'
import { TIDE_SIMULATED } from '@/lib/tide/mode'
import { QUORUM } from '@/lib/tide/sim-server'
import { getCaller, unauthorized, forbidden, READER_ROLE } from '@/lib/auth'
import { readDb, updateDb, audit } from '@/lib/store'

// Plan C stand-in for TideCloak's governed change requests: granting a lab corpus-reader and
// _tide_decryptor takes effect only after QUORUM different council members approve it.
export async function GET(req: NextRequest) {
  if (!TIDE_SIMULATED) return NextResponse.json({ error: 'live mode' }, { status: 404 })
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  const db = await readDb()
  return NextResponse.json({
    quorum: QUORUM,
    requests: db.accessRequests.map((r) => ({
      id: r.id,
      approvals: db.sim.approvals[r.id] ?? [],
      granted: (db.sim.granted[r.requesterVuid] ?? []).includes(READER_ROLE),
    })),
  })
}

export async function POST(req: NextRequest) {
  if (!TIDE_SIMULATED) return NextResponse.json({ error: 'live mode' }, { status: 404 })
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  if (!caller.isCouncil) return forbidden('only council members can approve change requests')
  const { requestId } = await req.json()
  const result = await updateDb((db) => {
    const r = db.accessRequests.find((x) => x.id === requestId)
    if (!r) return { error: 'no such request' }
    const list = (db.sim.approvals[r.id] = db.sim.approvals[r.id] ?? [])
    if (!list.includes(caller.name)) list.push(caller.name)
    audit(db, caller.name, 'change-request.approve', `grant corpus-reader to ${r.requesterName} (${list.length}/${QUORUM})`)
    if (list.length >= QUORUM) {
      db.sim.granted[r.requesterVuid] = [...new Set([...(db.sim.granted[r.requesterVuid] ?? []), READER_ROLE, '_tide_decryptor'])]
      audit(db, 'TideCloak (simulated)', 'role.grant', `${r.requesterName} now holds corpus-reader + _tide_decryptor (quorum ${QUORUM} reached)`)
    }
    return { approvals: list, granted: list.length >= QUORUM }
  })
  return 'error' in result ? NextResponse.json(result, { status: 404 }) : NextResponse.json(result)
}
