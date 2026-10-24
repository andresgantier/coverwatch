-- Phase 6: signed contract PDFs in Supabase Storage.
-- Private bucket; files are stored as <contract id>/contract.pdf.
-- Managers upload and replace; staff who can read contracts can download
-- (through short-lived signed links created by the app).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('contract-pdfs', 'contract-pdfs', false, 4194304, array['application/pdf'])
on conflict (id) do nothing;

create policy contract_pdfs_select on storage.objects
  for select to authenticated
  using (bucket_id = 'contract-pdfs' and (select private.has_role('manager', 'coordinator', 'viewer')));

create policy contract_pdfs_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'contract-pdfs' and (select private.has_role('manager')));

create policy contract_pdfs_update on storage.objects
  for update to authenticated
  using (bucket_id = 'contract-pdfs' and (select private.has_role('manager')))
  with check (bucket_id = 'contract-pdfs' and (select private.has_role('manager')));

create policy contract_pdfs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'contract-pdfs' and (select private.has_role('manager')));
