-- Storage buckets for documents and voice recordings
insert into storage.buckets (id, name, public)
values
  ('documents', 'documents', false),
  ('voice-recordings', 'voice-recordings', true)
on conflict (id) do nothing;

-- Documents: admins can manage, founders can read own project files
create policy "Admins can manage documents"
  on storage.objects for all
  using (bucket_id = 'documents' and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Voice recordings: public read, authenticated insert
create policy "Public can read voice recordings"
  on storage.objects for select
  using (bucket_id = 'voice-recordings');

create policy "Anyone can upload voice recordings"
  on storage.objects for insert
  with check (bucket_id = 'voice-recordings');
