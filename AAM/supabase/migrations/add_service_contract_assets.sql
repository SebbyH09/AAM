-- Junction table for many-to-many relationship between service contracts and assets
create table if not exists service_contract_assets (
  id uuid primary key default uuid_generate_v4(),
  service_contract_id uuid references service_contracts(id) on delete cascade not null,
  asset_id uuid references assets(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(service_contract_id, asset_id)
);

create index idx_service_contract_assets_contract on service_contract_assets(service_contract_id);
create index idx_service_contract_assets_asset on service_contract_assets(asset_id);

-- Migrate existing asset_id data from service_contracts to the junction table
insert into service_contract_assets (service_contract_id, asset_id)
select id, asset_id from service_contracts where asset_id is not null
on conflict do nothing;
