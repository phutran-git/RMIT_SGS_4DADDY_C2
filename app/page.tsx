'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { useApi } from '@/lib/tide/client'

interface Ledger {
  me: { name: string; isCouncil: boolean; isReader: boolean; isContributor: boolean; realmRoles: string[] }
  corpora: { id: string; language: string; nativeName: string; community: string; speakers: string; stories: number; writePolicy: boolean; readPolicy: boolean }[]
  audit: { at: string; actor: string; action: string; detail: string }[]
  operatorView: { id: string; corpusId: string; ciphertext: string; contributor: string }[]
}

export default function Home() {
  const { authenticated, login } = useTideCloak()
  const api = useApi()
  const [ledger, setLedger] = useState<Ledger | null>(null)

  useEffect(() => {
    if (!authenticated) return
    api('/api/ledger').then(async (r) => r.ok && setLedger(await r.json()))
  }, [authenticated, api])

  return (
    <>
      <section className="hero hero-band">
        <span className="hero-glyph" aria-hidden="true">ភាសា</span>
        <div className="hero-copy">
          <div className="hero-pill">Community Language Data Trust</div>
          <h1>
            Our grandmothers&apos; stories can teach AI our language, <em>on our terms</em>.
          </h1>
          <p className="hero-lede">
            Minority-language speakers donate stories, proverbs and transcripts to build translation AI for
            languages Big Tech ignores. Every story is encrypted in the speaker&apos;s browser. An AI lab can only
            read a corpus after the community&apos;s elder council approves it. Neither the platform operator, nor any
            single administrator, nor the AI holds a key that gets around that rule.
          </p>
          <div className="lang-chips">
            <span className="lang-chip coral"><span className="khmer">ខ្មែរក្រោម</span> Khmer Krom</span>
            <span className="lang-chip saffron">Hmong</span>
            <span className="lang-chip green">Cham</span>
          </div>
          {!authenticated && (
            <button className="btn saffron" onClick={() => login()}>
              Sign in with Tide to begin
            </button>
          )}
        </div>
        <div className="card glass">
          <h3>How the trust works</h3>
          <ol className="flow">
            <li><b>Contributors</b> write in their language. A privacy guard strips IDs, then the story is encrypted under a <i>write-only</i> corpus policy.</li>
            <li><b>The council</b> (Tide realm admins) signs the corpus policies once, in the Tide enclave.</li>
            <li><b>An AI lab</b> asks for access. The grant of <code>corpus-reader</code> is a TideCloak change request that needs council approval.</li>
            <li>Once approved, the lab decrypts <i>in its browser</i>. The Tide network checks the policy on every decryption, and the GenAI pipeline builds parallel training data.</li>
          </ol>
        </div>
      </section>

      {ledger && (
        <>
          <div className="grid three">
            {ledger.corpora.map((c) => (
              <div key={c.id} className="card">
                <div className="eyebrow">{c.speakers}</div>
                <h3>
                  {c.language} <span className="muted">· {c.nativeName}</span>
                </h3>
                <p className="small muted">{c.community}</p>
                <div className="row small">
                  <span className="pill gray">{c.stories} encrypted stories</span>
                  <span className={`pill ${c.writePolicy ? 'ok' : 'bad'}`}>write policy {c.writePolicy ? 'signed' : 'missing'}</span>
                  <span className={`pill ${c.readPolicy ? 'ok' : 'bad'}`}>read policy {c.readPolicy ? 'signed' : 'missing'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid two" style={{ marginTop: 18 }}>
            <div className="card accent">
              <div className="eyebrow">What the platform operator can see</div>
              <h3>Ciphertext. Only ciphertext.</h3>
              <p className="small muted">The last stories in the server&apos;s database, exactly as stored. There is no key on the server to open them.</p>
              {ledger.operatorView.length === 0 && <p className="small">No stories yet. <Link href="/contribute">Contribute one</Link>.</p>}
              {ledger.operatorView.map((s) => (
                <div key={s.id} style={{ marginBottom: 8 }}>
                  <div className="small muted">{s.corpusId} · from {s.contributor}</div>
                  <div className="cipher">{s.ciphertext}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="eyebrow">Transparency ledger</div>
              <h3>Every grant, download and AI run</h3>
              <table>
                <tbody>
                  {ledger.audit.slice(0, 10).map((a, i) => (
                    <tr key={i}>
                      <td className="small muted">{new Date(a.at).toLocaleTimeString()}</td>
                      <td className="small"><b>{a.actor}</b> {a.action}<br /><span className="muted">{a.detail}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
