alter table orders
  add column if not exists deleted_at timestamptz;
