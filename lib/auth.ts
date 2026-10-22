// Server-side identity: every API route verifies the TideCloak-issued JWT (signature, issuer,
// azp) with the SDK before trusting anything in it. UI checks are never the authorisation.
import { NextRequest, NextResponse } from 'next/server'
import { verifyTideCloakToken } from '@tidecloak/nextjs/server'
import type { TidecloakConfig } from '@tidecloak/nextjs/server'
import rawConfig from '../tidecloak.json'

export const tcConfig = rawConfig as TidecloakConfig

export interface Caller {
  token: string
  vuid: string
  name: string
  tideUserKey: string
  realmRoles: string[]
  isCouncil: boolean
  isReader: boolean
  isContributor: boolean
}

export const COUNCIL_ROLE = 'tide-realm-admin'
export const READER_ROLE = 'corpus-reader'
export const CONTRIBUTOR_ROLE = 'contributor'

export async function getCaller(req: NextRequest): Promise<Caller | null> {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return null
  let payload: Record<string, any> | null = null
  try {
    payload = (await verifyTideCloakToken(tcConfig, token, [])) as Record<string, any> | null
  } catch (err) {
    console.error('[auth] token verification failed', err)
    return null
  }
  if (!payload) return null
  const realmRoles: string[] = payload.realm_access?.roles ?? []
  const rmRoles: string[] = payload.resource_access?.['realm-management']?.roles ?? []
  return {
    token,
    vuid: String(payload.vuid ?? payload.sub ?? ''),
    name: String(payload.preferred_username ?? payload.name ?? 'unknown'),
    tideUserKey: String(payload.tideuserkey ?? ''),
    realmRoles,
    isCouncil: rmRoles.includes(COUNCIL_ROLE),
    isReader: realmRoles.includes(READER_ROLE),
    isContributor: realmRoles.includes(CONTRIBUTOR_ROLE),
  }
}

export const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
export const forbidden = (why: string) => NextResponse.json({ error: `Forbidden: ${why}` }, { status: 403 })
