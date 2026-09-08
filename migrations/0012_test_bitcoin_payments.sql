alter table store_settings
  add column if not exists test_bitcoin_payments boolean not null default false;
