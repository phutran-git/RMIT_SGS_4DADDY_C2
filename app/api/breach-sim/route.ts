import { NextRequest, NextResponse } from 'next/server'
import { getCaller, unauthorized } from '@/lib/auth'
import { readDb, updateDb, audit } from '@/lib/store'

// DEMO ONLY: simulates a compromised or malicious platform operator who skips every app-level
// check and hands a corpus's ciphertext AND its signed read policy to anyone who asks.
// The point: this still cannot reveal a single story, because decryption is decided by the
// Tide network (the caller must hold corpus-reader + _tide_decryptor, granted by the council).
// Disable with BREACH_SIM=off.
export async function GET(req: NextRequest) {
  if (process.env.BREACH_SIM === 'off') return NextResponse.json({ error: 'disabled' }, { status: 404 })
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  const corpusId = new URL(req.url).searchParams.get('corpusId') || ''
  const db = await readDb()
  const stories = db.stories.filter((s) => s.corpusId === corpusId)
  const policy = db.policies.find((p) => p.corpusId === corpusId && p.access === 'read')
  await updateDb((d) => audit(d, caller.name, 'breach.simulated', `operator leaked ${stories.length} ciphertexts + read policy of ${corpusId}`))
  return NextResponse.json({ stories, policyB64: policy?.policyB64 ?? null })
}
