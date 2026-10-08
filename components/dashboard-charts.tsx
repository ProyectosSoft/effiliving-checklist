"use client"

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

// Paleta validada (scripts de dataviz): OK y Pendiente separables con daltonismo y >= 3:1 sobre blanco.
const OK = "#1f8a6e"
const PENDING = "#c27c0e"
const AXIS = { fontSize: 12, fill: "#64748b" }
const GRID = "#e2e8f0"

type TooltipEntry = { name?: string; value?: number; color?: string; payload?: Record<string, unknown> }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-slate-800">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-slate-600">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-slate-900">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function PropertyStatusChart({ data }: { data: { name: string; ok: number; pendiente: number }[] }) {
  const height = Math.max(160, data.length * 44 + 60)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={10}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={140} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, color: "#475569" }} />
        <Bar dataKey="ok" name="OK" stackId="s" fill={OK} stroke="#fff" strokeWidth={2} />
        <Bar dataKey="pendiente" name="Pendiente" stackId="s" fill={PENDING} stroke="#fff" strokeWidth={2} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TopPendingChart({ data }: { data: { label: string; count: number }[] }) {
  const height = Math.max(160, data.length * 32 + 30)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }} barCategoryGap={6}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={180} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="count" name="Veces pendiente" fill={PENDING} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
