"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Alert } from "@/components/ui"
import { useAction } from "@/components/use-action"
import { createProperty, deleteProperty, updateProperty, type PropertyInput } from "@/lib/data/properties"

const schema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  address: z.string(),
  city: z.string(),
})
type Values = z.infer<typeof schema>

function PropertyFields({ form }: { form: ReturnType<typeof useForm<Values>> }) {
  const {
    register,
    formState: { errors },
  } = form
  return (
    <>
      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <input id="name" className="input" {...register("name")} />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div>
        <label className="label" htmlFor="address">
          Dirección
        </label>
        <input id="address" className="input" {...register("address")} />
      </div>
      <div>
        <label className="label" htmlFor="city">
          Ciudad
        </label>
        <input id="city" className="input" {...register("city")} />
      </div>
    </>
  )
}

export function NewPropertyForm() {
  const router = useRouter()
  const { pending, error, exec } = useAction()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", address: "", city: "" } })

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) =>
        exec(
          () => createProperty(values),
          (id) => {
            form.reset()
            if (id) router.push(`/properties/view/?id=${id}`)
          },
        ),
      )}
    >
      <PropertyFields form={form} />
      {error && <Alert>{error}</Alert>}
      <button className="btn btn-primary w-full" disabled={pending}>
        Crear hotel
      </button>
    </form>
  )
}

export function EditPropertyForm({ id, initial }: { id: string; initial: PropertyInput }) {
  const router = useRouter()
  const { pending, error, exec } = useAction()
  const [saved, setSaved] = useState(false)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial.name, address: initial.address ?? "", city: initial.city ?? "" },
  })

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => {
        setSaved(false)
        exec(() => updateProperty(id, values), () => setSaved(true))
      })}
    >
      <PropertyFields form={form} />
      {error && <Alert>{error}</Alert>}
      {saved && <Alert tone="success">Cambios guardados.</Alert>}
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" disabled={pending}>
          Guardar
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={pending}
          onClick={() => {
            if (confirm("¿Eliminar este hotel con todas sus habitaciones y revisiones?")) {
              exec(() => deleteProperty(id), () => router.push("/properties"))
            }
          }}
        >
          Eliminar
        </button>
      </div>
    </form>
  )
}
