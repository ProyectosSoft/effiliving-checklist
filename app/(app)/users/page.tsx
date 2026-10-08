"use client"

import { useAuth } from "@/components/auth-provider"
import { LoadError, Loading, PageHeader } from "@/components/ui"
import { RefreshContext, useData } from "@/components/use-data"
import { loadUsersAndRoles } from "@/lib/data/users"
import { RolesManager } from "./roles-manager"
import { UsersManager } from "./users-manager"

export default function UsersPage() {
  const { user } = useAuth()
  const { data, error, reload } = useData(loadUsersAndRoles, "users")

  return (
    <>
      <PageHeader title="Usuarios y roles" description="Invita usuarios, asigna roles y define qué puede hacer cada rol." />
      {error && <LoadError message={error} />}
      {!data && !error && <Loading />}
      {data && user && (
        <RefreshContext.Provider value={reload}>
          <div className="space-y-8">
            <UsersManager
              meId={user.id}
              profiles={data.profiles}
              roles={data.roles.map(({ id, name }) => ({ id, name }))}
            />
            <RolesManager roles={data.roles} />
          </div>
        </RefreshContext.Provider>
      )}
    </>
  )
}
