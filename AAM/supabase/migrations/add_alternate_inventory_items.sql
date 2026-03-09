-- Migration: Add alternate/substitute items for inventory
-- Run this in your Supabase SQL editor

-- Inventory Manager tables (if not already created)
create table if not exists inventory_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text,
  category text not null check (category in (
    'Reagents', 'Filters', 'PPE', 'Cleaning Supplies',
    'Office Supplies', 'Lab Consumables', 'Electrical', 'Mechanical Parts', 'Other'
  )),
  description text,
  unit text not null,
  quantity_on_hand integer not null default 0,
  reorder_point integer not null default 0,
  reorder_quantity integer not null default 0,
  unit_cost numeric(12,2),
  location text,
  vendor text,
  last_counted_date date,
  next_count_date date,
  is_active boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists inventory_orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text,
  vendor text not null,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'approved', 'ordered', 'shipped', 'received', 'cancelled'
  )),
  order_date date not null,
  expected_date date,
  received_date date,
  total_cost numeric(12,2),
  notes text,
  ordered_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists inventory_order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid references inventory_orders(id) on delete cascade,
  item_id uuid references inventory_items(id) on delete cascade,
  quantity integer not null,
  unit_cost numeric(12,2),
  total_cost numeric(12,2),
  received_quantity integer,
  created_at timestamptz default now()
);

create table if not exists cycle_counts (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid references inventory_items(id) on delete cascade,
  counted_by text not null,
  count_date date not null,
  expected_quantity integer not null,
  actual_quantity integer not null,
  variance integer not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'reviewed')),
  created_at timestamptz default now()
);

-- Alternate / substitute items junction table
create table if not exists alternate_inventory_items (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references inventory_items(id) on delete cascade,
  alternate_item_id uuid not null references inventory_items(id) on delete cascade,
  notes text,
  created_at timestamptz default now(),
  -- Prevent duplicate pairs
  unique(item_id, alternate_item_id),
  -- Prevent an item from being its own alternate
  check (item_id <> alternate_item_id)
);

-- Indexes
create index if not exists idx_alternate_inventory_items_item_id on alternate_inventory_items(item_id);
create index if not exists idx_alternate_inventory_items_alternate_id on alternate_inventory_items(alternate_item_id);
create index if not exists idx_inventory_items_category on inventory_items(category);
create index if not exists idx_inventory_items_is_active on inventory_items(is_active);

-- RLS
alter table inventory_items enable row level security;
alter table inventory_orders enable row level security;
alter table inventory_order_items enable row level security;
alter table cycle_counts enable row level security;
alter table alternate_inventory_items enable row level security;

create policy if not exists "Allow all for authenticated" on inventory_items for all using (true);
create policy if not exists "Allow all for authenticated" on inventory_orders for all using (true);
create policy if not exists "Allow all for authenticated" on inventory_order_items for all using (true);
create policy if not exists "Allow all for authenticated" on cycle_counts for all using (true);
create policy if not exists "Allow all for authenticated" on alternate_inventory_items for all using (true);

-- Updated_at trigger for inventory_items
create trigger if not exists inventory_items_updated_at before update on inventory_items
  for each row execute function update_updated_at();

create trigger if not exists inventory_orders_updated_at before update on inventory_orders
  for each row execute function update_updated_at();
