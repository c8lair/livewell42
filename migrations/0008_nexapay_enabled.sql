alter table store_settings
  add column if not exists nexapay_enabled boolean not null default true;
