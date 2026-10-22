'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTideCloak } from '@/lib/tide/sdk'
import tcConfig from '../../tidecloak.json'
import { CORPORA, corpusById } from '@/lib/corpora'
import { useApi, explainTideError } from '@/lib/tide/client'
import { signRelationshipPolicy } from '@/lib/tide/relationship'
import { TIDE_SIMULATED } from '@/lib/tide/mode'

interface PolicyMeta { corpusId: string; access: 'read' | 'write'; subjectId: string; grantedBy: string; createdAt: string }
interface Req { id: string; corpusId: string; org: string; purpose: string; requesterName: string; createdAt: string }

const cfg = tcConfig as Record<string, any>
const SUBJECT = { write: 'contributor', read: 'corpus-reader' } as const

export default function Council() {
  const { authenticated, login, hasClientRole } = useTideCloak()
  const api = useApi()
  const [policies, setPolicies] = useState<PolicyMeta[]>([])
  const [requests, setRequests] = useState<Req[]>([])
  const [msg, setMsg] = useState<{ kind: 'ok' | 'bad' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState('')
  const isCouncil = authenticated && hasClientRole('tide-realm-admin', 'realm-management')
  const consoleUrl = `${String(cfg['auth-server-url'] || 'http://localhost:8080').replace(/\/$/, '')}/admin/master/console/#/${cfg.realm || 'langtrust'}/users`

  const [adminPolicy, setAdminPolicy] = useState<Uint8Array | null>(null)
  // Plan C: simulated change requests (council quorum) instead of the TideCloak admin console.
  const [cr, setCr] = useState<{ quorum: number; requests: { id: string; approvals: string[]; granted: boolean }[] } | null>(null)
  const loadCr = useCallback(async () => {
    if (!TIDE_SIMULATED) return
    const r = await api('/api/sim/approvals')
    if (r.ok) setCr(await r.json())
  }, [api])
  useEffect(() => {
    if (authenticated) loadCr()
  }, [authenticated, loadCr])
  const approve = async (requestId: string) => {
    const r = await api('/api/sim/approvals', { method: 'POST', body: JSON.stringify({ requestId }) })
    const j = await r.json()
    setMsg(r.ok ? { kind: 'ok', text: j.granted ? 'Quorum reached: the lab now holds corpus-reader + _tide_decryptor.' : `Your approval is recorded (${j.approvals.length} of ${cr?.quorum}). Another council member must approve too.` } : { kind: 'bad', text: j.error })
    loadCr()
  }

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([api('/api/policies'), api('/api/access-requests')])
    if (p.ok) setPolicies(await p.json())
    if (r.ok) setRequests(await r.json())
  }, [api])
  useEffect(() => {
    if (authenticated) load()
  }, [authenticated, load])

  // Fetch the realm's admin policy up front, so a click goes straight into the enclave request
  // (browsers only allow the approval pop-up shortly after a user gesture).
  useEffect(() => {
    if (!isCouncil) return
    api('/api/admin-policy').then(async (ap) => {
      if (!ap.ok) return setMsg({ kind: 'bad', text: (await ap.json()).error })
      const { policy } = await ap.json()
      setAdminPolicy(Uint8Array.from(atob(policy), (c) => c.charCodeAt(0)))
    })
  }, [isCouncil, api])

  // Must run straight from the click: it opens the Tide enclave pop-up, where the council member approves.
  const sign = async (corpusId: string, access: 'read' | 'write') => {
    setBusy(`${corpusId}:${access}`)
    setMsg({ kind: 'info', text: 'Opening the Tide enclave. Approve the policy there (allow pop-ups for localhost:3000 if nothing appears).' })
    try {
      if (!adminPolicy) throw new Error('admin policy not loaded yet, try again in a second')
      const policyB64 = await signRelationshipPolicy(
        { vendorId: cfg.vendorId, subject: { type: 'Role', id: SUBJECT[access] }, recordId: corpusId, access },
        adminPolicy,
      )
      const r = await api('/api/policies', { method: 'POST', body: JSON.stringify({ corpusId, access, policyB64 }) })
      if (!r.ok) throw new Error((await r.json()).error)
      setMsg({ kind: 'ok', text: `Signed by the Tide network: holders of '${SUBJECT[access]}' may ${access === 'read' ? 'decrypt' : 'encrypt into'} ${corpusId}.` })
      load()
    } catch (e) {
      setMsg({ kind: 'bad', text: explainTideError(e) })
    } finally {
      setBusy('')
    }
  }

  if (!authenticated) return <div className="card"><h2>Council</h2><button className="btn" onClick={() => login()}>Sign in with Tide</button></div>
  if (!isCouncil) {
    return (
      <div className="card accent">
        <h2>Elder council only</h2>
        <p className="muted">Council members are Tide realm admins. Their approvals are sealed by the Tide network, so no single admin, and not the platform operator, can grant access alone.</p>
      </div>
    )
  }

  return (
    <>
      <div className="card teal">
        <div className="eyebrow">Elder council</div>
        <h2>The community decides who reads its language</h2>
        <p className="small muted">
          Two signed policies per corpus. <b>Write</b>: any <code>contributor</code> can encrypt stories in (a drop box: they cannot read the pool back).
          <b> Read</b>: only holders of <code>corpus-reader</code> can decrypt, and that role is granted only through a TideCloak change request the council approves.
        </p>
        {msg && <div className={`notice ${msg.kind}`}>{msg.text}</div>}
        <table>
          <thead><tr><th>Corpus</th><th>Write policy (contributors)</th><th>Read policy (approved labs)</th></tr></thead>
          <tbody>
            {CORPORA.map((c) => (
              <tr key={c.id}>
                <td><b>{c.language}</b><br /><span className="small muted">{c.id}</span></td>
                {(['write', 'read'] as const).map((access) => {
                  const p = policies.find((x) => x.corpusId === c.id && x.access === access)
                  return (
                    <td key={access}>
                      {p ? (
                        <span className="pill ok">signed by {p.grantedBy}</span>
                      ) : (
                        <button className="btn small" disabled={!!busy} onClick={() => sign(c.id, access)}>
                          {busy === `${c.id}:${access}` ? 'Waiting for enclave…' : `Sign ${access} policy`}
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card accent" style={{ marginTop: 18 }}>
        <div className="eyebrow">Access requests from AI labs</div>
        <h3>Review, then grant through governed change requests</h3>
        <p className="small muted">
          To approve a lab, assign it the realm roles <code>corpus-reader</code> and <code>_tide_decryptor</code> in TideCloak. Each assignment
          becomes a change request. It takes effect only when the required number of council members approve it in their Tide enclave.
          The platform operator can&apos;t skip that step: the lab&apos;s token, and every decryption, is checked by the Tide network.
        </p>
        {!TIDE_SIMULATED && <p><a className="btn ghost small" href={consoleUrl} target="_blank" rel="noreferrer">Open TideCloak admin console ↗</a></p>}
        {TIDE_SIMULATED && <p className="small"><span className="pill clay">Plan C</span> Simulated change request: the grant needs <b>{cr?.quorum ?? 2} different council members</b> to approve.</p>}
        {requests.length === 0 && <p className="small muted">No requests yet.</p>}
        <table>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td style={{ width: '28%' }}><b>{r.org}</b><br /><span className="small muted">user: {r.requesterName}</span></td>
                <td><span className="pill">{corpusById(r.corpusId)?.language}</span> <span className="small">{r.purpose}</span></td>
                <td className="small muted">{new Date(r.createdAt).toLocaleString()}</td>
                {TIDE_SIMULATED && (() => {
                  const c = cr?.requests.find((x) => x.id === r.id)
                  if (c?.granted) return <td><span className="pill ok">granted · {c.approvals.join(' + ')}</span></td>
                  return (
                    <td>
                      <button className="btn small clay" onClick={() => approve(r.id)}>Approve ({c?.approvals.length ?? 0}/{cr?.quorum ?? 2})</button>
                    </td>
                  )
                })()}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
