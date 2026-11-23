-- Роли, триггер создания профиля и политики доступа (RLS).
-- Сервер ходит в базу с ключом service role: он обходит RLS, поэтому политики нужны прежде всего
-- для запросов прямо из браузера (ключ anon) и как вторая линия защиты.

-- ---------------------------------------------------------------- профиль при регистрации
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------- помощники для политик
-- security definer: читают profiles в обход RLS, иначе политика ссылалась бы сама на себя
create function auth_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('manager', 'admin'), false)
$$;

-- ---------------------------------------------------------------- включаем RLS везде
alter table districts         enable row level security;
alter table properties        enable row level security;
alter table property_photos   enable row level security;
alter table profiles          enable row level security;
alter table favorites         enable row level security;
alter table leads             enable row level security;
alter table reviews           enable row level security;
alter table chat_sessions     enable row level security;
alter table chat_messages     enable row level security;
alter table kb_documents      enable row level security;
alter table kb_chunks         enable row level security;
alter table mortgage_programs enable row level security;
alter table currency_rates    enable row level security;

-- ---------------------------------------------------------------- публичное чтение
create policy districts_read  on districts         for select using (true);
create policy mortgage_read   on mortgage_programs for select using (true);
create policy currency_read   on currency_rates    for select using (true);

-- Каталог: гости видят только активные дома, сотрудники — все
create policy properties_read on properties for select using (status = 'active' or is_staff());
create policy properties_write on properties for all using (is_staff()) with check (is_staff());

create policy photos_read on property_photos for select using (
  exists (select 1 from properties p where p.id = property_id and (p.status = 'active' or is_staff()))
);
create policy photos_write on property_photos for all using (is_staff()) with check (is_staff());

create policy mortgage_write on mortgage_programs for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------------------------------------------------------------- профили
create policy profiles_read_own on profiles for select using (id = auth.uid() or is_staff());

-- Свои данные менять можно, а роль — нет (повысить себя до admin нельзя)
create policy profiles_update_own on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = auth_role());

create policy profiles_admin_all on profiles for all using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ---------------------------------------------------------------- избранное: только владелец
create policy favorites_owner on favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- заявки: вставка всем, чтение сотрудникам
create policy leads_insert on leads for insert
  with check (status = 'new' and manager_id is null);
create policy leads_staff_read   on leads for select using (is_staff());
create policy leads_staff_update on leads for update using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------- отзывы
-- Тональность и тему ставит только сервер, поэтому при вставке из браузера они пустые
create policy reviews_insert on reviews for insert
  with check (sentiment is null and topic is null and (user_id is null or user_id = auth.uid()));
create policy reviews_staff_read   on reviews for select using (is_staff());
create policy reviews_staff_update on reviews for update using (is_staff()) with check (is_staff());

-- ---------------------------------------------------------------- чат
-- Пишет сервер; владелец может читать свою переписку, сотрудники — всю
create policy chat_sessions_read on chat_sessions for select using (user_id = auth.uid() or is_staff());
create policy chat_messages_read on chat_messages for select using (
  is_staff() or exists (select 1 from chat_sessions s where s.id = session_id and s.user_id = auth.uid())
);

-- ---------------------------------------------------------------- база знаний: читают и меняют сотрудники
create policy kb_documents_staff on kb_documents for all using (is_staff()) with check (is_staff());
create policy kb_chunks_staff    on kb_chunks    for all using (is_staff()) with check (is_staff());
