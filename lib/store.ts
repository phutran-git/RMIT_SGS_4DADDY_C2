// Tiny JSON-file store (synthetic hackathon data). The server only ever holds ciphertext,
// signed policies and metadata: there is no plaintext story and no key anywhere in here.
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

export interface Story {
  id: string
  corpusId: string
  ciphertext: string
  contributorVuid: string
  contributorName: string
  consent: { training: boolean; nonCommercialOnly: boolean; attribution: boolean }
  redactions: number
  chars: number
  createdAt: string
}

export interface StoredPolicy {
  corpusId: string
  access: 'read' | 'write'
  subjectType: 'Role'
  subjectId: string
  policyB64: string
  grantedBy: string
  createdAt: string
}

export interface AccessRequest {
  id: string
  corpusId: string
  org: string
  purpose: string
  requesterVuid: string
  requesterName: string
  createdAt: string
}

export interface AuditEvent {
  at: string
  actor: string
  action: string
  detail: string
}

interface Db {
  stories: Story[]
  policies: StoredPolicy[]
  accessRequests: AccessRequest[]
  audit: AuditEvent[]
}

const DB_PATH = path.join(process.cwd(), 'data', 'db.json')
const EMPTY: Db = { stories: [], policies: [], accessRequests: [], audit: [] }

export async function readDb(): Promise<Db> {
  try {
    return { ...EMPTY, ...JSON.parse(await fs.readFile(DB_PATH, 'utf8')) }
  } catch {
    return structuredClone(EMPTY)
  }
}

// Serialise writes so concurrent requests can't clobber each other.
let queue: Promise<unknown> = Promise.resolve()
export function updateDb<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await readDb()
    const out = await fn(db)
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2))
    return out
  })
  queue = run.catch(() => undefined)
  return run
}

export const newId = () => crypto.randomUUID()

export function audit(db: Db, actor: string, action: string, detail: string) {
  db.audit.unshift({ at: new Date().toISOString(), actor, action, detail })
  db.audit = db.audit.slice(0, 200)
}
