-- Add file upload columns to service_reports
alter table service_reports
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists file_url text;

-- Storage bucket for service reports
insert into storage.buckets (id, name, public)
  values ('service-reports', 'service-reports', false)
  on conflict (id) do nothing;

-- Allow authenticated users to manage service report files
create policy "Allow authenticated users to upload service reports"
  on storage.objects for insert with check (bucket_id = 'service-reports');
create policy "Allow authenticated users to read service reports"
  on storage.objects for select using (bucket_id = 'service-reports');
create policy "Allow authenticated users to delete service reports"
  on storage.objects for delete using (bucket_id = 'service-reports');
