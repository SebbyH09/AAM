-- Asset Manager Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Assets (instruments/equipment)
create table assets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  asset_tag text unique,
  category text not null,
  manufacturer text,
  model text,
  serial_number text,
  location text,
  status text not null default 'active' check (status in ('active', 'inactive', 'decommissioned', 'repair')),
  purchase_date date,
  purchase_cost numeric(12,2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Service contracts
create table service_contracts (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid references assets(id) on delete cascade,
  contract_number text,
  vendor_name text not null,
  vendor_contact text,
  vendor_email text,
  vendor_phone text,
  contract_type text not null check (contract_type in ('full_service', 'preventive_only', 'time_and_material', 'warranty')),
  start_date date not null,
  end_date date not null,
  cost numeric(12,2),
  coverage_details text,
  file_path text,
  file_name text,
  file_url text,
  status text not null default 'active' check (status in ('active', 'expired', 'pending')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Maintenance plans
create table maintenance_plans (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid references assets(id) on delete cascade,
  name text not null,
  description text,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'custom')),
  frequency_days integer,
  last_performed_date date,
  next_due_date date not null,
  assigned_to text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  estimated_duration_hours numeric(5,2),
  checklist jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Maintenance records (actual performed maintenance)
create table maintenance_records (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid references assets(id) on delete cascade,
  maintenance_plan_id uuid references maintenance_plans(id) on delete set null,
  performed_by text not null,
  performed_date date not null,
  duration_hours numeric(5,2),
  type text not null check (type in ('preventive', 'corrective', 'inspection', 'calibration', 'other')),
  description text not null,
  findings text,
  parts_replaced text,
  cost numeric(12,2),
  status text not null default 'completed' check (status in ('completed', 'incomplete', 'requires_followup')),
  next_maintenance_date date,
  notes text,
  created_at timestamptz default now()
);

-- Repairs
create table repairs (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid references assets(id) on delete cascade,
  repair_number text,
  reported_by text not null,
  reported_date date not null,
  description text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_parts', 'completed', 'cancelled')),
  assigned_to text,
  vendor text,
  started_date date,
  completed_date date,
  root_cause text,
  resolution text,
  parts_cost numeric(12,2),
  labor_cost numeric(12,2),
  total_cost numeric(12,2),
  warranty_repair boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Downtime events
create table downtime_events (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid references assets(id) on delete cascade,
  repair_id uuid references repairs(id) on delete set null,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_hours numeric(8,2),
  reason text not null check (reason in ('breakdown', 'scheduled_maintenance', 'repair', 'waiting_parts', 'operator_error', 'other')),
  description text,
  impact text,
  cost_impact numeric(12,2),
  created_at timestamptz default now()
);

-- Notification rules
create table notification_rules (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('contract_expiry', 'maintenance_due', 'repair_overdue', 'inspection_due')),
  days_before integer not null default 30,
  email_to text[] not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Notification log
create table notification_log (
  id uuid primary key default uuid_generate_v4(),
  rule_id uuid references notification_rules(id) on delete set null,
  type text not null,
  subject text not null,
  recipient text not null,
  related_id uuid,
  related_type text,
  sent_at timestamptz default now(),
  status text not null default 'sent' check (status in ('sent', 'failed'))
);

-- Alternative inventory items (substitute/replacement options for assets)
create table alternative_items (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid references assets(id) on delete cascade,
  name text not null,
  manufacturer text,
  model text,
  part_number text,
  supplier text,
  estimated_cost numeric(12,2),
  notes text,
  created_at timestamptz default now()
);

-- Indexes
create index idx_service_contracts_asset_id on service_contracts(asset_id);
create index idx_service_contracts_end_date on service_contracts(end_date);
create index idx_maintenance_plans_asset_id on maintenance_plans(asset_id);
create index idx_maintenance_plans_next_due on maintenance_plans(next_due_date);
create index idx_maintenance_records_asset_id on maintenance_records(asset_id);
create index idx_repairs_asset_id on repairs(asset_id);
create index idx_repairs_status on repairs(status);
create index idx_downtime_asset_id on downtime_events(asset_id);
create index idx_alternative_items_asset_id on alternative_items(asset_id);

-- Updated at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger assets_updated_at before update on assets
  for each row execute function update_updated_at();
create trigger service_contracts_updated_at before update on service_contracts
  for each row execute function update_updated_at();
create trigger maintenance_plans_updated_at before update on maintenance_plans
  for each row execute function update_updated_at();
create trigger repairs_updated_at before update on repairs
  for each row execute function update_updated_at();

-- Storage bucket for contracts
insert into storage.buckets (id, name, public) values ('contracts', 'contracts', false);

-- RLS Policies (adjust based on your auth setup)
alter table assets enable row level security;
alter table service_contracts enable row level security;
alter table maintenance_plans enable row level security;
alter table maintenance_records enable row level security;
alter table repairs enable row level security;
alter table downtime_events enable row level security;
alter table notification_rules enable row level security;
alter table notification_log enable row level security;
alter table alternative_items enable row level security;

-- Allow all authenticated users (adjust as needed)
create policy "Allow all for authenticated" on assets for all using (true);
create policy "Allow all for authenticated" on service_contracts for all using (true);
create policy "Allow all for authenticated" on maintenance_plans for all using (true);
create policy "Allow all for authenticated" on maintenance_records for all using (true);
create policy "Allow all for authenticated" on repairs for all using (true);
create policy "Allow all for authenticated" on downtime_events for all using (true);
create policy "Allow all for authenticated" on notification_rules for all using (true);
create policy "Allow all for authenticated" on notification_log for all using (true);
create policy "Allow all for authenticated" on alternative_items for all using (true);

-- Storage policy
create policy "Allow authenticated users to upload contracts"
on storage.objects for insert with check (bucket_id = 'contracts');
create policy "Allow authenticated users to read contracts"
on storage.objects for select using (bucket_id = 'contracts');
create policy "Allow authenticated users to delete contracts"
on storage.objects for delete using (bucket_id = 'contracts');

-- Default notification rules
insert into notification_rules (name, type, days_before, email_to) values
  ('Contract Expiry 30 Days', 'contract_expiry', 30, array['admin@yourdomain.com']),
  ('Contract Expiry 7 Days', 'contract_expiry', 7, array['admin@yourdomain.com']),
  ('Maintenance Due 7 Days', 'maintenance_due', 7, array['admin@yourdomain.com']),
  ('Maintenance Due Today', 'maintenance_due', 0, array['admin@yourdomain.com']);
