# Effiliving Checklist

App web para gestionar las revisiones de habitaciones y espacios de hotel: plantilla de ítems editable, formulario de revisión por habitación, historial con exportación a PDF/Excel, dashboard de estado y usuarios con roles.

**Publicada en:** https://proyectossoft.github.io/effiliving-checklist/

**Stack:** Next.js 16 (exportación estática) · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS + Edge Functions) · react-hook-form + zod · Recharts · GitHub Pages.

## Arquitectura

La app es un **sitio estático** (GitHub Pages no ejecuta servidor): todo corre en el navegador y habla directo con Supabase usando la clave pública (anon).

- **La seguridad la aplica Row Level Security** en Postgres (`supabase/migrations/0002_auth_rls.sql`). Ocultar menús o redirigir en la app es solo navegación; un usuario no puede leer ni escribir nada que RLS no le permita.
- **Invitar usuarios** requiere la *service role key*, que nunca debe llegar al navegador. Por eso lo hace la Edge Function `supabase/functions/invite-user`, que verifica el permiso `users_manage` de quien llama.
- **PDF y Excel** se generan en el navegador (jsPDF y ExcelJS).
- Las rutas de detalle usan parámetros: `/reviews/view/?id=…`, `/reviews/edit/?id=…`, `/properties/view/?id=…`.

## Pantallas

| Ruta | Qué hace | Acceso |
|---|---|---|
| `/login` | Inicio de sesión con correo y contraseña | Público |
| `/dashboard` | Totales, % OK vs. pendiente por hotel, ítems más pendientes, habitaciones con más pendientes, recientes. Filtros: hotel, fechas, inspector | Todos (sin `dashboard_all`: solo sus revisiones) |
| `/reviews` | Historial filtrable (hotel, habitación, fechas, inspector, estado, tipo) y exportación PDF/Excel | Todos (sin `reviews_all`: solo las propias) |
| `/reviews/new` | Nueva revisión: datos del espacio + checklist por categoría (OK / Pendiente / No aplica + observaciones) + firmas/VoBo | Todos |
| `/reviews/view` | Detalle, exportación PDF/Excel, reabrir/eliminar (`reviews_all`) | Autor o `reviews_all` |
| `/reviews/edit` | Continuar/editar. El autor puede editar mientras está *en progreso*; `reviews_all` siempre | Autor o `reviews_all` |
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
3. Despliega la función de invitaciones:
   ```bash
   npx supabase login
   npx supabase functions deploy invite-user --project-ref <ref>
   ```
4. **Authentication > Sign In / Providers**: desactiva *Allow new users to sign up*. Los usuarios entran solo por invitación.
5. **Authentication > URL Configuration**:
   - *Site URL*: `https://proyectossoft.github.io/effiliving-checklist`
   - *Redirect URLs*: `https://proyectossoft.github.io/effiliving-checklist/**` y `http://localhost:3000/**`
6. **Authentication > Emails > Invite user**: cambia el enlace de la plantilla por:
   ```
   {{ .SiteURL }}/auth/confirm/?token_hash={{ .TokenHash }}&type=invite&next=/account/password/
   ```
7. **Primer administrador**: en **Authentication > Users > Add user**, crea tu usuario con contraseña. Luego, en el SQL Editor:
   ```sql
   update profiles
   set role_id = (select id from roles where name = 'administrador')
   where email = 'tu-correo@empresa.com';
   ```
   A partir de ahí, invita al resto desde `/users`.

### 2. Variables de entorno

Copia `.env.local.example` a `.env.local` y completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase > Project Settings > API). Las dos son públicas por diseño y quedan incluidas en el sitio publicado.

### 3. Desarrollo local

```bash
npm install
npm run dev     # http://localhost:3000
```

### 4. Publicar en GitHub Pages

```bash
npm run deploy
```

Compila el sitio estático (con las variables de `.env.local`) y lo sube a la rama `gh-pages`, que es la que sirve GitHub Pages (**Settings > Pages > Deploy from a branch > gh-pages**). Sin variables configuradas, la página publicada muestra un aviso de "falta conectar Supabase".

### 5. Tipos de la base de datos

`types/database.ts` está escrito a mano a partir de las migraciones. Con el proyecto conectado, se puede regenerar:

```bash
npx supabase gen types typescript --project-id <id> --schema public > types/database.ts
```

## Estructura

```
app/
├─ (auth)/login/          # inicio de sesión
├─ (app)/                 # área autenticada (guarda de sesión + navegación por permisos)
│  ├─ dashboard/
│  ├─ reviews/            # historial, view, new, edit
│  ├─ items/              # categorías e ítems
│  ├─ properties/         # hoteles y habitaciones (view)
│  └─ users/              # usuarios y roles
├─ auth/confirm/          # destino de los enlaces de invitación
└─ account/password/      # definir contraseña tras la invitación
components/               # UI, sesión (auth-provider), carga de datos, filtros, gráficas
lib/
├─ supabase/              # cliente del navegador
├─ data/                  # lecturas y escrituras por módulo
├─ reviews.ts             # consultas de revisiones y agregados
└─ export.ts              # PDF (jsPDF) y Excel (ExcelJS)
scripts/deploy-pages.mjs  # build estático + publicación en gh-pages
supabase/
├─ migrations/
├─ functions/invite-user/ # Edge Function de invitaciones
└─ seed.sql
types/database.ts
```

## Notas

- **Eliminar ítems usados:** un ítem con resultados en revisiones no se puede eliminar (la FK lo impide). Desactívalo: deja de aparecer en revisiones nuevas y se conserva en el historial.
- **Extras a la especificación (en `0002_auth_rls.sql`):** checks de valores válidos, índice único `(review_id, item_id)` en `review_results` para el guardado incremental, índices en FKs y trigger de `updated_at`.
- **Versión con servidor:** el commit `0749113` contiene la versión original (Server Actions, `proxy.ts`), lista para Vercel si más adelante se prefiere ese hosting.
