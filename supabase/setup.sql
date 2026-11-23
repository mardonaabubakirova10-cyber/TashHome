-- TashHome: вся схема одним файлом (миграции 0001–0003 и сид районов и ипотеки).
-- Вставьте целиком в Supabase → SQL Editor → Run. Выполняется один раз на чистую базу.

-- ================= supabase/migrations/0001_schema.sql =================
-- TashHome: схема базы данных (SPEC §4).
-- Применяется на чистую БД Supabase: SQL Editor → вставить файл → Run (или `supabase db push`).

create extension if not exists vector;

-- ---------------------------------------------------------------- районы
-- id — короткое имя латиницей (как в ml-модели и на сайте), а не число
create table districts (
  id       text primary key,
  name_ru  text not null,
  name_uz  text not null,
  lat      double precision not null,
  lng      double precision not null
);

-- ---------------------------------------------------------------- дома
create table properties (
  id                  bigint generated always as identity primary key,
  deal_type           text not null check (deal_type in ('sale', 'rent')),
  title_ru            text not null,
  title_uz            text not null,
  description_ru      text,
  description_uz      text,
  district_id         text not null references districts (id),
  address             text,
  lat                 double precision,
  lng                 double precision,
  price_usd           numeric(12, 2) not null check (price_usd > 0), -- для аренды цена в месяц
  area_m2             numeric(7, 1) not null check (area_m2 > 0),     -- площадь дома
  land_sotka          numeric(6, 1) not null check (land_sotka >= 0), -- площадь участка
  rooms               smallint not null check (rooms between 1 and 20),
  floors              smallint not null default 1 check (floors between 1 and 10),
  building_type       text not null check (building_type in ('brick', 'block', 'monolith')),
  renovation          text not null check (renovation in ('none', 'basic', 'euro', 'designer')),
  year_built          smallint check (year_built between 1800 and 2100),
  status              text not null default 'active' check (status in ('active', 'sold', 'hidden')),
  predicted_price_usd numeric(12, 2),                                 -- оценка модели
  price_label         text check (price_label in ('below', 'fair', 'above')),
  search_embedding    vector(768),                                    -- для поиска по смыслу
  created_at          timestamptz not null default now()
);

create index properties_district_idx on properties (district_id);
create index properties_catalog_idx on properties (status, deal_type, price_usd);
create index properties_embedding_idx on properties using hnsw (search_embedding vector_cosine_ops);

create table property_photos (
  id          bigint generated always as identity primary key,
  property_id bigint not null references properties (id) on delete cascade,
  url         text not null,
  position    smallint not null default 0
);
create index property_photos_property_idx on property_photos (property_id, position);

-- ---------------------------------------------------------------- пользователи
-- Строка создаётся автоматически при регистрации (триггер в 0002_security.sql)
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'client' check (role in ('client', 'manager', 'admin')),
  full_name   text,
  phone       text check (phone is null or phone ~ '^\+998[0-9]{9}$'),
  telegram_id bigint unique,
  lang        text not null default 'ru' check (lang in ('ru', 'uz')),
  created_at  timestamptz not null default now()
);

create table favorites (
  user_id     uuid not null references profiles (id) on delete cascade,
  property_id bigint not null references properties (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, property_id)
);

-- ---------------------------------------------------------------- заявки и отзывы
create table leads (
  id          bigint generated always as identity primary key,
  property_id bigint references properties (id) on delete set null,
  name        text not null check (length(name) between 2 and 100),
  phone       text not null check (phone ~ '^\+998[0-9]{9}$'),
  message     text check (length(message) <= 2000),
  source      text not null default 'site' check (source in ('site', 'miniapp', 'bot', 'assistant')),
  status      text not null default 'new' check (status in ('new', 'in_progress', 'viewing', 'closed', 'rejected')),
  manager_id  uuid references profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index leads_status_idx on leads (status, created_at desc);

create table reviews (
  id         bigint generated always as identity primary key,
  user_id    uuid references profiles (id) on delete set null,
  rating     smallint not null check (rating between 1 and 5),
  text       text not null check (length(text) between 3 and 2000),
  sentiment  text check (sentiment in ('positive', 'neutral', 'negative')),
  topic      text check (topic in ('service', 'price', 'property', 'manager', 'other')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- ассистент
create table chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles (id) on delete set null,
  channel    text not null check (channel in ('site', 'miniapp', 'bot')),
  created_at timestamptz not null default now()
);

create table chat_messages (
  id         bigint generated always as identity primary key,
  session_id uuid not null references chat_sessions (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant', 'tool')),
  content    text,
  tool_calls jsonb,
  rating     smallint not null default 0 check (rating in (-1, 0, 1)),
  latency_ms integer,
  created_at timestamptz not null default now()
);
create index chat_messages_session_idx on chat_messages (session_id, created_at);

-- ---------------------------------------------------------------- база знаний
create table kb_documents (
  id          bigint generated always as identity primary key,
  title       text not null,
  source_file text,
  created_at  timestamptz not null default now()
);

create table kb_chunks (
  id          bigint generated always as identity primary key,
  document_id bigint not null references kb_documents (id) on delete cascade,
  content     text not null,
  embedding   vector(768)
);
create index kb_chunks_document_idx on kb_chunks (document_id);
create index kb_chunks_embedding_idx on kb_chunks using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------- ипотека и курс
create table mortgage_programs (
  id               bigint generated always as identity primary key,
  bank_name        text not null,
  program_name     text not null,
  rate_percent     numeric(5, 2) not null check (rate_percent >= 0),
  min_down_percent numeric(5, 2) not null check (min_down_percent between 0 and 100),
  max_term_years   smallint not null check (max_term_years > 0),
  max_amount_usd   numeric(12, 2),
  notes            text
);

create table currency_rates (
  date    date primary key,
  usd_uzs numeric(10, 2) not null check (usd_uzs > 0)
);

-- ================= supabase/migrations/0002_security.sql =================
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

-- ================= supabase/migrations/0003_search_functions.sql =================
-- Векторный поиск. Расстояние косинусное: чем ближе similarity к 1, тем ближе по смыслу.

-- Поиск по базе знаний для ответов ассистента
create function match_kb_chunks(query_embedding vector(768), k int default 5)
returns table (id bigint, document_id bigint, content text, similarity double precision)
language sql stable as $$
  select c.id, c.document_id, c.content, 1 - (c.embedding <=> query_embedding) as similarity
  from kb_chunks c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit k
$$;

-- Поиск домов по смыслу с обычными фильтрами.
-- filters (все ключи необязательные): deal_type, district_id, min_price, max_price, min_rooms, min_area, min_land
create function match_properties(query_embedding vector(768), filters jsonb default '{}', k int default 5)
returns table (id bigint, similarity double precision)
language sql stable as $$
  select p.id, 1 - (p.search_embedding <=> query_embedding) as similarity
  from properties p
  where p.status = 'active'
    and p.search_embedding is not null
    and (filters ->> 'deal_type'   is null or p.deal_type   =  filters ->> 'deal_type')
    and (filters ->> 'district_id' is null or p.district_id =  filters ->> 'district_id')
    and (filters ->> 'min_price'   is null or p.price_usd   >= (filters ->> 'min_price')::numeric)
    and (filters ->> 'max_price'   is null or p.price_usd   <= (filters ->> 'max_price')::numeric)
    and (filters ->> 'min_rooms'   is null or p.rooms       >= (filters ->> 'min_rooms')::int)
    and (filters ->> 'min_area'    is null or p.area_m2     >= (filters ->> 'min_area')::numeric)
    and (filters ->> 'min_land'    is null or p.land_sotka  >= (filters ->> 'min_land')::numeric)
  order by p.search_embedding <=> query_embedding
  limit k
$$;

-- ================= supabase/seed/01_districts_and_mortgage.sql =================
-- Справочники: районы Ташкента и ориентировочные ипотечные программы.
-- Координаты — приблизительные центры районов. Условия банков — демонстрационные, не настоящие предложения.

insert into districts (id, name_ru, name_uz, lat, lng) values
  ('yunusabad',      'Юнусабад',      'Yunusobod',       41.365, 69.285),
  ('mirzo-ulugbek',  'Мирзо-Улугбек', 'Mirzo Ulug‘bek',  41.340, 69.335),
  ('chilanzar',      'Чиланзар',      'Chilonzor',       41.275, 69.205),
  ('shaykhantakhur', 'Шайхантахур',   'Shayxontohur',    41.330, 69.230),
  ('yakkasaray',     'Яккасарай',     'Yakkasaroy',      41.295, 69.265),
  ('mirabad',        'Мирабад',       'Mirobod',         41.300, 69.290),
  ('sergeli',        'Сергели',       'Sergeli',         41.225, 69.220),
  ('yashnabad',      'Яшнабад',       'Yashnobod',       41.295, 69.340),
  ('almazar',        'Алмазар',       'Olmazor',         41.350, 69.240),
  ('uchtepa',        'Учтепа',        'Uchtepa',         41.300, 69.170),
  ('bektemir',       'Бектемир',      'Bektemir',        41.215, 69.335),
  ('yangihayot',     'Янгихаёт',      'Yangihayot',      41.340, 69.130)
on conflict (id) do nothing;

insert into mortgage_programs (bank_name, program_name, rate_percent, min_down_percent, max_term_years, max_amount_usd, notes) values
  ('Банк А', 'Стандартная', 24, 30, 15, 150000, 'Демонстрационные условия'),
  ('Банк А', 'Льготная для молодых семей', 18, 20, 20, 100000, 'Демонстрационные условия'),
  ('Банк Б', 'Новостройки и частные дома', 22, 25, 20, 200000, 'Демонстрационные условия'),
  ('Банк В', 'Короткая', 26, 50, 7, 120000, 'Демонстрационные условия'),
  ('Банк Г', 'Первый взнос от 15 %', 25, 15, 15, 80000, 'Демонстрационные условия'),
  ('Банк Д', 'Максимальный срок', 23, 30, 25, 180000, 'Демонстрационные условия');


-- ================= supabase/migrations/0004_grants.sql =================
-- Права ролей Supabase на таблицы схемы public.
-- В новых проектах таблицы, созданные через SQL Editor, не получают права автоматически, и API отвечает «permission denied».
-- Что именно разрешено, по-прежнему решают политики RLS из 0002_security.sql: без подходящей политики anon и authenticated
-- ничего не увидят и не запишут. Роль service_role (ключ сервера) обходит RLS.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- то же для таблиц, которые появятся позже
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
