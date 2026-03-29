-- Projects table (main entity for pipeline)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  founder_name text not null,
  name text not null default '',
  status text not null default 'lead' check (status in ('lead', 'negotiation', 'onboarding', 'active', 'paused', 'completed')),
  contract_end date,
  tags jsonb default '[]'::jsonb,
  total_amount numeric,
  is_archived boolean not null default false,
  founder_id uuid references public.profiles(id),
  current_phase int not null default 1,
  industry text,
  notes text,
  stripe_customer_id text,
  stripe_account_id text,
  mrr_amount numeric,
  voice_form_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Admins can do everything on projects"
  on public.projects for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Founders can read own projects"
  on public.projects for select
  using (founder_id = auth.uid());

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();
