"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { REVIEW_STATUSES, REVIEW_TYPES } from "@/lib/constants"
import type { ReviewFilters as Filters } from "@/lib/reviews"

type Option = { id: string; name: string }

// Los filtros viajan en la URL (compartible). El key del formulario debe cambiar con
// los filtros para que los defaultValue se reinicien al navegar.
export function ReviewFilters({
  action,
  filters,
  properties,
  inspectors,
  fields,
}: {
  action: string
  filters: Filters
  properties: Option[]
  inspectors?: Option[]
  fields: ("property" | "room" | "dates" | "inspector" | "status" | "type")[]
}) {
  const router = useRouter()
  const show = (f: (typeof fields)[number]) => fields.includes(f)

  return (
    <form
      className="card mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const query = new URLSearchParams()
        for (const [k, v] of data) if (typeof v === "string" && v.trim()) query.set(k, v.trim())
        router.push(`${action}/${query.size ? `?${query}` : ""}`)
      }}
    >
      {show("property") && (
        <div>
          <label className="label" htmlFor="f-property">
            Hotel
          </label>
          <select id="f-property" name="property" className="input" defaultValue={filters.property ?? ""}>
            <option value="">Todos</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {show("room") && (
        <div>
          <label className="label" htmlFor="f-room">
            Habitación
          </label>
          <input id="f-room" name="room" className="input" placeholder="Ej: 305" defaultValue={filters.room ?? ""} />
        </div>
      )}
      {show("dates") && (
        <>
          <div>
            <label className="label" htmlFor="f-from">
              Desde
            </label>
            <input id="f-from" name="from" type="date" className="input" defaultValue={filters.from ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="f-to">
              Hasta
            </label>
            <input id="f-to" name="to" type="date" className="input" defaultValue={filters.to ?? ""} />
          </div>
        </>
      )}
      {show("inspector") && inspectors && (
        <div>
          <label className="label" htmlFor="f-inspector">
            Inspector
          </label>
          <select id="f-inspector" name="inspector" className="input" defaultValue={filters.inspector ?? ""}>
            <option value="">Todos</option>
            {inspectors.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {show("status") && (
        <div>
          <label className="label" htmlFor="f-status">
            Estado
          </label>
          <select id="f-status" name="status" className="input" defaultValue={filters.status ?? ""}>
            <option value="">Todos</option>
            {Object.entries(REVIEW_STATUSES).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>
      )}
      {show("type") && (
        <div>
          <label className="label" htmlFor="f-type">
            Tipo
          </label>
          <select id="f-type" name="type" className="input" defaultValue={filters.type ?? ""}>
            <option value="">Todos</option>
            {Object.entries(REVIEW_TYPES).map(([value, text]) => (
              <option key={value} value={value}>
                {text}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4 lg:justify-end">
        <Link href={action} className="btn">
          Limpiar
        </Link>
        <button className="btn btn-primary">Filtrar</button>
      </div>
    </form>
  )
}
