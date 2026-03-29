-- AI-generated reports
create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  report_type text not null,
  content text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.ai_reports enable row level security;

create policy "Admins can do everything on ai_reports"
  on public.ai_reports for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
