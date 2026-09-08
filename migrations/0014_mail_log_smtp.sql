alter table mail_log add column if not exists sent_at timestamptz;
alter table mail_log add column if not exists error text;
alter table mail_log add column if not exists attempts integer not null default 0;
