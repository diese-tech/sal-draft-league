create table if not exists admin_audit_log (
  id bigserial primary key,
  action text not null,
  entity_type text,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on admin_audit_log (created_at desc);
