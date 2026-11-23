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
