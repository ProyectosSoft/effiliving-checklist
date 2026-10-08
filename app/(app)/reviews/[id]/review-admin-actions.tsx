"use client"

import { useRouter } from "next/navigation"
import { Alert } from "@/components/ui"
import { useAction } from "@/components/use-action"
import { deleteReview, reopenReview } from "../actions"

export function ReviewAdminActions({ id, completed }: { id: string; completed: boolean }) {
  const router = useRouter()
  const { pending, error, exec } = useAction()

  return (
    <section className="card">
      <h2 className="mb-3 font-semibold">Administración</h2>
      <div className="flex flex-wrap gap-2">
        {completed && (
          <button className="btn" disabled={pending} onClick={() => exec(() => reopenReview(id))}>
            Reabrir (volver a &ldquo;en progreso&rdquo;)
          </button>
        )}
        <button
          className="btn btn-danger"
          disabled={pending}
          onClick={() => {
            if (confirm("¿Eliminar esta revisión? No se puede deshacer.")) {
              exec(() => deleteReview(id), () => router.push("/reviews"))
            }
          }}
        >
          Eliminar revisión
        </button>
      </div>
      {error && (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      )}
    </section>
  )
}
