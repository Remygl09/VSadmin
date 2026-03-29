-- Meeting notes per project
create table if not exists public.meeting_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  content text not null,
  meeting_date date not null,
  created_at timestamptz not null default now()
);

alter table public.meeting_notes enable row level security;

create policy "Admins can do everything on meeting_notes"
  on public.meeting_notes for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
