-- 迁移到 Supabase Auth + RLS：
-- 1. profiles 表承载用户名/显示名/角色（auth.users 的扩展资料）
-- 2. 现有 admin 账号移植进 auth.users（bcrypt，密码不变：admin123）
-- 3. fences 从「anon 全开放」收紧为「登录可读，admin/editor 可写」
-- 4. 旧的 public.users 自建表废弃删除

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null default '',
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 所有登录用户可读 profiles（账号列表展示）；写入只走 Edge Function（service role 绕过 RLS）
create policy "authenticated read profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

-- 当前调用者角色，供各表 RLS 复用（security definer 避免 profiles 策略递归）
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---- admin 账号移植 ----
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  admin_id uuid;
begin
  select id into admin_id from auth.users where email = 'admin@geofence.local';

  if admin_id is null then
    admin_id := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', admin_id, 'authenticated', 'authenticated',
      'admin@geofence.local', extensions.crypt('admin123', extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), admin_id, admin_id::text,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@geofence.local'),
      'email', now(), now(), now()
    );
  end if;

  insert into public.profiles (id, username, display_name, role)
  values (admin_id, 'admin', '管理员', 'admin')
  on conflict (id) do update set role = 'admin';
end $$;

-- ---- fences 收紧 ----
drop policy if exists "anon full access" on public.fences;

create policy "authenticated read fences"
  on public.fences
  for select
  to authenticated
  using (true);

create policy "editors insert fences"
  on public.fences
  for insert
  to authenticated
  with check (public.current_user_role() in ('admin', 'editor'));

create policy "editors update fences"
  on public.fences
  for update
  to authenticated
  using (public.current_user_role() in ('admin', 'editor'))
  with check (public.current_user_role() in ('admin', 'editor'));

create policy "editors delete fences"
  on public.fences
  for delete
  to authenticated
  using (public.current_user_role() in ('admin', 'editor'));

-- ---- 旧自建 users 表下线 ----
drop table if exists public.users;
