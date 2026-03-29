-- Voice forms (shareable interview forms)
create table if not exists public.voice_forms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  respondent_type text not null check (respondent_type in ('Founder', 'Employee', 'Customer')),
  share_token text not null default encode(gen_random_bytes(16), 'hex'),
  is_open boolean default true,
  created_at timestamptz default now()
);

create unique index voice_forms_share_token_idx on public.voice_forms (share_token);

alter table public.voice_forms enable row level security;

create policy "Admins can do everything on voice_forms"
  on public.voice_forms for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Public read for open forms (via share token)
create policy "Anyone can read open voice forms"
  on public.voice_forms for select
  using (is_open = true);
