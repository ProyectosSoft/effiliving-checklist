# Effiliving Checklist

App web para gestionar las revisiones de habitaciones y espacios de hotel: plantilla de ítems editable, formulario de revisión por habitación, historial con exportación a PDF/Excel, dashboard de estado y usuarios con roles.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) · react-hook-form + zod · Recharts · Vercel.

## Pantallas

| Ruta | Qué hace | Acceso |
|---|---|---|
| `/login` | Inicio de sesión con correo y contraseña | Público |
| `/dashboard` | Totales, % OK vs. pendiente por hotel, ítems más pendientes, habitaciones con más pendientes, recientes. Filtros: hotel, fechas, inspector | Todos (sin `dashboard_all`: solo sus revisiones) |
| `/reviews` | Historial filtrable (hotel, habitación, fechas, inspector, estado, tipo) y exportación PDF/Excel | Todos (sin `reviews_all`: solo las propias) |
| `/reviews/new` | Nueva revisión: datos del espacio + checklist por categoría (OK / Pendiente / No aplica + observaciones) + firmas/VoBo | Todos |
| `/reviews/[id]` | Detalle, exportación PDF/Excel, reabrir/eliminar (`reviews_all`) | Autor o `reviews_all` |
| `/reviews/[id]/edit` | Continuar/editar. El autor puede editar mientras está *en progreso*; `reviews_all` siempre | Autor o `reviews_all` |
| `/items` | Categorías e ítems: crear, editar, reordenar, activar/desactivar, eliminar | `items_manage` |
| `/properties` | Hoteles y habitaciones por piso (alta masiva por rangos: `201-215, 220`) | `properties_manage` |
| `/users` | Invitar usuarios, editar nombre/estado/rol; crear y editar roles y permisos | `users_manage` |

## Roles y permisos

Los permisos viven en `roles.permissions` (jsonb), no en el nombre del rol, así un rol creado desde `/users` funciona sin tocar SQL. Las políticas RLS los evalúan con `public.has_permission()`.

| Permiso | administrador | supervisor | inspector |
|---|:-:|:-:|:-:|
| `reviews_all`: ver/editar todas las revisiones | ✅ | ✅ | — |
| `items_manage`: plantilla del checklist | ✅ | ✅ | — |
| `properties_manage`: hoteles y habitaciones | ✅ | ✅ | — |
| `users_manage`: usuarios y roles | ✅ | — | — |
| `dashboard_all`: dashboard global | ✅ | ✅ | — |

Todo usuario activo puede crear y llenar sus propias revisiones. Los usuarios nuevos reciben el rol `inspector` automáticamente (trigger `on_auth_user_created`). Un usuario desactivado pierde todos los permisos.

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta en este orden:
   1. `supabase/migrations/0001_init.sql`: tablas.
   2. `supabase/migrations/0002_auth_rls.sql`: RLS, políticas, funciones y trigger.
   3. `supabase/seed.sql`: roles y plantilla inicial (9 categorías, 62 ítems).

   O con la CLI: `npx supabase link --project-ref <ref>` y `npx supabase db push`, y luego ejecuta `seed.sql` en el SQL Editor.
3. **Authentication > Sign In / Providers**: desactiva *Allow new users to sign up*. Los usuarios entran solo por invitación.
4. **Authentication > URL Configuration**: define *Site URL* (la URL de Vercel) y agrega `http://localhost:3000/**` y `https://<tu-app>.vercel.app/**` a *Redirect URLs*.
5. **Authentication > Emails > Invite user**: cambia el enlace de la plantilla por:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/account/password
   ```
6. **Primer administrador**: en **Authentication > Users > Add user**, crea tu usuario con contraseña. Luego, en el SQL Editor:
   ```sql
   update profiles
   set role_id = (select id from roles where name = 'administrador')
   where email = 'tu-correo@empresa.com';
   ```
   A partir de ahí, invita al resto desde `/users`.

### 2. Variables de entorno

Copia `.env.local.example` a `.env.local` y complétalo (Supabase > Project Settings > API):

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor.** Para enviar invitaciones desde `/users` |
| `NEXT_PUBLIC_SITE_URL` | URL pública de la app (enlace de invitación) |

### 3. Desarrollo local

```bash
npm install
npm run dev     # http://localhost:3000
```

### 4. Tipos de la base de datos

`types/database.ts` está escrito a mano a partir de las migraciones. Con el proyecto conectado, se puede regenerar:

```bash
npx supabase gen types typescript --project-id <id> --schema public > types/database.ts
```

### 5. Despliegue en Vercel

1. En Vercel: **Add New > Project** e importa `ProyectosSoft/effiliving-checklist`.
2. Configura las 4 variables de entorno anteriores (con `NEXT_PUBLIC_SITE_URL` = URL de Vercel).
3. Despliega. Cada push a `main` se despliega automáticamente.

## Estructura

```
app/
├─ (auth)/login/          # inicio de sesión
├─ (app)/                 # área autenticada (layout con navegación por permisos)
│  ├─ dashboard/
│  ├─ reviews/            # historial, detalle, nueva, edición y exportación
│  ├─ items/              # categorías e ítems
│  ├─ properties/         # hoteles y habitaciones
│  └─ users/              # usuarios y roles
├─ auth/confirm/          # destino de los enlaces de invitación
├─ auth/signout/
└─ account/password/      # definir contraseña tras la invitación
components/               # UI compartida, filtros, gráficas
lib/
├─ supabase/              # clientes browser, server, admin (service role) y proxy
├─ auth.ts                # usuario actual + permisos
├─ reviews.ts             # consultas de revisiones y agregados
└─ export.ts              # generación de PDF (jsPDF) y Excel (ExcelJS)
proxy.ts                  # (antes "middleware") sesión, login obligatorio y rutas por rol
supabase/
├─ migrations/
└─ seed.sql
types/database.ts
```

## Notas

- **Next.js 16:** `middleware.ts` ahora se llama `proxy.ts`. Está activo `cacheComponents`, así que todo lo que lee la sesión se renderiza dentro de `<Suspense>`.
- **Seguridad:** la autorización real está en RLS. `proxy.ts` y las comprobaciones en páginas y acciones solo mejoran la experiencia (ocultan y redirigen).
- **Eliminar ítems usados:** un ítem con resultados en revisiones no se puede eliminar (la FK lo impide). Desactívalo: deja de aparecer en revisiones nuevas y se conserva en el historial.
- **Extras a la especificación (en `0002_auth_rls.sql`):** checks de valores válidos, índice único `(review_id, item_id)` en `review_results` para el guardado incremental, índices en FKs y trigger de `updated_at`.
