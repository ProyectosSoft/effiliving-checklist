"use client"

import { useState } from "react"
import { Alert, EmptyState } from "@/components/ui"
import { useAction } from "@/components/use-action"
import { groupByFloor } from "@/lib/rooms"
import { createRoomsBulk, deleteRoom, updateRoom } from "../actions"

type Room = { id: string; number: string; floor: string | null; room_type: string | null }

export function RoomsManager({ propertyId, rooms }: { propertyId: string; rooms: Room[] }) {
  const { pending, error, exec } = useAction()
  const [bulk, setBulk] = useState({ numbers: "", floor: "", roomType: "" })
  const [message, setMessage] = useState<string | null>(null)
  const floors = groupByFloor(rooms)

  return (
    <div className="space-y-4">
      <form
        className="card space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          setMessage(null)
          exec(
            () => createRoomsBulk(propertyId, bulk),
            (r) => {
              setBulk({ ...bulk, numbers: "" })
              if (r) setMessage(`${r.created} creadas${r.skipped ? `, ${r.skipped} ya existían` : ""}.`)
            },
          )
        }}
      >
        <h2 className="font-semibold">Agregar habitaciones o espacios</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="label" htmlFor="numbers">
              Números o nombres
            </label>
            <input
              id="numbers"
              className="input"
              placeholder="Ej: 201-215, 220, Lobby"
              value={bulk.numbers}
              onChange={(e) => setBulk({ ...bulk, numbers: e.target.value })}
            />
            <p className="mt-1 text-xs text-slate-500">Separa con comas; usa rangos como 201-215.</p>
          </div>
          <div>
            <label className="label" htmlFor="floor">
              Piso
            </label>
            <input
              id="floor"
              className="input"
              value={bulk.floor}
              onChange={(e) => setBulk({ ...bulk, floor: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="roomType">
              Tipo
            </label>
            <input
              id="roomType"
              className="input"
              placeholder="Ej: Estándar, Suite, Zona común"
              value={bulk.roomType}
              onChange={(e) => setBulk({ ...bulk, roomType: e.target.value })}
            />
          </div>
        </div>
        {error && <Alert>{error}</Alert>}
        {message && <Alert tone="success">{message}</Alert>}
        <button className="btn btn-primary" disabled={pending || !bulk.numbers.trim()}>
          Agregar
        </button>
      </form>

      {rooms.length === 0 && <EmptyState>Este hotel aún no tiene habitaciones.</EmptyState>}

      {floors.map(({ floor, rooms }) => (
        <section key={floor} className="card p-0">
          <h3 className="border-b border-slate-200 px-4 py-3 font-semibold">
            {floor ? `Piso ${floor}` : "Sin piso"} <span className="font-normal text-slate-400">({rooms.length})</span>
          </h3>
          <ul className="divide-y divide-slate-100">
            {rooms.map((room) => (
              <RoomRow key={room.id} room={room} propertyId={propertyId} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function RoomRow({ room, propertyId }: { room: Room; propertyId: string }) {
  const { pending, error, exec } = useAction()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ number: "", floor: "", roomType: "" })

  return (
    <li className="px-4 py-2">
      {editing ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            exec(() => updateRoom(room.id, propertyId, form), () => setEditing(false))
          }}
        >
          <input
            className="input w-28"
            aria-label="Número"
            value={form.number}
            onChange={(e) => setForm({ ...form, number: e.target.value })}
          />
          <input
            className="input w-24"
            aria-label="Piso"
            placeholder="Piso"
            value={form.floor}
            onChange={(e) => setForm({ ...form, floor: e.target.value })}
          />
          <input
            className="input min-w-40 flex-1"
            aria-label="Tipo"
            placeholder="Tipo"
            value={form.roomType}
            onChange={(e) => setForm({ ...form, roomType: e.target.value })}
          />
          <button className="btn btn-primary" disabled={pending}>
            Guardar
          </button>
          <button type="button" className="btn" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="w-24 font-medium">{room.number}</span>
          <span className="flex-1 text-sm text-slate-500">{room.room_type || "—"}</span>
          <button
            className="btn btn-sm"
            onClick={() => {
              setForm({ number: room.number, floor: room.floor ?? "", roomType: room.room_type ?? "" })
              setEditing(true)
            }}
          >
            Editar
          </button>
          <button
            className="btn btn-sm btn-danger"
            disabled={pending}
            onClick={() => {
              if (confirm(`¿Eliminar ${room.number} y sus revisiones?`)) exec(() => deleteRoom(room.id, propertyId))
            }}
          >
            Eliminar
          </button>
        </div>
      )}
      {error && (
        <div className="mt-2">
          <Alert>{error}</Alert>
        </div>
      )}
    </li>
  )
}
