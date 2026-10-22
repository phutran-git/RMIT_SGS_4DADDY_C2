'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { CORPORA, corpusById } from '@/lib/corpora'
import { scrub } from '@/lib/privacy'
import { useApi, explainTideError, short } from '@/lib/tide/client'
import { encryptForRecord, decryptForRecord } from '@/lib/tide/relationship'

interface Mine {
  id: string
  corpusId: string
  ciphertext: string
  consent: { training: boolean; nonCommercialOnly: boolean; attribution: boolean }
  redactions: number
  chars: number
  createdAt: string
}

export default function Contribute() {
  const { authenticated, login } = useTideCloak()
  const api = useApi()
  const [corpusId, setCorpusId] = useState(CORPORA[0].id)
  const [text, setText] = useState('')
  const [gloss, setGloss] = useState('')
  const [consent, setConsent] = useState({ training: true, nonCommercialOnly: true, attribution: false })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string } | null>(null)
  const [lastCipher, setLastCipher] = useState('')
  const [mine, setMine] = useState<Mine[]>([])

  const corpus = corpusById(corpusId)!
  const preview = scrub(text)

  const loadMine = useCallback(async () => {
    const r = await api('/api/stories?mine=1')
    if (r.ok) setMine(await r.json())
  }, [api])

  useEffect(() => {
    if (authenticated) loadMine()
  }, [authenticated, loadMine])

  const getPolicy = async (access: 'read' | 'write') => {
    const r = await api(`/api/policies?corpusId=${corpusId}&access=${access}`)
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `policy fetch failed (${r.status})`)
    return r.text()
  }

  const submit = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const { clean, found } = scrub(text)
      const glossClean = scrub(gloss)
      const policy = await getPolicy('write')
      // Encrypted in THIS browser. The record id (corpus id) is the only tag, as the contract requires.
      const ciphertext = await encryptForRecord(JSON.stringify({ text: clean, gloss: glossClean.clean }), corpusId, policy)
      const r = await api('/api/stories', {
        method: 'POST',
        body: JSON.stringify({ corpusId, ciphertext, consent, redactions: found.length + glossClean.found.length, chars: clean.length }),
      })
      if (!r.ok) throw new Error((await r.json()).error)
      setLastCipher(ciphertext)
      setText('')
      setGloss('')
      setMsg({ kind: 'ok', text: `Encrypted in your browser and added to the ${corpus.language} corpus. The server only received ciphertext.` })
      loadMine()
    } catch (e) {
      setMsg({ kind: 'bad', text: explainTideError(e) })
    } finally {
      setBusy(false)
    }
  }

  // Demonstrates the write-only drop box: a contributor's policy cannot decrypt the pooled corpus.
  const tryRead = async (s: Mine) => {
    setMsg({ kind: 'info', text: 'Asking the Tide network to decrypt with the contributor (write-only) policy…' })
    try {
      const policy = await getPolicy('write')
      await decryptForRecord(s.ciphertext, s.corpusId, policy)
      setMsg({ kind: 'bad', text: 'Unexpected: decryption succeeded with a write-only policy.' })
    } catch (e) {
      setMsg({ kind: 'ok', text: `As designed, the corpus is a drop box: ${explainTideError(e)}` })
    }
  }

  const withdraw = async (id: string) => {
    const r = await api(`/api/stories?id=${id}`, { method: 'DELETE' })
    setMsg(r.ok ? { kind: 'ok', text: 'Story withdrawn. It is gone from the corpus and future AI training.' } : { kind: 'bad', text: 'Could not withdraw.' })
    loadMine()
  }

  if (!authenticated) {
    return (
      <div className="card">
        <h2>Contribute a story</h2>
        <button className="btn" onClick={() => login()}>Sign in with Tide</button>
      </div>
    )
  }

  return (
    <div className="grid two">
      <div className="card accent">
        <div className="eyebrow">Contributor</div>
        <h2>Share a story in your language</h2>
        <p className="small muted">
          It is encrypted before it leaves this page. Only an AI lab the elder council approves can ever read it, and only for the
          purposes you consent to.
        </p>

        <label>Corpus</label>
        <select value={corpusId} onChange={(e) => setCorpusId(e.target.value)}>
          {CORPORA.map((c) => (
            <option key={c.id} value={c.id}>
              {c.language} · {c.nativeName}
            </option>
          ))}
        </select>

        <label>
          Story in {corpus.language}{' '}
          <button className="btn ghost small" type="button" onClick={() => setText(corpus.sample + ' Gọi tôi: 0912 345 678.')}>
            use synthetic sample
          </button>
        </label>
        <textarea className="native" value={text} onChange={(e) => setText(e.target.value)} placeholder={corpus.sample} />

        <label>Meaning in English or Vietnamese (optional, helps the AI align)</label>
        <textarea style={{ minHeight: 70 }} value={gloss} onChange={(e) => setGloss(e.target.value)} placeholder="Long ago a boy lived near the river. He loved listening to his grandfather's legends." />

        {preview.found.length > 0 && (
          <div className="notice info small">
            Privacy guard (on-device) will remove {preview.found.length} identifier(s):{' '}
            {preview.found.map((f) => `${f.label} "${f.value}"`).join(', ')}
          </div>
        )}

        <label>Your consent</label>
        <label className="check"><input type="checkbox" checked={consent.training} onChange={(e) => setConsent({ ...consent, training: e.target.checked })} /> May be used to train translation AI</label>
        <label className="check"><input type="checkbox" checked={consent.nonCommercialOnly} onChange={(e) => setConsent({ ...consent, nonCommercialOnly: e.target.checked })} /> Non-commercial use only</label>
        <label className="check"><input type="checkbox" checked={consent.attribution} onChange={(e) => setConsent({ ...consent, attribution: e.target.checked })} /> Credit my community in model cards</label>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn clay" disabled={busy || !text.trim()} onClick={submit}>
            {busy ? 'Encrypting with Tide…' : 'Encrypt & contribute'}
          </button>
        </div>
        {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}
        {lastCipher && (
          <>
            <div className="small muted">What the server stored:</div>
            <div className="cipher">{lastCipher}</div>
          </>
        )}
      </div>

      <div className="card">
        <div className="eyebrow">Your contributions</div>
        <h3>You stay in control</h3>
        {mine.length === 0 && <p className="small muted">Nothing yet.</p>}
        {mine.map((s) => (
          <div key={s.id} className="story">
            <div className="row small">
              <b>{corpusById(s.corpusId)?.language}</b>
              <span className="muted">{new Date(s.createdAt).toLocaleString()}</span>
              <span className="pill gray">{s.chars} chars</span>
              {s.redactions > 0 && <span className="pill clay">{s.redactions} redacted</span>}
              {s.consent.nonCommercialOnly && <span className="pill">non-commercial</span>}
            </div>
            <div className="cipher" style={{ margin: '8px 0' }}>{short(s.ciphertext, 40)}</div>
            <div className="row">
              <button className="btn ghost small" onClick={() => tryRead(s)}>Try to read it back</button>
              <button className="btn ghost small" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }} onClick={() => withdraw(s.id)}>
                Withdraw
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
