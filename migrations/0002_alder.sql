create table if not exists profiles (
  user_id text primary key,
  email text not null default '',
  is_admin boolean not null default false,
  membership_paid_at timestamptz,
  credit_cents integer not null default 0,
  legal_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id serial primary key,
  name text not null,
  size_label text not null default '',
  category text not null default 'peptide',
  price_cents integer not null,
  stock integer not null default 0,
  coa_url text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists store_settings (
  id integer primary key,
  store_name text not null default 'Livewell42',
  support_email text not null default 'support@example.com',
  owner_email text not null default '',
  shipping_cents integer not null default 1500,
  free_shipping_at_cents integer not null default 25000,
  nexapay_api_key text not null default '',
  usdc_wallet text not null default '',
  usdt_tron_wallet text not null default '',
  btc_wallet text not null default '',
  usdc_pay_wallet text not null default ''
);

insert into store_settings (id) values (1)
on conflict (id) do nothing;

create table if not exists orders (
  id serial primary key,
  user_id text not null,
  order_number text not null unique,
  merchandise_cents integer not null,
  credit_cents integer not null default 0,
  shipping_cents integer not null,
  total_cents integer not null,
  status text not null default 'paid',
  ship_name text not null,
  ship_street text not null,
  ship_city text not null,
  ship_state text not null,
  ship_zip text not null,
  payment_rail text not null,
  payment_ref text not null default '',
  tracking text not null default '',
  reship_note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists orders_user_id_idx on orders (user_id);

create table if not exists order_items (
  id serial primary key,
  order_id integer not null references orders (id) on delete cascade,
  product_id integer,
  name text not null,
  size_label text not null default '',
  qty integer not null,
  price_cents integer not null
);

create table if not exists mail_log (
  id serial primary key,
  kind text not null,
  to_email text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now()
);

insert into products (name, size_label, category, price_cents, stock, coa_url, sort_order) values
  ('BPC-157', '5 mg', 'peptide', 5500, 12, '', 1),
  ('TB-500', '5 mg', 'peptide', 5800, 8, '', 2),
  ('GHK-Cu', '50 mg', 'peptide', 4800, 10, '', 3),
  ('KPV', '10 mg', 'peptide', 4200, 6, '', 4),
  ('Bacteriostatic Water', '10 ml', 'bac_water', 1800, 24, '', 10),
  ('Bacteriostatic Water', '30 ml', 'bac_water', 3200, 16, '', 11);

