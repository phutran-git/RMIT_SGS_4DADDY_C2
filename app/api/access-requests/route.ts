import { NextRequest, NextResponse } from 'next/server'
import { getCaller, unauthorized } from '@/lib/auth'
import { readDb, updateDb, newId, audit } from '@/lib/store'
import { corpusById } from '@/lib/corpora'

// GET: council sees every request; anyone else sees their own.
export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  const db = await readDb()
  const list = caller.isCouncil ? db.accessRequests : db.accessRequests.filter((r) => r.requesterVuid === caller.vuid)
  return NextResponse.json(list)
}

// POST { corpusId, org, purpose }: an AI lab asks the community for read access.
// This does NOT grant anything: the grant is a TideCloak change request the council must approve.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  const { corpusId, org, purpose } = await req.json()
  if (!corpusById(corpusId) || !org || !purpose) return NextResponse.json({ error: 'corpusId, org and purpose required' }, { status: 400 })
  const id = newId()
  const dup = await updateDb((db) => {
    // One open request per lab user and corpus: repeat clicks don't spam the council.
    if (db.accessRequests.some((r) => r.requesterVuid === caller.vuid && r.corpusId === corpusId)) return true
    db.accessRequests.unshift({
      id,
      corpusId,
      org: String(org).slice(0, 120),
      purpose: String(purpose).slice(0, 1000),
      requesterVuid: caller.vuid,
      requesterName: caller.name,
      createdAt: new Date().toISOString(),
    })
    audit(db, caller.name, 'access.request', `${org} requested read access to ${corpusId}`)
    return false
  })
  return NextResponse.json({ id, duplicate: dup })
}
