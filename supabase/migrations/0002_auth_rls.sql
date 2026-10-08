-- Effiliving Checklist — permisos, Row Level Security y trigger de perfiles
--
-- Los permisos viven en roles.permissions (jsonb), no en el nombre del rol,
-- así un rol creado desde la app funciona sin tocar SQL. Claves usadas:
--   reviews_all        ver/editar/eliminar todas las revisiones (sin él: solo las propias)
--   items_manage       crear/editar/eliminar categorías e ítems del checklist
--   properties_manage  crear/editar/eliminar hoteles y habitaciones
--   users_manage       gestionar usuarios y roles
--   dashboard_all      dashboard con todas las revisiones (sin él: solo las propias)

-- ---------------------------------------------------------------------------
-- Integridad e índices
-- ---------------------------------------------------------------------------
alter table checklist_reviews
  add constraint checklist_reviews_status_check
    check (status in ('en_progreso', 'completada')),
  add constraint checklist_reviews_type_check
    check (review_type in ('recibo_de_obra', 'mantenimiento', 'preoperativo'));

alter table review_results
  add constraint review_results_status_check
    check (status in ('ok', 'pendiente', 'no_aplica'));

create unique index review_results_review_item_key on review_results (review_id, item_id);
create index profiles_role_id_idx on profiles (role_id);
create index rooms_property_id_idx on rooms (property_id);
create index checklist_items_category_id_idx on checklist_items (category_id);
create index checklist_reviews_room_id_idx on checklist_reviews (room_id);
create index checklist_reviews_reviewer_id_idx on checklist_reviews (reviewer_id);
create index checklist_reviews_review_date_idx on checklist_reviews (review_date);
create index review_results_item_id_idx on review_results (item_id);
create index review_signoffs_review_id_idx on review_signoffs (review_id);

-- ---------------------------------------------------------------------------
-- Funciones auxiliares (security definer para no depender de RLS al evaluarse)
-- ---------------------------------------------------------------------------
create or replace function public.is_active_user()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and coalesce(p.active, false)
  );
$$;

create or replace function public.has_permission(perm text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select (r.permissions -> perm) = 'true'::jsonb
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid() and coalesce(p.active, false)
  ), false);
$$;

create or replace function public.can_read_review(rid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.checklist_reviews r
    where r.id = rid
      and (r.reviewer_id = auth.uid() or public.has_permission('reviews_all'))
  );
$$;

-- Quien creó la revisión puede editarla mientras esté en progreso;
-- con reviews_all se puede editar siempre.
create or replace function public.can_edit_review(rid uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.checklist_reviews r
    where r.id = rid
      and (
        (r.reviewer_id = auth.uid() and r.status = 'en_progreso' and public.is_active_user())
        or public.has_permission('reviews_all')
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Trigger: crear perfil con rol 'inspector' al registrarse un usuario
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role_id)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    (select id from public.roles where name = 'inspector')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantener review_results.updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger review_results_touch_updated_at
  before update on review_results
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Permisos de tabla para el rol 'authenticated' (RLS filtra las filas)
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function
  public.is_active_user(), public.has_permission(text),
  public.can_read_review(uuid), public.can_edit_review(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table roles enable row level security;
alter table profiles enable row level security;
alter table properties enable row level security;
alter table rooms enable row level security;
alter table checklist_categories enable row level security;
alter table checklist_items enable row level security;
alter table checklist_reviews enable row level security;
alter table review_results enable row level security;
alter table review_signoffs enable row level security;

-- roles
create policy "roles: lectura autenticados" on roles
  for select to authenticated using (true);
create policy "roles: gestión usuarios_manage" on roles
  for all to authenticated
  using (public.has_permission('users_manage'))
  with check (public.has_permission('users_manage'));

-- profiles (las filas nuevas las crea el trigger; solo users_manage cambia rol/estado)
create policy "profiles: lectura autenticados" on profiles
  for select to authenticated using (true);
create policy "profiles: actualización users_manage" on profiles
  for update to authenticated
  using (public.has_permission('users_manage'))
  with check (public.has_permission('users_manage'));

-- properties
create policy "properties: lectura autenticados" on properties
  for select to authenticated using (true);
create policy "properties: gestión properties_manage" on properties
  for all to authenticated
  using (public.has_permission('properties_manage'))
  with check (public.has_permission('properties_manage'));

-- rooms
create policy "rooms: lectura autenticados" on rooms
  for select to authenticated using (true);
create policy "rooms: gestión properties_manage" on rooms
  for all to authenticated
  using (public.has_permission('properties_manage'))
  with check (public.has_permission('properties_manage'));

-- checklist_categories
create policy "categories: lectura autenticados" on checklist_categories
  for select to authenticated using (true);
create policy "categories: gestión items_manage" on checklist_categories
  for all to authenticated
  using (public.has_permission('items_manage'))
  with check (public.has_permission('items_manage'));

-- checklist_items: activos para todos; inactivos para quien gestiona ítems,
-- quien ve todas las revisiones, o si el ítem aparece en una revisión propia.
create policy "items: lectura" on checklist_items
  for select to authenticated using (
    active
    or public.has_permission('items_manage')
    or public.has_permission('reviews_all')
    or exists (
      select 1 from review_results rr
      join checklist_reviews r on r.id = rr.review_id
      where rr.item_id = checklist_items.id and r.reviewer_id = auth.uid()
    )
  );
create policy "items: gestión items_manage" on checklist_items
  for all to authenticated
  using (public.has_permission('items_manage'))
  with check (public.has_permission('items_manage'));

-- checklist_reviews
create policy "reviews: lectura propias o reviews_all" on checklist_reviews
  for select to authenticated
  using (reviewer_id = auth.uid() or public.has_permission('reviews_all'));
create policy "reviews: crear propias" on checklist_reviews
  for insert to authenticated
  with check (reviewer_id = auth.uid() and public.is_active_user());
create policy "reviews: editar" on checklist_reviews
  for update to authenticated
  using (
    (reviewer_id = auth.uid() and status = 'en_progreso' and public.is_active_user())
    or public.has_permission('reviews_all')
  )
  with check (reviewer_id = auth.uid() or public.has_permission('reviews_all'));
create policy "reviews: eliminar reviews_all" on checklist_reviews
  for delete to authenticated
  using (public.has_permission('reviews_all'));

-- review_results
create policy "results: lectura" on review_results
  for select to authenticated using (public.can_read_review(review_id));
create policy "results: escritura" on review_results
  for all to authenticated
  using (public.can_edit_review(review_id))
  with check (public.can_edit_review(review_id));

-- review_signoffs
create policy "signoffs: lectura" on review_signoffs
  for select to authenticated using (public.can_read_review(review_id));
create policy "signoffs: escritura" on review_signoffs
  for all to authenticated
  using (public.can_edit_review(review_id))
  with check (public.can_edit_review(review_id));
