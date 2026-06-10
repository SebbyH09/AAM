-- Vendor Directory
create table if not exists vendors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text,
  contact_name text,
  email text,
  phone text,
  website text,
  address text,
  specialty text[],
  rating integer check (rating between 1 and 5),
  notes text,
  is_preferred boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_vendors_name on vendors(name);

-- Parts Catalog / Inventory
create table if not exists parts (
  id uuid primary key default uuid_generate_v4(),
  part_number text,
  name text not null,
  description text,
  category text,
  unit_of_measure text default 'each',
  quantity_on_hand numeric(10,2) default 0,
  reorder_point numeric(10,2),
  reorder_quantity numeric(10,2),
  unit_cost numeric(12,2),
  location text,
  vendor_id uuid references vendors(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_parts_part_number on parts(part_number);
create index if not exists idx_parts_name on parts(name);

-- Parts Transactions (stock movement)
create table if not exists parts_transactions (
  id uuid primary key default uuid_generate_v4(),
  part_id uuid references parts(id) on delete cascade not null,
  type text not null check (type in ('received', 'consumed', 'adjusted', 'returned')),
  quantity numeric(10,2) not null,
  unit_cost numeric(12,2),
  reference_type text,
  reference_id uuid,
  notes text,
  performed_by text,
  transaction_date date not null default current_date,
  created_at timestamptz default now()
);
create index if not exists idx_parts_transactions_part_id on parts_transactions(part_id);

-- Asset Documents
create table if not exists asset_documents (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid references assets(id) on delete cascade not null,
  name text not null,
  document_type text check (document_type in ('manual', 'sop', 'drawing', 'certificate', 'safety', 'other')),
  file_path text,
  file_name text,
  file_url text,
  version text,
  notes text,
  uploaded_by text,
  created_at timestamptz default now()
);
create index if not exists idx_asset_documents_asset_id on asset_documents(asset_id);

-- Budgets
create table if not exists budgets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  asset_id uuid references assets(id) on delete set null,
  department text,
  fiscal_year integer not null,
  budget_type text not null check (budget_type in ('maintenance', 'parts', 'contracts', 'capital', 'total')),
  planned_amount numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_budgets_fiscal_year on budgets(fiscal_year);

-- Calibration Records
create table if not exists calibration_records (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid references assets(id) on delete cascade not null,
  calibration_date date not null,
  next_due_date date not null,
  performed_by text not null,
  calibration_standard text,
  result text not null check (result in ('pass', 'fail', 'out_of_tolerance', 'adjusted')),
  as_found_reading text,
  as_left_reading text,
  tolerance text,
  certificate_number text,
  file_path text,
  file_name text,
  file_url text,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_calibration_asset_id on calibration_records(asset_id);
create index if not exists idx_calibration_next_due on calibration_records(next_due_date);

-- Work Order Labor Entries
create table if not exists work_order_labor (
  id uuid primary key default uuid_generate_v4(),
  repair_id uuid references repairs(id) on delete cascade not null,
  technician text not null,
  work_date date not null default current_date,
  hours numeric(5,2) not null,
  description text,
  created_at timestamptz default now()
);
create index if not exists idx_work_order_labor_repair_id on work_order_labor(repair_id);

-- RLS for new tables
alter table vendors enable row level security;
alter table parts enable row level security;
alter table parts_transactions enable row level security;
alter table asset_documents enable row level security;
alter table budgets enable row level security;
alter table calibration_records enable row level security;
alter table work_order_labor enable row level security;

create policy "Allow all for authenticated" on vendors for all using (true);
create policy "Allow all for authenticated" on parts for all using (true);
create policy "Allow all for authenticated" on parts_transactions for all using (true);
create policy "Allow all for authenticated" on asset_documents for all using (true);
create policy "Allow all for authenticated" on budgets for all using (true);
create policy "Allow all for authenticated" on calibration_records for all using (true);
create policy "Allow all for authenticated" on work_order_labor for all using (true);

-- Storage bucket for asset documents
insert into storage.buckets (id, name, public) values ('asset-documents', 'asset-documents', false) on conflict do nothing;
create policy "Allow authenticated users to upload asset documents" on storage.objects for insert with check (bucket_id = 'asset-documents');
create policy "Allow authenticated users to read asset documents" on storage.objects for select using (bucket_id = 'asset-documents');
create policy "Allow authenticated users to delete asset documents" on storage.objects for delete using (bucket_id = 'asset-documents');

-- Updated at triggers for new tables
create trigger vendors_updated_at before update on vendors for each row execute function update_updated_at();
create trigger parts_updated_at before update on parts for each row execute function update_updated_at();
create trigger budgets_updated_at before update on budgets for each row execute function update_updated_at();
