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
