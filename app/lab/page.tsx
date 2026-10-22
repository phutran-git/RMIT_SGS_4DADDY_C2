'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTideCloak } from '@/lib/tide/sdk'
import { CORPORA, corpusById } from '@/lib/corpora'
import { useApi, explainTideError } from '@/lib/tide/client'
import { decryptForRecord } from '@/lib/tide/relationship'

interface Cipher { id: string; corpusId: string; ciphertext: string; contributorName: string; consent: { training: boolean; nonCommercialOnly: boolean; attribution: boolean } }
interface Plain { id: string; text: string; gloss: string; consent: Cipher['consent']; contributor: string }
interface Pair { source: string; en: string; vi: string }

export default function Lab() {
  const { authenticated, login, hasRealmRole, forceRefreshToken } = useTideCloak()
  const api = useApi()
  const [corpusId, setCorpusId] = useState(CORPORA[0].id)
  const [org, setOrg] = useState('Mekong NLP Lab')
  const [purpose, setPurpose] = useState('Train an open-source Khmer Krom ↔ Vietnamese translator for health-clinic interpreters. Non-commercial; model card credits the community.')
  const [requests, setRequests] = useState<{ id: string; corpusId: string; org: string; createdAt: string }[]>([])
  const [plain, setPlain] = useState<Plain[]>([])
  const [pairs, setPairs] = useState<{ mode: string; pairs: Pair[]; notes: string } | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState('')

  const isReader = authenticated && hasRealmRole('corpus-reader')
  const hasDecryptor = authenticated && hasRealmRole('_tide_decryptor')
  const corpus = corpusById(corpusId)!

  const loadRequests = useCallback(async () => {
    const r = await api('/api/access-requests')
    if (r.ok) setRequests(await r.json())
  }, [api])
  useEffect(() => {
    if (authenticated) loadRequests()
  }, [authenticated, loadRequests])

  const requestAccess = async () => {
    const r = await api('/api/access-requests', { method: 'POST', body: JSON.stringify({ corpusId, org, purpose }) })
    setMsg(r.ok ? { kind: 'ok', text: 'Request sent to the elder council. Nothing is granted until they approve it in TideCloak.' } : { kind: 'bad', text: (await r.json()).error })
    loadRequests()
  }

  const decryptAll = async (stories: Cipher[], policy: string) => {
    const out: Plain[] = []
    for (const s of stories) {
      const json = await decryptForRecord(s.ciphertext, s.corpusId, policy)
      const parsed = JSON.parse(json)
      out.push({ id: s.id, text: parsed.text, gloss: parsed.gloss, consent: s.consent, contributor: s.contributorName })
    }
    return out
  }

  // Normal path: the app server checks the token, then the network checks the policy.
  const openCorpus = async () => {
    setBusy('open'); setMsg(null); setPlain([]); setPairs(null)
    try {
      const r = await api(`/api/stories?corpusId=${corpusId}`)
      if (!r.ok) throw new Error((await r.json()).error)
      const stories: Cipher[] = await r.json()
      const pr = await api(`/api/policies?corpusId=${corpusId}&access=read`)
      if (!pr.ok) throw new Error((await pr.json()).error)
      const out = await decryptAll(stories, await pr.text())
      setPlain(out)
      setMsg({ kind: 'ok', text: `Decrypted ${out.length} stories in this browser. The Tide network verified the council's policy for every one.` })
    } catch (e) {
      setMsg({ kind: 'bad', text: explainTideError(e) })
    } finally { setBusy('') }
  }

  // Breach simulation: the operator hands over ciphertext AND the read policy, skipping every app check.
  const breach = async () => {
    setBusy('breach'); setMsg(null); setPlain([])
    try {
      const r = await api(`/api/breach-sim?corpusId=${corpusId}`)
      const { stories, policyB64 } = await r.json()
      if (!policyB64) throw new Error('no read policy signed yet')
      if (!stories.length) throw new Error('corpus is empty')
      setMsg({ kind: 'info', text: `Leaked ${stories.length} ciphertexts + the signed read policy. Asking the Tide network to decrypt…` })
      const out = await decryptAll(stories, policyB64)
      setPlain(out)
      setMsg({ kind: hasDecryptor ? 'ok' : 'bad', text: hasDecryptor ? 'Decrypted, because you ARE an approved reader.' : 'Unexpected: decrypted without approval.' })
    } catch (e) {
      setMsg({ kind: 'ok', text: `Breach contained. ${explainTideError(e)}` })
    } finally { setBusy('') }
  }

  const buildPairs = async () => {
    setBusy('ai')
    try {
      const usable = plain.filter((p) => p.consent.training)
      const r = await api('/api/ai/pairs', { method: 'POST', body: JSON.stringify({ language: corpus.language, stories: usable.map(({ text, gloss }) => ({ text, gloss })) }) })
      if (!r.ok) throw new Error((await r.json()).error)
      setPairs(await r.json())
    } catch (e) {
      setMsg({ kind: 'bad', text: String((e as Error).message || e) })
    } finally { setBusy('') }
  }

  if (!authenticated) {
    return <div className="card"><h2>AI Lab</h2><button className="btn" onClick={() => login()}>Sign in with Tide</button></div>
  }

  return (
    <>
      <div className="grid two">
        <div className="card teal">
          <div className="eyebrow">AI lab / researcher</div>
          <h2>Train on community data, with permission</h2>
          <label>Corpus</label>
          <select value={corpusId} onChange={(e) => setCorpusId(e.target.value)}>
            {CORPORA.map((c) => <option key={c.id} value={c.id}>{c.language} · {c.nativeName}</option>)}
          </select>
          <div className="row small" style={{ marginTop: 10 }}>
            <span className={`pill ${isReader ? 'ok' : 'bad'}`}>corpus-reader: {isReader ? 'granted' : 'not granted'}</span>
            <span className={`pill ${hasDecryptor ? 'ok' : 'bad'}`}>_tide_decryptor: {hasDecryptor ? 'granted' : 'not granted'}</span>
            <button className="btn ghost small" onClick={async () => { await forceRefreshToken(); location.reload() }}>refresh my roles</button>
          </div>
          <div className="row" style={{ marginTop: 14 }}>
            <button className="btn" disabled={!!busy} onClick={openCorpus}>{busy === 'open' ? 'Decrypting…' : 'Open corpus (normal path)'}</button>
            <button className="btn clay" disabled={!!busy} onClick={breach}>{busy === 'breach' ? 'Trying…' : 'Simulate a server breach'}</button>
          </div>
          {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}
        </div>

        <div className="card">
          <div className="eyebrow">Ask the community</div>
          <h3>Request read access</h3>
          <label>Organisation</label>
          <input type="text" value={org} onChange={(e) => setOrg(e.target.value)} />
          <label>Purpose (the council reads this)</label>
          <textarea style={{ minHeight: 80 }} value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn ghost" onClick={requestAccess}>Send request to council</button>
          </div>
          {requests.length > 0 && (
            <p className="small muted" style={{ marginTop: 10 }}>
              Your requests: {requests.map((r) => `${corpusById(r.corpusId)?.language} (${new Date(r.createdAt).toLocaleTimeString()})`).join(', ')}
            </p>
          )}
        </div>
      </div>

      {plain.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="eyebrow">Decrypted in your browser only</div>
              <h3>{corpus.language} corpus · {plain.length} stories</h3>
            </div>
            <button className="btn clay" disabled={busy === 'ai'} onClick={buildPairs}>
              {busy === 'ai' ? 'Generating…' : 'Build AI training pairs'}
            </button>
          </div>
          {plain.map((p) => (
            <div key={p.id} className="story">
              <div className="native">{p.text}</div>
              {p.gloss && <div className="small muted">↳ {p.gloss}</div>}
              <div className="row small" style={{ marginTop: 6 }}>
                <span className="muted">by {p.consent.attribution ? p.contributor : 'anonymous community member'}</span>
                {p.consent.nonCommercialOnly && <span className="pill">non-commercial</span>}
                {!p.consent.training && <span className="pill bad">excluded from training</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {pairs && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="eyebrow">GenAI pipeline · {pairs.mode}</div>
          <h3>Parallel training pairs</h3>
          <p className="small muted">{pairs.notes}</p>
          <table>
            <thead><tr><th>{corpus.language}</th><th>English</th><th>Tiếng Việt</th></tr></thead>
            <tbody>
              {pairs.pairs.map((p, i) => <tr key={i}><td className="native">{p.source}</td><td>{p.en}</td><td>{p.vi}</td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
