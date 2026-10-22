import { NextRequest, NextResponse } from 'next/server'
import { getCaller, unauthorized } from '@/lib/auth'
import { readDb } from '@/lib/store'
import { CORPORA } from '@/lib/corpora'

// Public-to-members transparency view: corpus sizes, policy status, the audit trail, and a raw
// sample of exactly what the platform operator holds (ciphertext only).
export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  const db = await readDb()
  return NextResponse.json({
    me: {
      name: caller.name,
      vuid: caller.vuid,
      tideUserKey: caller.tideUserKey,
      isCouncil: caller.isCouncil,
      isReader: caller.isReader,
      isContributor: caller.isContributor,
      realmRoles: caller.realmRoles.filter((r) => !r.startsWith('default-roles')),
    },
    corpora: CORPORA.map((c) => ({
      ...c,
      stories: db.stories.filter((s) => s.corpusId === c.id).length,
      writePolicy: db.policies.some((p) => p.corpusId === c.id && p.access === 'write'),
      readPolicy: db.policies.some((p) => p.corpusId === c.id && p.access === 'read'),
    })),
    audit: db.audit.slice(0, 40),
    operatorView: db.stories.slice(-3).map((s) => ({
      id: s.id,
      corpusId: s.corpusId,
      ciphertext: s.ciphertext.slice(0, 96) + '…',
      contributor: s.contributorName,
    })),
  })
}
