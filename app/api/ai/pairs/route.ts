import { NextRequest, NextResponse } from 'next/server'
import { getCaller, unauthorized, forbidden } from '@/lib/auth'
import { updateDb, audit } from '@/lib/store'
import { SAMPLE_TRANSLATIONS } from '@/lib/corpora'

// POST { language, stories: [{ text, gloss }] }
// The GenAI step of an APPROVED lab: turn decrypted community stories into parallel
// training pairs (native -> English / Vietnamese). Only corpus-readers reach it, and the
// plaintext it receives was decrypted in the lab's own browser under the council's policy.
// Uses Claude when ANTHROPIC_API_KEY is set, otherwise a deterministic offline mock.
export async function POST(req: NextRequest) {
  const caller = await getCaller(req)
  if (!caller) return unauthorized()
  if (!caller.isReader) return forbidden('only council-approved corpus readers can run the AI pipeline')
  const { language, stories } = (await req.json()) as { language: string; stories: { text: string; gloss?: string }[] }
  if (!Array.isArray(stories) || !stories.length) return NextResponse.json({ error: 'no stories' }, { status: 400 })

  const key = process.env.ANTHROPIC_API_KEY
  let result: { mode: string; pairs: { source: string; en: string; vi: string }[]; notes: string }
  if (key) {
    result = await withClaude(key, language, stories)
  } else {
    result = mock(stories)
  }
  await updateDb((db) => audit(db, caller.name, 'ai.pairs', `${result.pairs.length} ${language} training pairs (${result.mode})`))
  return NextResponse.json(result)
}

async function withClaude(key: string, language: string, stories: { text: string; gloss?: string }[]) {
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'
  const prompt = `You are helping build a consented, community-governed machine-translation corpus for ${language}, a low-resource language.
For each story below, split it into sentences and produce aligned training pairs: the original sentence, an English translation, and a Vietnamese translation.
Use the contributor's gloss when present as a hint. Replace any personal names, phone numbers or ID numbers with [REDACTED].
Return ONLY JSON: {"pairs":[{"source":"...","en":"...","vi":"..."}],"notes":"one sentence on quality or uncertainty"}

${stories.map((s, i) => `Story ${i + 1}:\n${s.text}\nGloss: ${s.gloss || '(none)'}`).join('\n\n')}`
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) {
    const fallback = mock(stories)
    return { ...fallback, notes: `Claude API returned ${res.status}; showing offline mock instead.` }
  }
  const data = await res.json()
  const text: string = data.content?.map((c: { text?: string }) => c.text ?? '').join('') ?? ''
  try {
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
    return { mode: `claude (${model})`, pairs: parsed.pairs ?? [], notes: parsed.notes ?? '' }
  } catch {
    return { ...mock(stories), notes: 'Could not parse the model output; showing offline mock instead.' }
  }
}

const splitSentences = (t: string) =>
  t
    .split(/(?<=[.!?។៕។])\s+|\n+/u)
    .map((s) => s.trim())
    .filter(Boolean)

function mock(stories: { text: string; gloss?: string }[]) {
  const pairs = stories.flatMap((s) => {
    const src = splitSentences(s.text)
    const gl = splitSentences(s.gloss || '')
    return src.map((sentence, i) => {
      const ref = SAMPLE_TRANSLATIONS.find((t) => t.source.trim() === sentence.trim())
      return {
        source: sentence,
        en: gl[i] || ref?.en || '[needs human translation]',
        vi: ref?.vi || '[needs AI or human translation: set ANTHROPIC_API_KEY]',
      }
    })
  })
  return {
    mode: 'offline mock',
    pairs,
    notes: 'Offline mock: sentences split and aligned; translations come from the contributor gloss or built-in sample references. Set ANTHROPIC_API_KEY for live Claude translation.',
  }
}
