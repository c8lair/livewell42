alter table store_settings
  add column if not exists banner_enabled boolean not null default false;

alter table store_settings
  add column if not exists banner_text text not null default '';
