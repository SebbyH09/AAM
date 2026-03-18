-- Add estimated_cost and parts fields to maintenance_plans
alter table maintenance_plans add column if not exists estimated_cost numeric(12,2);
alter table maintenance_plans add column if not exists parts jsonb;
