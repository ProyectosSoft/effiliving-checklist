"use client"

import { LoadError, Loading, PageHeader } from "@/components/ui"
import { RefreshContext, useData } from "@/components/use-data"
import { loadItemsTemplate } from "@/lib/data/items"
import { ItemsManager } from "./items-manager"

export default function ItemsPage() {
  const { data, error, reload } = useData(loadItemsTemplate, "items")

  return (
    <>
      <PageHeader
        title="Ítems del checklist"
        description="Plantilla de categorías e ítems que se usa en cada revisión. Los ítems inactivos no aparecen en revisiones nuevas."
      />
      {error && <LoadError message={error} />}
      {!data && !error && <Loading />}
      {data && (
        <RefreshContext.Provider value={reload}>
          <ItemsManager categories={data} />
        </RefreshContext.Provider>
      )}
    </>
  )
}
