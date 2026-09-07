alter table store_settings
  add column if not exists nexapay_webhook_secret text not null default '';
