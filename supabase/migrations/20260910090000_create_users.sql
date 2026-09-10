create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  -- SHA-256('geofence-studio:v1:' + 明文密码) 的十六进制，前端 Web Crypto 计算
  password_hash text not null,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "anon full access"
  on public.users
  for all
  to anon
  using (true)
  with check (true);

-- 默认管理员：admin / admin123（登录后请立即修改密码）
insert into public.users (username, password_hash, display_name)
values (
  'admin',
  '9a3e60d678b07ffb867040c6b98a579d6ecc1860ea651c38ccb44cbaf1480c4a',
  '管理员'
)
on conflict (username) do nothing;
