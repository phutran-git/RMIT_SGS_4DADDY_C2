import { NextRequest, NextResponse } from 'next/server'
import { getCaller, unauthorized, forbidden } from '@/lib/auth'
import { readDb, updateDb, newId, audit, type Story } from '@/lib/store'
import { corpusById } from '@/lib/corpora'

// GET /api/stories?corpusId=...        -> ciphertexts of a corpus (corpus-reader only)
// GET /api/stories?mine=1              -> the caller's own contributions (metadata + ciphertext)
export async function GET(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  const db = await readDb()
  const url = new URL(req.url)
  if (url.searchParams.get('mine')) {
    return NextResponse.json(db.stories.filter((s) => s.contributorVuid === caller.vuid))
  }
  const corpusId = url.searchParams.get('corpusId') || ''
  if (!caller.isReader) return forbidden('only council-approved corpus readers may download a corpus')
  const stories = db.stories.filter((s) => s.corpusId === corpusId && s.consent.training)
  await updateDb((d) => audit(d, caller.name, 'corpus.download', `${stories.length} encrypted stories from ${corpusId}`))
  return NextResponse.json(stories)
}

// POST /api/stories  { corpusId, ciphertext, consent, redactions, chars }  (contributor only)
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  if (!caller.isContributor) return forbidden('contributor role required')
  const body = await req.json()
  if (!corpusById(body.corpusId)) return NextResponse.json({ error: 'unknown corpus' }, { status: 400 })
  if (typeof body.ciphertext !== 'string' || body.ciphertext.length < 16) {
    return NextResponse.json({ error: 'ciphertext required: stories are encrypted in the browser' }, { status: 400 })
  }
  const story: Story = {
    id: newId(),
    corpusId: body.corpusId,
    ciphertext: body.ciphertext,
    contributorVuid: caller.vuid,
    contributorName: caller.name,
    consent: {
      training: !!body.consent?.training,
      nonCommercialOnly: !!body.consent?.nonCommercialOnly,
      attribution: !!body.consent?.attribution,
    },
    redactions: Number(body.redactions) || 0,
    chars: Number(body.chars) || 0,
    createdAt: new Date().toISOString(),
  }
  await updateDb((db) => {
    db.stories.push(story)
    audit(db, caller.name, 'story.contribute', `${story.corpusId} (${story.chars} chars, encrypted)`)
  })
  return NextResponse.json({ id: story.id })
}

// DELETE /api/stories?id=...  -> a contributor withdraws their own story
export async function DELETE(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  const id = new URL(req.url).searchParams.get('id')
  const removed = await updateDb((db) => {
    const s = db.stories.find((x) => x.id === id)
    if (!s || s.contributorVuid !== caller.vuid) return false
    db.stories = db.stories.filter((x) => x.id !== id)
    audit(db, caller.name, 'story.withdraw', `${s.corpusId} story withdrawn by its contributor`)
    return true
  })
  return removed ? NextResponse.json({ ok: true }) : forbidden('you can only withdraw your own stories')
}
