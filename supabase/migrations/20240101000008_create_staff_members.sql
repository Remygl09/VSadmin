-- Staff members per project
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  email text,
  role text not null default 'member',
  created_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;

create policy "Admins can do everything on staff_members"
  on public.staff_members for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
