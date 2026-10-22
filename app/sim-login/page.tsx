'use client'

import { useEffect, useState } from 'react'
import { simSignIn } from '@/lib/tide/sdk'

interface Persona { id: string; display: string; council: boolean }

// Plan C sign-in: stands in for the Tide login page while Tide's network is unavailable.
export default function SimLogin() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [err, setErr] = useState('')
  useEffect(() => {
    fetch('/api/sim/session').then(async (r) => (r.ok ? setPersonas(await r.json()) : setErr('Live mode: use Sign in with Tide.')))
  }, [])

  const pick = async (id: string) => {
    try {
      await simSignIn(id)
      window.location.href = '/'
    } catch (e) {
      setErr(String((e as Error).message))
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560, margin: '24px auto' }}>
      <div className="eyebrow">Simulated TideCloak · Plan C</div>
      <h2>Sign in as</h2>
      <p className="small muted">
        Tide&apos;s network is overloaded, so this demo realm simulates TideCloak&apos;s sign-in, roles, council change requests and the
        network&apos;s encrypt/decrypt checks. Roles are decided on the server, never in the browser.
      </p>
      {err && <div className="notice bad">{err}</div>}
      <div style={{ display: 'grid', gap: 10 }}>
        {personas.map((p) => (
          <button key={p.id} className={`btn ${p.council ? 'clay' : p.id === 'lab' ? 'ghost' : ''}`} onClick={() => pick(p.id)}>
            {p.display}
          </button>
        ))}
      </div>
    </div>
  )
}
