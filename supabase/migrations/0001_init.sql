-- Effiliving Checklist — esquema base
-- Tablas tal como están definidas en la especificación del proyecto.
-- RLS, políticas, funciones y trigger de perfiles: ver 0002_auth_rls.sql

-- Roles y permisos
create table roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null, -- administrador, supervisor, inspector
  description text,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Perfiles de usuario (extiende auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  role_id uuid references roles(id),
  active boolean default true,
  created_at timestamptz default now()
);

-- Hoteles / propiedades
create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  created_at timestamptz default now()
);

-- Habitaciones / espacios
create table rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  number text not null,
  floor text,
  room_type text,
  created_at timestamptz default now()
);

-- Categorías del checklist (Estructura, Baño, Cocina, etc.)
create table checklist_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Ítems del checklist (plantilla editable: crear, editar, eliminar)
create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references checklist_categories(id) on delete cascade,
  label text not null,
  description text,
  sort_order int default 0,
  active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Revisiones (una por habitación/fecha)
create table checklist_reviews (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  reviewer_id uuid references profiles(id),
  review_type text, -- recibo_de_obra, mantenimiento, preoperativo
  review_date date default current_date,
  status text default 'en_progreso', -- en_progreso, completada
  created_at timestamptz default now()
);

-- Resultado de cada ítem dentro de una revisión
create table review_results (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references checklist_reviews(id) on delete cascade,
  item_id uuid references checklist_items(id),
  status text, -- ok, pendiente, no_aplica
  notes text,
  updated_at timestamptz default now()
);

-- Firmas / VoBo de la revisión
create table review_signoffs (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references checklist_reviews(id) on delete cascade,
  role_label text, -- Constructor, Interventoría, Gerencia de obra, Maestro de obra
  signer_name text,
  signed_at timestamptz
);
