import type { ReactNode } from "react"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const BADGE_TONES = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pendiente: "bg-amber-50 text-amber-800 ring-amber-200",
  no_aplica: "bg-slate-100 text-slate-600 ring-slate-200",
  completada: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  en_progreso: "bg-sky-50 text-sky-700 ring-sky-200",
  inactive: "bg-slate-100 text-slate-500 ring-slate-200",
  neutral: "bg-slate-50 text-slate-700 ring-slate-200",
} as const

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  )
}

export function toneFor(status: string | null | undefined): keyof typeof BADGE_TONES {
  return status && status in BADGE_TONES ? (status as keyof typeof BADGE_TONES) : "neutral"
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
      {children}
    </div>
  )
}

export function Alert({ tone = "error", children }: { tone?: "error" | "info" | "success"; children: ReactNode }) {
  const tones = {
    error: "bg-red-50 text-red-700",
    info: "bg-sky-50 text-sky-800",
    success: "bg-emerald-50 text-emerald-700",
  }
  return <p className={`rounded-lg px-3 py-2 text-sm ${tones[tone]}`}>{children}</p>
}
