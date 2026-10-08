"use client"

import { useState } from "react"
import { Alert, Badge, EmptyState } from "@/components/ui"
import { useAction } from "@/components/use-action"
import {
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  moveCategory,
  moveItem,
  setItemActive,
  updateCategory,
  updateItem,
} from "./actions"

type Item = { id: string; label: string; description: string | null; active: boolean | null }
type Category = { id: string; name: string; items: Item[] }

export function ItemsManager({ categories }: { categories: Category[] }) {
  const { pending, error, exec } = useAction()
  const [newCategory, setNewCategory] = useState("")

  return (
    <div className="space-y-4">
      <form
        className="card flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          exec(() => createCategory({ name: newCategory }), () => setNewCategory(""))
        }}
      >
        <div className="min-w-60 flex-1">
          <label className="label" htmlFor="new-category">
            Nueva categoría
          </label>
          <input
            id="new-category"
            className="input"
            placeholder="Ej: Zonas comunes"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" disabled={pending || !newCategory.trim()}>
          Agregar categoría
        </button>
      </form>

      {error && <Alert>{error}</Alert>}

      {categories.length === 0 && <EmptyState>Aún no hay categorías. Crea la primera arriba.</EmptyState>}

      {categories.map((category, index) => (
        <CategoryCard
          key={category.id}
          category={category}
          categories={categories}
          isFirst={index === 0}
          isLast={index === categories.length - 1}
        />
      ))}
    </div>
  )
}

function CategoryCard({
  category,
  categories,
  isFirst,
  isLast,
}: {
  category: Category
  categories: Category[]
  isFirst: boolean
  isLast: boolean
}) {
  const { pending, error, exec } = useAction()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [newItem, setNewItem] = useState({ label: "", description: "" })

  return (
    <section className="card">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        {editing ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              exec(() => updateCategory(category.id, { name }), () => setEditing(false))
            }}
          >
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <button className="btn btn-primary" disabled={pending}>
              Guardar
            </button>
            <button type="button" className="btn" onClick={() => (setEditing(false), setName(category.name))}>
              Cancelar
            </button>
          </form>
        ) : (
          <>
            <h2 className="flex-1 text-base font-semibold">
              {category.name} <span className="font-normal text-slate-400">({category.items.length})</span>
            </h2>
            <button
              className="btn btn-sm"
              disabled={pending || isFirst}
              onClick={() => exec(() => moveCategory(category.id, "up"))}
              aria-label="Subir categoría"
            >
              ↑
            </button>
            <button
              className="btn btn-sm"
              disabled={pending || isLast}
              onClick={() => exec(() => moveCategory(category.id, "down"))}
              aria-label="Bajar categoría"
            >
              ↓
            </button>
            <button className="btn btn-sm" onClick={() => (setName(category.name), setEditing(true))}>
              Renombrar
            </button>
            <button
              className="btn btn-sm btn-danger"
              disabled={pending}
              onClick={() => {
                if (confirm(`¿Eliminar la categoría "${category.name}" y todos sus ítems?`)) {
                  exec(() => deleteCategory(category.id))
                }
              }}
            >
              Eliminar
            </button>
          </>
        )}
      </header>

      {error && (
        <div className="mb-3">
          <Alert>{error}</Alert>
        </div>
      )}

      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {category.items.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">Sin ítems.</li>}
        {category.items.map((item, i) => (
          <ItemRow
            key={item.id}
            item={item}
            categoryId={category.id}
            categories={categories}
            isFirst={i === 0}
            isLast={i === category.items.length - 1}
          />
        ))}
      </ul>

      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          exec(() => createItem(category.id, newItem), () => setNewItem({ label: "", description: "" }))
        }}
      >
        <input
          className="input min-w-48 flex-1"
          placeholder="Nuevo ítem"
          value={newItem.label}
          onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
        />
        <input
          className="input min-w-48 flex-1"
          placeholder="Descripción (opcional)"
          value={newItem.description}
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
        />
        <button className="btn" disabled={pending || !newItem.label.trim()}>
          Agregar ítem
        </button>
      </form>
    </section>
  )
}

function ItemRow({
  item,
  categoryId,
  categories,
  isFirst,
  isLast,
}: {
  item: Item
  categoryId: string
  categories: Category[]
  isFirst: boolean
  isLast: boolean
}) {
  const { pending, error, exec } = useAction()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    label: item.label,
    description: item.description ?? "",
    categoryId,
  })

  if (editing) {
    return (
      <li className="px-3 py-3">
        <form
          className="grid gap-2 md:grid-cols-[1fr_1fr_14rem_auto]"
          onSubmit={(e) => {
            e.preventDefault()
            exec(() => updateItem(item.id, form), () => setEditing(false))
          }}
        >
          <input
            className="input"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            autoFocus
          />
          <input
            className="input"
            placeholder="Descripción"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className="input"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            aria-label="Categoría"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={pending}>
              Guardar
            </button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancelar
            </button>
          </div>
        </form>
        {error && (
          <div className="mt-2">
            <Alert>{error}</Alert>
          </div>
        )}
      </li>
    )
  }

  return (
    <li className="px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${item.active ? "" : "text-slate-400 line-through"}`}>{item.label}</p>
          {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
        </div>
        {!item.active && <Badge tone="inactive">Inactivo</Badge>}
        <button
          className="btn btn-sm"
          disabled={pending || isFirst}
          onClick={() => exec(() => moveItem(item.id, "up"))}
          aria-label="Subir ítem"
        >
          ↑
        </button>
        <button
          className="btn btn-sm"
          disabled={pending || isLast}
          onClick={() => exec(() => moveItem(item.id, "down"))}
          aria-label="Bajar ítem"
        >
          ↓
        </button>
        <button
          className="btn btn-sm"
          onClick={() => {
            setForm({ label: item.label, description: item.description ?? "", categoryId })
            setEditing(true)
          }}
        >
          Editar
        </button>
        <button
          className="btn btn-sm"
          disabled={pending}
          onClick={() => exec(() => setItemActive(item.id, !item.active))}
        >
          {item.active ? "Desactivar" : "Activar"}
        </button>
        <button
          className="btn btn-sm btn-danger"
          disabled={pending}
          onClick={() => {
            if (confirm(`¿Eliminar el ítem "${item.label}"?`)) exec(() => deleteItem(item.id))
          }}
        >
          Eliminar
        </button>
      </div>
      {error && (
        <div className="mt-2">
          <Alert>{error}</Alert>
        </div>
      )}
    </li>
  )
}
