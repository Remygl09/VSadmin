-- AI-generated project outlines
create table if not exists public.outlines (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  content text not null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.outlines enable row level security;

create policy "Admins can do everything on outlines"
  on public.outlines for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Founders can read outlines for own projects"
  on public.outlines for select
  using (
    exists (select 1 from public.projects where id = project_id and founder_id = auth.uid())
  );
