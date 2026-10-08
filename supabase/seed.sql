-- Effiliving Checklist — datos semilla: roles, categorías e ítems iniciales

insert into roles (name, description, permissions) values
  ('administrador', 'Acceso total: revisiones, plantilla, hoteles, usuarios y roles',
   '{"reviews_all": true, "items_manage": true, "properties_manage": true, "users_manage": true, "dashboard_all": true}'),
  ('supervisor', 'Gestiona revisiones, plantilla del checklist, hoteles y habitaciones',
   '{"reviews_all": true, "items_manage": true, "properties_manage": true, "users_manage": false, "dashboard_all": true}'),
  ('inspector', 'Crea y llena sus propias revisiones',
   '{"reviews_all": false, "items_manage": false, "properties_manage": false, "users_manage": false, "dashboard_all": false}')
on conflict (name) do nothing;

with data(category, cat_order, items) as (
  values
    ('Estructura y acabados', 1, array[
      'Piso (laminado/enchape)', 'Techo/cielo falso', 'Pintura de paredes', 'Papel tapiz',
      'Estuco y fondeo', 'Zócalos']),
    ('Mobiliario y dotación', 2, array[
      'Cama/base cama', 'Colchón', 'Escritorio', 'Silla/sillón',
      'Closet (puertas, cajones, rieles)', 'Ganchos en el closet', 'Nocheros',
      'Espejo de habitación', 'Caja fuerte']),
    ('Electrodomésticos y climatización', 3, array[
      'Nevera/minibar', 'Horno microondas', 'Aire acondicionado/minisplit',
      'Televisor y control remoto', 'Secador de cabello', 'Cafetera/hervidor']),
    ('Iluminación', 4, array[
      'Iluminación general', 'Lámparas de noche/escritorio', 'Iluminación del baño',
      'Iluminación de cocina', 'Iluminación del closet', 'Cinta LED decorativa',
      'Interruptores y tomas']),
    ('Baño', 5, array[
      'Lavamanos y grifería', 'Sanitario', 'Ducha/cabina', 'Agua caliente',
      'Accesorios de ducha', 'Espejo de baño', 'Enchape de baño', 'Extractor de olores',
      'Puerta de baño']),
    ('Cocina/kitchenette', 6, array[
      'Mesón y lavamanos', 'Mueble de cocina', 'Pozuelo', 'Salpicadero',
      'Manguera de agua caliente', 'Estufa/inducción', 'Vajilla y utensilios']),
    ('Puertas, ventanas y cerradura', 7, array[
      'Puerta de habitación', 'Puerta de closet', 'Ventana', 'Persianas/cortinas',
      'Cerradura electrónica (batería/carga)', 'Chapa de baño']),
    ('Textiles y detalles', 8, array[
      'Tendidos de cama', 'Almohadas', 'Cortinero y velo', 'Tela de colgadura', 'Toallas',
      'Cobija/edredón adicional']),
    ('Seguridad y automatización', 9, array[
      'Rociadores RCI', 'Detector de humo', 'Tomas y suiches', 'Automatización de habitación',
      'Panel PVC en baños', 'Tapa de registro'])
),
cats as (
  insert into checklist_categories (name, sort_order)
  select category, cat_order from data
  returning id, name
)
insert into checklist_items (category_id, label, sort_order)
select cats.id, item.label, item.ord
from data
join cats on cats.name = data.category
cross join lateral unnest(data.items) with ordinality as item(label, ord);
