export type RoomLike = { id: string; number: string; floor: string | null }

const collator = new Intl.Collator("es", { numeric: true, sensitivity: "base" })

export function compareNatural(a: string | null | undefined, b: string | null | undefined) {
  return collator.compare(a ?? "", b ?? "")
}

// Agrupa habitaciones por piso, con orden natural ("2" < "10").
export function groupByFloor<T extends RoomLike>(rooms: T[]) {
  const groups = new Map<string, T[]>()
  for (const room of [...rooms].sort((a, b) => compareNatural(a.number, b.number))) {
    const key = room.floor?.trim() || ""
    groups.set(key, [...(groups.get(key) ?? []), room])
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : compareNatural(a, b)))
    .map(([floor, rooms]) => ({ floor, rooms }))
}
