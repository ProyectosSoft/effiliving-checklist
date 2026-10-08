"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { assertPermission } from "@/lib/auth"
import { check, run } from "@/lib/actions"
import { createClient } from "@/lib/supabase/server"

const optional = z.string().trim().max(200).optional().default("")
const propertySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  address: optional,
  city: optional,
})
const roomSchema = z.object({
  number: z.string().trim().min(1, "El número es obligatorio").max(50),
  floor: optional,
  roomType: optional,
})

export type PropertyInput = z.input<typeof propertySchema>
export type RoomInput = z.input<typeof roomSchema>

function done(propertyId?: string) {
  revalidatePath("/properties")
  if (propertyId) revalidatePath(`/properties/${propertyId}`)
}

// ---- Hoteles --------------------------------------------------------------

export async function createProperty(input: PropertyInput) {
  return run(async () => {
    await assertPermission("properties_manage")
    const v = propertySchema.parse(input)
    const supabase = await createClient()
    const { data } = check(
      await supabase
        .from("properties")
        .insert({ name: v.name, address: v.address || null, city: v.city || null })
        .select("id")
        .single(),
    )
    done()
    return data!.id
  })
}

export async function updateProperty(id: string, input: PropertyInput) {
  return run(async () => {
    await assertPermission("properties_manage")
    const v = propertySchema.parse(input)
    const supabase = await createClient()
    check(
      await supabase
        .from("properties")
        .update({ name: v.name, address: v.address || null, city: v.city || null })
        .eq("id", id),
    )
    done(id)
  })
}

export async function deleteProperty(id: string) {
  return run(async () => {
    await assertPermission("properties_manage")
    const supabase = await createClient()
    check(await supabase.from("properties").delete().eq("id", id))
    done()
  })
}

// ---- Habitaciones ---------------------------------------------------------

export async function createRoom(propertyId: string, input: RoomInput) {
  return run(async () => {
    await assertPermission("properties_manage")
    const v = roomSchema.parse(input)
    const supabase = await createClient()
    check(
      await supabase.from("rooms").insert({
        property_id: propertyId,
        number: v.number,
        floor: v.floor || null,
        room_type: v.roomType || null,
      }),
    )
    done(propertyId)
  })
}

// "101-110, 115, Lobby" → ["101", ..., "110", "115", "Lobby"]
function expandNumbers(spec: string): string[] {
  const out: string[] = []
  for (const part of spec.split(/[,\n;]+/).map((p) => p.trim()).filter(Boolean)) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/)
    if (range) {
      const [from, to] = [Number(range[1]), Number(range[2])]
      if (to < from || to - from > 500) throw new Error(`Rango no válido: ${part}`)
      for (let n = from; n <= to; n++) out.push(String(n).padStart(range[1].length, "0"))
    } else {
      out.push(part)
    }
  }
  return [...new Set(out)]
}

export async function createRoomsBulk(
  propertyId: string,
  input: { numbers: string; floor?: string; roomType?: string },
) {
  return run(async () => {
    await assertPermission("properties_manage")
    const numbers = expandNumbers(input.numbers)
    if (numbers.length === 0) throw new Error("Indica al menos un número de habitación.")
    const supabase = await createClient()
    const { data: existing } = check(
      await supabase.from("rooms").select("number").eq("property_id", propertyId),
    )
    const taken = new Set((existing ?? []).map((r) => r.number))
    const fresh = numbers.filter((n) => !taken.has(n))
    if (fresh.length > 0) {
      check(
        await supabase.from("rooms").insert(
          fresh.map((number) => ({
            property_id: propertyId,
            number,
            floor: input.floor?.trim() || null,
            room_type: input.roomType?.trim() || null,
          })),
        ),
      )
    }
    done(propertyId)
    return { created: fresh.length, skipped: numbers.length - fresh.length }
  })
}

export async function updateRoom(id: string, propertyId: string, input: RoomInput) {
  return run(async () => {
    await assertPermission("properties_manage")
    const v = roomSchema.parse(input)
    const supabase = await createClient()
    check(
      await supabase
        .from("rooms")
        .update({ number: v.number, floor: v.floor || null, room_type: v.roomType || null })
        .eq("id", id),
    )
    done(propertyId)
  })
}

export async function deleteRoom(id: string, propertyId: string) {
  return run(async () => {
    await assertPermission("properties_manage")
    const supabase = await createClient()
    check(await supabase.from("rooms").delete().eq("id", id))
    done(propertyId)
  })
}
