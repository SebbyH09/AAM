-- One-off maintenance / work orders (may or may not be attached to an asset)
create table if not exists work_orders (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid references assets(id) on delete set null,
  work_order_number text,
  title text not null,
  description text,
  category text not null default 'maintenance' check (category in ('maintenance', 'repair', 'inspection', 'installation', 'cleaning', 'calibration', 'other')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  requested_by text,
  request_date date not null default current_date,
  assigned_to text,
  vendor text,
  scheduled_date date,
  completed_date date,
  cost numeric(12,2),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_work_orders_asset_id on work_orders(asset_id);
create index if not exists idx_work_orders_status on work_orders(status);
create index if not exists idx_work_orders_request_date on work_orders(request_date);

create trigger work_orders_updated_at before update on work_orders
  for each row execute function update_updated_at();

alter table work_orders enable row level security;

create policy "Allow all for authenticated" on work_orders for all using (true);
