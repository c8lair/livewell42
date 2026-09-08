alter table orders
  add column if not exists mail_error text;
