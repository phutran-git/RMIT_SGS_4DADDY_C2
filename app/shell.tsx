'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'

const LINKS = [
  { href: '/contribute', label: 'Contribute' },
  { href: '/lab', label: 'AI Lab' },
  { href: '/council', label: 'Council' },
]

export default function Shell({ children }: { children: ReactNode }) {
  const { authenticated, login, logout, getValueFromToken, hasClientRole, hasRealmRole } = useTideCloak()
  const path = usePathname()
  const name = authenticated ? getValueFromToken('preferred_username') : null
  const badges = authenticated
    ? [
        hasClientRole('tide-realm-admin', 'realm-management') && 'council',
        hasRealmRole('corpus-reader') && 'corpus-reader',
        hasRealmRole('contributor') && 'contributor',
      ].filter(Boolean)
    : []

  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand">
          Lang<span>Trust</span>
        </Link>
        {authenticated && (
          <nav className="nav">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={path?.startsWith(l.href) ? 'active' : ''}>
                {l.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="who">
          {authenticated ? (
            <>
              <span>{name}</span>
              {badges.map((b) => (
                <span key={String(b)} className="pill">
                  {String(b)}
                </span>
              ))}
              <button className="btn ghost small" onClick={() => logout()}>
                Log out
              </button>
            </>
          ) : (
            <button className="btn small" onClick={() => login()}>
              Sign in with Tide
            </button>
          )}
        </div>
      </header>
      <main>{children}</main>
    </>
  )
}
