alter table store_settings
  add column if not exists btc_enabled boolean not null default false;
