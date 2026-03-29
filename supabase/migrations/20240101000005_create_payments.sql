-- Payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  amount numeric not null,
  currency text not null default 'usd',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  stripe_payment_id text,
  description text,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "Admins can do everything on payments"
  on public.payments for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Founders can read payments on own projects"
  on public.payments for select
  using (
    exists (select 1 from public.projects where id = project_id and founder_id = auth.uid())
  );
