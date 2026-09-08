-- Bitcoin product-order checkout (NexaPay backup). Server-only zpub; never expose to clients.

alter table store_settings
  add column if not exists btc_zpub text not null default '',
  add column if not exists btc_next_index integer not null default 0,
  add column if not exists btc_min_cents integer not null default 2500,
  add column if not exists btc_testnet boolean not null default false;

alter table profiles
  add column if not exists btc_address text not null default '',
  add column if not exists btc_derivation_index integer;

alter table orders
  add column if not exists usd_total_cents integer,
  add column if not exists btc_amount text,
  add column if not exists btc_rate text,
  add column if not exists btc_rate_source text,
  add column if not exists quote_expires_at timestamptz,
  add column if not exists btc_address text,
  add column if not exists btc_derivation_index integer,
  add column if not exists btc_txid text not null default '',
  add column if not exists btc_received text not null default '0',
  add column if not exists btc_status text,
  add column if not exists btc_overpay_note text not null default '',
  add column if not exists payment_token text;

create unique index if not exists orders_payment_token_uidx
  on orders (payment_token)
  where payment_token is not null;

create table if not exists btc_unmatched_payments (
  id serial primary key,
  address text not null,
  txid text not null,
  amount text not null,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  noted boolean not null default false,
  unique (txid, address)
);

create index if not exists orders_btc_open_idx
  on orders (payment_rail, btc_status, status)
  where payment_rail = 'btc' and deleted_at is null;
