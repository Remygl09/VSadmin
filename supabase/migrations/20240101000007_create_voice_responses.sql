-- Voice responses (from both project voice and voice forms)
create table if not exists public.voice_responses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  form_id uuid references public.voice_forms(id) on delete cascade,
  question text,
  respondent_name text,
  respondent_email text,
  audio_url text,
  transcript text,
  transcript_edited boolean default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.voice_responses enable row level security;

create policy "Admins can do everything on voice_responses"
  on public.voice_responses for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Founders can read voice responses on own projects"
  on public.voice_responses for select
  using (
    exists (select 1 from public.projects where id = project_id and founder_id = auth.uid())
  );

-- Allow anonymous inserts for public voice forms
create policy "Anyone can insert voice responses for open forms"
  on public.voice_responses for insert
  with check (
    form_id is not null and
    exists (select 1 from public.voice_forms where id = form_id and is_open = true)
  );

-- Allow anonymous inserts via project voice_form_token
create policy "Anyone can insert voice responses via project token"
  on public.voice_responses for insert
  with check (
    project_id is not null and
    exists (select 1 from public.projects where id = project_id and voice_form_token is not null)
  );
