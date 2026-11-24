-- Telegram-бот: настройки собеседников и связь сообщений группы менеджеров с клиентами.
-- Таблицы служебные: к ним ходит только сервер (ключ service role), политик для anon и authenticated нет.
create table if not exists bot_users (
  chat_id    bigint primary key,
  lang       text not null default 'ru' check (lang in ('ru', 'uz')),
  session_id uuid references chat_sessions (id) on delete set null,
  username   text,
  created_at timestamptz not null default now()
);

create table if not exists bot_threads (
  group_message_id bigint primary key,       -- сообщение с обращением клиента в группе менеджеров
  client_chat_id   bigint not null,
  created_at       timestamptz not null default now()
);

alter table bot_users   enable row level security;
alter table bot_threads enable row level security;

grant all on bot_users, bot_threads to service_role;
