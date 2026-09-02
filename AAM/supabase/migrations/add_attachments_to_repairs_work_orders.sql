-- Let service reports / documents be attached to repairs, work orders, and
-- individual maintenance history records, so older service, repair, and
-- work-done-on-instruments paperwork can simply be dropped in against the
-- record it belongs to.
alter table service_reports
  add column if not exists repair_id uuid references repairs(id) on delete set null,
  add column if not exists work_order_id uuid references work_orders(id) on delete set null,
  add column if not exists maintenance_record_id uuid references maintenance_records(id) on delete set null;

create index if not exists idx_service_reports_repair on service_reports(repair_id);
create index if not exists idx_service_reports_work_order on service_reports(work_order_id);
create index if not exists idx_service_reports_maintenance_record on service_reports(maintenance_record_id);
