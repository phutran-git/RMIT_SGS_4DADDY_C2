// Plan C, server side: a simulated TideCloak realm and a simulated Tide network.
//
// - Realm: fixed demo personas. Their roles live HERE (server state), never in the browser, and are
//   looked up on every request, like a freshly issued TideCloak token.
// - Change requests: a lab's read grant needs QUORUM council approvals, as TideCloak's governed
//   change requests do. No single elder, and not the operator, can grant it alone.
// - Network: signs council policies and releases a record's key only when the policy is genuine,
//   names that record, grants the operation, and the caller holds the policy's role plus the
//   operation's role. In live mode Tide's ORK nodes do this and no single server holds the key;
//   here one process stands in for them.
import crypto from 'crypto'

export const QUORUM = 2
export const SIM_CONTRACT = 'RelationshipAttestation:1'
const SECRET = process.env.SIM_TIDE_SECRET || 'langtrust-plan-c-demo-secret'
const NETWORK_KEY = crypto.createHmac('sha256', SECRET).update('simulated-tide-network').digest()

export interface SimUser { display: string; roles: string[]; council: boolean }
export const SIM_USERS: Record<string, SimUser> = {
  ly: { display: 'Ly · contributor, Sóc Trăng', roles: ['contributor', '_tide_encryptor'], council: false },
  elder_son: { display: 'Elder Sơn · council', roles: ['contributor', '_tide_encryptor'], council: true },
  elder_thach: { display: 'Elder Thạch · council', roles: ['contributor', '_tide_encryptor'], council: true },
  lab: { display: 'Researcher · Mekong NLP Lab', roles: [], council: false },
}

export interface SimState {
  granted: Record<string, string[]> // extra realm roles granted through approved change requests
  approvals: Record<string, string[]> // access-request id -> council members who approved
}
export const emptySim = (): SimState => ({ granted: {}, approvals: {} })

const hmac = (key: crypto.BinaryLike, data: string) => crypto.createHmac('sha256', key).update(data).digest('hex')

// --- tokens -------------------------------------------------------------------------------------
export const issueToken = (user: string) => `sim.${user}.${hmac(SECRET, `token:${user}`)}`
export function verifyToken(token: string): string | null {
  const [p, user, sig] = token.split('.')
  if (p !== 'sim' || !SIM_USERS[user] || !sig) return null
  const want = hmac(SECRET, `token:${user}`)
  return sig.length === want.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want)) ? user : null
}
export const rolesOf = (user: string, sim: SimState) => [...new Set([...SIM_USERS[user].roles, ...(sim.granted[user] ?? [])])]

// --- policies -----------------------------------------------------------------------------------
export interface SimPolicy { contractId: string; subjectType: 'Role'; subjectId: string; assignmentId: string; roles: string; signedBy: string; sig?: string }
const body = (p: SimPolicy) => JSON.stringify([p.contractId, p.subjectType, p.subjectId, p.assignmentId, p.roles, p.signedBy])

export function signPolicy(p: Omit<SimPolicy, 'sig'>): string {
  const full: SimPolicy = { ...p, sig: hmac(NETWORK_KEY, body(p as SimPolicy)) }
  return Buffer.from(JSON.stringify(full)).toString('base64')
}
export function readPolicy(b64: string): SimPolicy | null {
  try {
    const p = JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as SimPolicy
    return p.sig && p.sig === hmac(NETWORK_KEY, body(p)) ? p : null
  } catch {
    return null
  }
}

// --- the network's decision -----------------------------------------------------------------------
export const OP_ROLE = { encrypt: '_tide_encryptor', decrypt: '_tide_decryptor' } as const

/** Returns the record key, or throws the network's refusal. */
export function releaseKey(op: 'encrypt' | 'decrypt', recordId: string, policyB64: string, callerRoles: string[]): string {
  const p = readPolicy(policyB64)
  const refuse = (why: string) => { throw new Error(`[TIDE-ORK-SIM] ${why}`) }
  if (!p) refuse('policy has not been signed by the network')
  if (p!.contractId !== SIM_CONTRACT || p!.assignmentId !== recordId) refuse(`Tags do not contain assignmentId ${recordId}`)
  if (!JSON.parse(p!.roles).includes(OP_ROLE[op])) refuse(`policy does not grant ${OP_ROLE[op]} (${op} not allowed)`)
  if (!callerRoles.includes(p!.subjectId)) refuse(`${p!.subjectId} not found in list of roles`)
  if (!callerRoles.includes(OP_ROLE[op])) refuse(`${OP_ROLE[op]} not found in list of roles`)
  return crypto.createHmac('sha256', NETWORK_KEY).update(`record-key:${recordId}`).digest('base64')
}
