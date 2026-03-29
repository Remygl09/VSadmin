-- Comments (threaded, per project)
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "Admins can do everything on comments"
  on public.comments for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Founders can read comments on own projects"
  on public.comments for select
  using (
    exists (select 1 from public.projects where id = project_id and founder_id = auth.uid())
  );

create policy "Founders can insert comments on own projects"
  on public.comments for insert
  with check (
    user_id = auth.uid() and
    exists (select 1 from public.projects where id = project_id and founder_id = auth.uid())
  );
