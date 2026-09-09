create table if not exists public.fences (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('sale', 'rent')),
  name text not null,
  code text not null,
  path jsonb not null,
  area double precision,
  vertex_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fences_mode_idx on public.fences (mode);

alter table public.fences enable row level security;

create policy "anon full access"
  on public.fences
  for all
  to anon
  using (true)
  with check (true);

alter publication supabase_realtime add table public.fences;
