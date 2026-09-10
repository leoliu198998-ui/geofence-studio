import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const USERNAME_RE = /^[a-zA-Z0-9_.-]{2,32}$/
const ROLES = ['admin', 'editor', 'viewer']
const emailOf = (username) => `${username}@geofence.local`

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: '未登录' }, 401)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  // 调用者身份与角色校验：仅 admin 可维护账号
  const callerClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user: caller },
  } = await callerClient.auth.getUser()
  if (!caller) return json({ error: '未登录或会话已过期' }, 401)

  const adminClient = createClient(url, serviceKey)
  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('username, role')
    .eq('id', caller.id)
    .single()
  if (callerProfile?.role !== 'admin') return json({ error: '只有管理员可以维护账号' }, 403)

  const { action, payload } = await req.json()

  if (action === 'create') {
    const { username, displayName, password, role } = payload ?? {}
    if (!USERNAME_RE.test(username ?? '')) return json({ error: '用户名需为 2-32 位字母、数字或 _ . -' }, 400)
    if ((password ?? '').length < 6) return json({ error: '初始密码至少 6 位' }, 400)
    if (!ROLES.includes(role)) return json({ error: '角色不合法' }, 400)

    const { data: existing } = await adminClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    if (existing) return json({ error: '用户名已存在' }, 400)

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email: emailOf(username),
      password,
      email_confirm: true,
    })
    if (createErr) return json({ error: `创建失败：${createErr.message}` }, 500)

    const { error: profileErr } = await adminClient.from('profiles').insert({
      id: created.user.id,
      username,
      display_name: (displayName ?? '').trim() || username,
      role,
    })
    if (profileErr) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      return json({ error: '写入账号资料失败，已回滚' }, 500)
    }
    return json({ ok: true })
  }

  if (action === 'updateRole') {
    const { username, role } = payload ?? {}
    if (!ROLES.includes(role)) return json({ error: '角色不合法' }, 400)
    if (username === callerProfile.username) return json({ error: '不能修改自己的角色' }, 400)

    const { data: target } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('username', username)
      .maybeSingle()
    if (!target) return json({ error: '账号不存在' }, 404)

    // 降级 admin 时保证至少保留一个管理员
    if (target.role === 'admin' && role !== 'admin') {
      const { count } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
      if ((count ?? 0) <= 1) return json({ error: '至少需要保留一个管理员' }, 400)
    }

    const { error: upErr } = await adminClient
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', target.id)
    if (upErr) return json({ error: `修改失败：${upErr.message}` }, 500)
    return json({ ok: true })
  }

  if (action === 'resetPassword') {
    const { username, password } = payload ?? {}
    if ((password ?? '').length < 6) return json({ error: '新密码至少 6 位' }, 400)

    const { data: target } = await adminClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    if (!target) return json({ error: '账号不存在' }, 404)

    const { error: pwErr } = await adminClient.auth.admin.updateUserById(target.id, { password })
    if (pwErr) return json({ error: `重置失败：${pwErr.message}` }, 500)
    return json({ ok: true })
  }

  if (action === 'delete') {
    const { username } = payload ?? {}
    if (username === callerProfile.username) return json({ error: '不能删除当前登录的账号' }, 400)

    const { data: target } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('username', username)
      .maybeSingle()
    if (!target) return json({ error: '账号不存在' }, 404)

    if (target.role === 'admin') {
      const { count } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
      if ((count ?? 0) <= 1) return json({ error: '至少需要保留一个管理员' }, 400)
    }

    // 删除 auth 用户，profiles 行随外键级联删除
    const { error: delErr } = await adminClient.auth.admin.deleteUser(target.id)
    if (delErr) return json({ error: `删除失败：${delErr.message}` }, 500)
    return json({ ok: true })
  }

  return json({ error: '未知操作' }, 400)
})
