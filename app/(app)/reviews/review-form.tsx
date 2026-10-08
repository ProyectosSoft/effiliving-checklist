"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Alert } from "@/components/ui"
import { RESULT_STATUSES, REVIEW_TYPES, SIGNOFF_ROLES, type ResultStatus } from "@/lib/constants"
import { compareNatural, groupByFloor } from "@/lib/rooms"
import { saveReview } from "@/lib/data/reviews"

type Room = { id: string; number: string; floor: string | null; room_type: string | null }
type Property = { id: string; name: string; rooms: Room[] }
type Item = { id: string; label: string; description: string | null }
type Category = { id: string; name: string; items: Item[] }

type ResultValue = { status: ResultStatus | ""; notes: string }
type SignoffValue = { roleLabel: string; signerName: string; signed: boolean }

export type ReviewFormInitial = {
  id: string
  propertyId: string
  floor: string
  roomId: string
  reviewType: string
  reviewDate: string
  results: Record<string, ResultValue>
  signoffs: SignoffValue[]
}

const schema = z.object({
  propertyId: z.string().min(1, "Selecciona el hotel"),
  floor: z.string(),
  roomId: z.string().min(1, "Selecciona la habitación"),
  reviewType: z.string().min(1, "Selecciona el tipo de revisión"),
  reviewDate: z.string().min(1, "Indica la fecha"),
  results: z.record(z.string(), z.object({ status: z.string(), notes: z.string() })),
  signoffs: z.array(z.object({ roleLabel: z.string(), signerName: z.string(), signed: z.boolean() })),
})
type Values = z.infer<typeof schema>

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function ReviewForm({
  properties,
  categories,
  reviewerName,
  initial,
}: {
  properties: Property[]
  categories: Category[]
  reviewerName: string
  initial?: ReviewFormInitial
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const allItems = categories.flatMap((c) => c.items)
  const defaultResults = Object.fromEntries(
    allItems.map((item) => [item.id, initial?.results[item.id] ?? { status: "", notes: "" }]),
  )
  const defaultSignoffs = SIGNOFF_ROLES.map(
    (roleLabel) =>
      initial?.signoffs.find((s) => s.roleLabel === roleLabel) ?? { roleLabel, signerName: "", signed: false },
  )

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyId: initial?.propertyId ?? (properties.length === 1 ? properties[0].id : ""),
      floor: initial?.floor ?? "",
      roomId: initial?.roomId ?? "",
      reviewType: initial?.reviewType ?? "",
      reviewDate: initial?.reviewDate ?? today(),
      results: defaultResults,
      signoffs: defaultSignoffs,
    },
  })

  const propertyId = useWatch({ control, name: "propertyId" })
  const floor = useWatch({ control, name: "floor" })
  const results = useWatch({ control, name: "results" })

  const property = properties.find((p) => p.id === propertyId)
  const floors = groupByFloor(property?.rooms ?? [])
  const rooms = (floor ? floors.find((f) => f.floor === floor)?.rooms : property?.rooms) ?? []
  const sortedRooms = [...rooms].sort((a, b) => compareNatural(a.number, b.number))

  const evaluated = allItems.filter((i) => results?.[i.id]?.status).length

  function submit(complete: boolean) {
    return handleSubmit((values) => {
      setError(null)
      startTransition(async () => {
        const result = await saveReview({
          id: initial?.id,
          roomId: values.roomId,
          reviewType: values.reviewType as keyof typeof REVIEW_TYPES,
          reviewDate: values.reviewDate,
          complete,
          results: allItems.map((item) => ({
            itemId: item.id,
            status: (values.results[item.id]?.status || null) as ResultStatus | null,
            notes: values.results[item.id]?.notes ?? "",
          })),
          signoffs: values.signoffs,
        })
        if (!result.ok) {
          setError(result.error)
          return
        }
        router.push(`/reviews/view/?id=${result.data}`)
        router.refresh()
      })
    })
  }

  return (
    <form className="space-y-6" onSubmit={(e) => e.preventDefault()} noValidate>
      <section className="card">
        <h2 className="mb-4 font-semibold">Datos del espacio</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label" htmlFor="propertyId">
              Hotel
            </label>
            <select
              id="propertyId"
              className="input"
              {...register("propertyId", {
                onChange: () => {
                  setValue("floor", "")
                  setValue("roomId", "")
                },
              })}
            >
              <option value="">Selecciona…</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.propertyId && <p className="mt-1 text-xs text-red-600">{errors.propertyId.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="floor">
              Piso
            </label>
            <select
              id="floor"
              className="input"
              disabled={!property}
              {...register("floor", { onChange: () => setValue("roomId", "") })}
            >
              <option value="">Todos</option>
              {floors
                .filter((f) => f.floor)
                .map((f) => (
                  <option key={f.floor} value={f.floor}>
                    {f.floor}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="roomId">
              N.° de habitación / espacio
            </label>
            <select id="roomId" className="input" disabled={!property} {...register("roomId")}>
              <option value="">Selecciona…</option>
              {sortedRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number}
                  {r.room_type ? ` · ${r.room_type}` : ""}
                </option>
              ))}
            </select>
            {errors.roomId && <p className="mt-1 text-xs text-red-600">{errors.roomId.message}</p>}
            {property && property.rooms.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">Este hotel no tiene habitaciones registradas.</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="reviewType">
              Tipo de revisión
            </label>
            <select id="reviewType" className="input" {...register("reviewType")}>
              <option value="">Selecciona…</option>
              {Object.entries(REVIEW_TYPES).map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
            {errors.reviewType && <p className="mt-1 text-xs text-red-600">{errors.reviewType.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="reviewDate">
              Fecha
            </label>
            <input id="reviewDate" type="date" className="input" {...register("reviewDate")} />
            {errors.reviewDate && <p className="mt-1 text-xs text-red-600">{errors.reviewDate.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="reviewer">
              Revisado por
            </label>
            <input id="reviewer" className="input" value={reviewerName} disabled readOnly />
          </div>
        </div>
      </section>

      <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between rounded-lg bg-background/95 px-1 py-2 backdrop-blur">
        <h2 className="font-semibold">Checklist</h2>
        <span className="text-sm text-slate-600">
          {evaluated} / {allItems.length} evaluados
        </span>
      </div>

      {categories.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          register={register}
          setValue={setValue}
          control={control}
        />
      ))}

      <section className="card">
        <h2 className="mb-4 font-semibold">Firmas / VoBo</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SIGNOFF_ROLES.map((role, i) => (
            <div key={role} className="rounded-lg border border-slate-200 p-3">
              <p className="mb-2 text-sm font-medium">{role}</p>
              <input type="hidden" {...register(`signoffs.${i}.roleLabel`)} />
              <input
                className="input"
                placeholder="Nombre de quien firma"
                aria-label={`Nombre ${role}`}
                {...register(`signoffs.${i}.signerName`)}
              />
              <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" {...register(`signoffs.${i}.signed`)} />
                Visto bueno otorgado
              </label>
            </div>
          ))}
        </div>
      </section>

      {error && <Alert>{error}</Alert>}

      <div className="flex flex-wrap justify-end gap-2 pb-8">
        <button type="button" className="btn" onClick={() => router.back()} disabled={pending}>
          Cancelar
        </button>
        <button type="button" className="btn" onClick={submit(false)} disabled={pending}>
          {pending ? "Guardando…" : "Guardar en progreso"}
        </button>
        <button type="button" className="btn btn-primary" onClick={submit(true)} disabled={pending}>
          Completar revisión
        </button>
      </div>
    </form>
  )
}

const STATUS_STYLES: Record<ResultStatus, string> = {
  ok: "peer-checked:bg-emerald-600 peer-checked:border-emerald-600 peer-checked:text-white",
  pendiente: "peer-checked:bg-amber-500 peer-checked:border-amber-500 peer-checked:text-white",
  no_aplica: "peer-checked:bg-slate-500 peer-checked:border-slate-500 peer-checked:text-white",
}

function CategorySection({
  category,
  register,
  setValue,
  control,
}: {
  category: Category
  register: UseFormRegister<Values>
  setValue: UseFormSetValue<Values>
  control: Control<Values>
}) {
  const results = useWatch({ control, name: "results" })
  const done = category.items.filter((i) => results?.[i.id]?.status).length

  return (
    <section className="card p-0">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold">
          {category.name}{" "}
          <span className="text-sm font-normal text-slate-500">
            {done}/{category.items.length}
          </span>
        </h3>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() =>
            category.items.forEach((i) => {
              if (!results?.[i.id]?.status) setValue(`results.${i.id}.status`, "ok", { shouldDirty: true })
            })
          }
        >
          Marcar sin evaluar como OK
        </button>
      </header>
      <ul className="divide-y divide-slate-100">
        {category.items.map((item) => (
          <li key={item.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
            </div>
            <div className="flex gap-1" role="radiogroup" aria-label={item.label}>
              {(Object.keys(RESULT_STATUSES) as ResultStatus[]).map((status) => (
                <label key={status} className="cursor-pointer">
                  <input
                    type="radio"
                    value={status}
                    className="peer sr-only"
                    {...register(`results.${item.id}.status`)}
                  />
                  <span
                    className={`inline-block rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition peer-focus-visible:ring-2 peer-focus-visible:ring-brand-100 hover:bg-slate-50 ${STATUS_STYLES[status]}`}
                  >
                    {RESULT_STATUSES[status]}
                  </span>
                </label>
              ))}
            </div>
            <input
              className="input md:col-span-2"
              placeholder="Observaciones"
              aria-label={`Observaciones ${item.label}`}
              {...register(`results.${item.id}.notes`)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
