import { NextRequest, NextResponse } from 'next/server'
import { TIDE_SIMULATED } from '@/lib/tide/mode'
import { SIM_CONTRACT, signPolicy, releaseKey } from '@/lib/tide/sim-server'
import { getCaller, unauthorized } from '@/lib/auth'
import { updateDb, audit } from '@/lib/store'

// Plan C stand-in for the Tide network.
// POST { op: 'sign', grant }                           -> council signs a corpus policy
// POST { op: 'encrypt'|'decrypt', recordId, policyB64 } -> the record key, only if the policy and the
//                                                         caller's roles allow it; else a refusal
export async function POST(req: NextRequest) {
  if (!TIDE_SIMULATED) return NextResponse.json({ error: 'live mode' }, { status: 404 })
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  const b = await req.json()

  if (b.op === 'sign') {
    if (!caller.isCouncil) return NextResponse.json({ error: '[TIDE-ORK-SIM] only realm admins (the council) can sign policies' }, { status: 403 })
    const { subject, recordId, access } = b.grant ?? {}
    const roles = access === 'read' ? ['_tide_decryptor'] : access === 'write' ? ['_tide_encryptor'] : null
    if (subject?.type !== 'Role' || !subject.id || !recordId || !roles) return NextResponse.json({ error: 'bad grant' }, { status: 400 })
    const policyB64 = signPolicy({ contractId: SIM_CONTRACT, subjectType: 'Role', subjectId: subject.id, assignmentId: recordId, roles: JSON.stringify(roles), signedBy: caller.name })
    return NextResponse.json({ policyB64 })
  }

  if (b.op === 'encrypt' || b.op === 'decrypt') {
    try {
      const key = releaseKey(b.op, String(b.recordId), String(b.policyB64), caller.realmRoles)
      return NextResponse.json({ key })
    } catch (e) {
      const why = (e as Error).message
      await updateDb((db) => audit(db, caller.name, 'tide.refused', `${b.op} on ${b.recordId}: ${why.replace('[TIDE-ORK-SIM] ', '')}`))
      return NextResponse.json({ error: why }, { status: 403 })
    }
  }
  return NextResponse.json({ error: 'unknown op' }, { status: 400 })
}
