-- Allow service reports to be added by simply dropping a document, without
-- forcing the user to re-enter technician/summary metadata every time.
-- The report document itself is the record; metadata is now optional.
alter table service_reports alter column technician drop not null;
alter table service_reports alter column summary drop not null;
