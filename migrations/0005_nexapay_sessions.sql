create table if not exists nexapay_sessions (
  id serial primary key,
  kind text not null check (kind in ('membership', 'order')),
  user_id text not null,
  order_id integer references orders (id) on delete set null,
  nexapay_order_id text not null unique,
  client_ref text not null unique,
  amount_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists nexapay_sessions_user_id_idx on nexapay_sessions (user_id);
create index if not exists nexapay_sessions_order_id_idx on nexapay_sessions (order_id);
