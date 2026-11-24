-- Тексты сайта, которые можно менять из админки. Пустая таблица = на сайте стандартные тексты из файлов локализации.
create table if not exists site_texts (
  key        text not null check (key ~ '^home\.[A-Za-z0-9]+$'),
  lang       text not null check (lang in ('ru', 'uz')),
  value      text not null check (length(value) <= 600),
  updated_at timestamptz not null default now(),
  primary key (key, lang)
);

alter table site_texts enable row level security;
create policy site_texts_read  on site_texts for select using (true);
create policy site_texts_write on site_texts for all using (is_staff()) with check (is_staff());

grant all on site_texts to anon, authenticated, service_role;
