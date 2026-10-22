import { NextRequest, NextResponse } from 'next/server'
import { Models } from '@tideorg/js'
import { getCaller, unauthorized, forbidden, CONTRIBUTOR_ROLE, READER_ROLE } from '@/lib/auth'
import { readDb, updateDb, audit } from '@/lib/store'
import { corpusById } from '@/lib/corpora'

// Which role each kind of policy must name. Write = every contributor (a drop box),
// read = only holders of corpus-reader, which the council grants by governed change request.
const SUBJECT_FOR = { write: CONTRIBUTOR_ROLE, read: READER_ROLE } as const

// GET /api/policies            -> status of every corpus' policies (any signed-in user)
// GET /api/policies?corpusId=&access=read|write -> the signed policy, only if it applies to the caller
export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  const url = new URL(req.url)
  const corpusId = url.searchParams.get('corpusId')
  const access = url.searchParams.get('access') as 'read' | 'write' | null
  const db = await readDb()
  if (!corpusId) {
    return NextResponse.json(
      db.policies.map(({ policyB64, ...meta }) => meta),
    )
  }
  if (access !== 'read' && access !== 'write') return NextResponse.json({ error: 'access must be read|write' }, { status: 400 })
  if (!caller.realmRoles.includes(SUBJECT_FOR[access])) {
    return forbidden(`this policy is for holders of '${SUBJECT_FOR[access]}'`)
  }
  const p = db.policies.find((x) => x.corpusId === corpusId && x.access === access)
  if (!p) return NextResponse.json({ error: 'the council has not signed this policy yet' }, { status: 404 })
  return new NextResponse(p.policyB64, { headers: { 'content-type': 'text/plain' } })
}

// POST /api/policies { corpusId, access, policyB64 } -> council (tide-realm-admin) only.
// The bytes are parsed and checked to name the expected contract, subject and record.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  if (!caller.isCouncil) return forbidden('only council members (tide-realm-admin) can store policies')
  const { corpusId, access, policyB64 } = await req.json()
  if (!corpusById(corpusId) || (access !== 'read' && access !== 'write')) {
    return NextResponse.json({ error: 'bad corpus or access' }, { status: 400 })
  }
  try {
    const p = Models.Policy.from(Uint8Array.from(Buffer.from(policyB64, 'base64')))
    const param = (k: string) => String(p.params.entries.get(k) ?? '')
    const expectedRoles = access === 'read' ? '["_tide_decryptor"]' : '["_tide_encryptor"]'
    if (
      p.contractId !== 'RelationshipAttestation:1' ||
      param('assignmentId') !== corpusId ||
      param('subjectType') !== 'Role' ||
      param('subjectId') !== SUBJECT_FOR[access as 'read' | 'write'] ||
      param('roles') !== expectedRoles ||
      !p.signature?.length
    ) {
      return NextResponse.json({ error: 'policy does not match the expected corpus/subject/access or is unsigned' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: 'could not parse policy bytes' }, { status: 400 })
  }
  await updateDb((db) => {
    db.policies = db.policies.filter((x) => !(x.corpusId === corpusId && x.access === access))
    db.policies.push({
      corpusId,
      access,
      subjectType: 'Role',
      subjectId: SUBJECT_FOR[access as 'read' | 'write'],
      policyB64,
      grantedBy: caller.name,
      createdAt: new Date().toISOString(),
    })
    audit(db, caller.name, 'policy.sign', `${access} policy for ${corpusId} -> role ${SUBJECT_FOR[access as 'read' | 'write']}`)
  })
  return NextResponse.json({ ok: true })
}
