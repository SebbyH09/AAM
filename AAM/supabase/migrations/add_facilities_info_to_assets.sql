-- Add facilities information columns to assets table
-- These are all optional text fields for maximum flexibility

alter table assets add column if not exists power_requirements text;
alter table assets add column if not exists dimensions text;
alter table assets add column if not exists weight text;
alter table assets add column if not exists internet_requirements text;
alter table assets add column if not exists water_requirements text;
alter table assets add column if not exists air_gas_requirements text;
alter table assets add column if not exists ventilation_requirements text;
alter table assets add column if not exists environmental_requirements text;
alter table assets add column if not exists facilities_notes text;
