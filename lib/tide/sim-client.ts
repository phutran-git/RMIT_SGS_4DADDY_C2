'use client'
// Plan C, browser side: stories are still encrypted and decrypted HERE (AES-GCM, WebCrypto).
// The simulated Tide network only releases a record's key after checking the council's signed
// policy and the caller's roles, so the app's database keeps holding ciphertext only.

let token = ''
export const setSimToken = (t: string) => { token = t }

async function network(body: Record<string, unknown>) {
  const r = await fetch('/api/sim/network', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `simulated Tide network returned ${r.status}`)
  return j
}

const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const PREFIX = 'simtide1:'

async function recordKey(op: 'encrypt' | 'decrypt', recordId: string, policyB64: string) {
  const { key } = await network({ op, recordId, policyB64 })
  return crypto.subtle.importKey('raw', unb64(key), 'AES-GCM', false, [op])
}

export async function simSignPolicy(grant: { subject: { type: string; id: string }; recordId: string; access: string }): Promise<string> {
  // Stands in for the Tide enclave pop-up where the council member approves the policy.
  const ok = window.confirm(`Simulated Tide enclave\n\nApprove this policy?\nHolders of '${grant.subject.id}' may ${grant.access === 'read' ? 'DECRYPT' : 'ENCRYPT INTO'} ${grant.recordId}.`)
  if (!ok) throw new Error('the grant was not approved (denied)')
  return (await network({ op: 'sign', grant })).policyB64
}

export async function simEncrypt(data: string, recordId: string, policyB64: string): Promise<string> {
  const key = await recordKey('encrypt', recordId, policyB64)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(recordId) }, key, new TextEncoder().encode(data)))
  return PREFIX + b64(new Uint8Array([...iv, ...ct]))
}

export async function simDecrypt(encrypted: string, recordId: string, policyB64: string): Promise<string> {
  if (!encrypted.startsWith(PREFIX)) throw new Error('this story was encrypted on the live Tide network')
  const key = await recordKey('decrypt', recordId, policyB64)
  const raw = unb64(encrypted.slice(PREFIX.length))
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12), additionalData: new TextEncoder().encode(recordId) }, key, raw.slice(12))
  return new TextDecoder().decode(pt)
}
