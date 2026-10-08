"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export type NavLink = { href: string; label: string }

export function AppNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname()

  // El enlace activo es el de prefijo más largo (así /reviews/new no marca también /reviews).
  const active = links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
            active === link.href ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
