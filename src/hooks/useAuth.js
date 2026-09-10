import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { hasSupabaseConfig, supabase } from '@/config/supabase'

const SESSION_KEY = 'geofence-studio:session'
const SALT = 'geofence-studio:v1:'
const USERNAME_RE = /^[a-zA-Z0-9_.-]{2,32}$/

/** SHA-256(盐 + 明文) 十六进制；盐值与 users 表迁移脚本中的约定保持一致 */
export async function hashPassword(password) {
  const data = new TextEncoder().encode(SALT + password)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

const fromRow = (r) => ({
  id: r.id,
  username: r.username,
  displayName: r.display_name || r.username,
  createdAt: r.created_at,
})

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    const s = raw ? JSON.parse(raw) : null
    return s && typeof s.username === 'string' ? s : null
  } catch {
    return null
  }
}

function saveSession(s) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // 忽略
  }
}

/**
 * 登录态：Supabase users 表校验 + localStorage 会话。
 * 未配置 Supabase 时 enabled=false，应用保持纯本地模式、无登录门槛。
 * 挂载时复核会话：账号被删除后立即失效；网络失败则保留会话（离线容忍）。
 */
export function useAuth() {
  const enabled = hasSupabaseConfig
  const [user, setUser] = useState(() => (enabled ? loadSession() : null))
  const [checking, setChecking] = useState(() => enabled && Boolean(loadSession()))

  useEffect(() => {
    if (!enabled) return undefined
    const session = loadSession()
    if (!session) return undefined
    let cancelled = false
    supabase
      .from('users')
      .select('username, display_name')
      .eq('username', session.username)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // 网络/服务异常：不清除会话，按本地缓存继续
          setChecking(false)
          return
        }
        if (!data) {
          saveSession(null)
          setUser(null)
        } else {
          const fresh = { ...session, displayName: data.display_name || data.username }
          saveSession(fresh)
          setUser(fresh)
        }
        setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  /** @returns {Promise<string|null>} 失败原因；成功返回 null */
  const login = useCallback(async (username, password) => {
    if (!supabase) return '未配置 Supabase，无法登录'
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle()
    if (error) return '账号服务不可用，请确认已执行 users 表迁移'
    if (!data) return '账号或密码不正确'
    const hash = await hashPassword(password)
    if (hash !== data.password_hash) return '账号或密码不正确'
    const session = {
      username: data.username,
      displayName: data.display_name || data.username,
      signedInAt: new Date().toISOString(),
    }
    saveSession(session)
    setUser(session)
    toast.success(`欢迎回来，${session.displayName}`)
    return null
  }, [])

  const logout = useCallback(() => {
    saveSession(null)
    setUser(null)
  }, [])

  /** 修改当前账号密码，@returns {Promise<string|null>} */
  const changePassword = useCallback(
    async (oldPassword, newPassword) => {
      if (!user || !supabase) return '未登录'
      if (newPassword.length < 6) return '新密码至少 6 位'
      const oldHash = await hashPassword(oldPassword)
      const { data } = await supabase
        .from('users')
        .select('password_hash')
        .eq('username', user.username)
        .maybeSingle()
      if (!data || data.password_hash !== oldHash) return '当前密码不正确'
      const password_hash = await hashPassword(newPassword)
      const { error } = await supabase
        .from('users')
        .update({ password_hash, updated_at: new Date().toISOString() })
        .eq('username', user.username)
      return error ? '修改失败，请稍后重试' : null
    },
    [user],
  )

  return { enabled, user, checking, login, logout, changePassword }
}

// ---- 账号维护（任意已登录用户可用，暂无权限隔离）----

export async function fetchUsers() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, created_at')
    .order('created_at', { ascending: true })
  return error ? [] : data.map(fromRow)
}

/** @returns {Promise<string|null>} */
export async function createUser({ username, displayName, password }) {
  if (!supabase) return '未配置 Supabase'
  if (!USERNAME_RE.test(username)) return '用户名需为 2-32 位字母、数字或 _ . -'
  if (password.length < 6) return '初始密码至少 6 位'
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (existing) return '用户名已存在'
  const password_hash = await hashPassword(password)
  const { error } = await supabase.from('users').insert({
    username,
    password_hash,
    display_name: (displayName || '').trim() || username,
  })
  return error ? '创建失败，请稍后重试' : null
}

/** @returns {Promise<string|null>} */
export async function deleteUser(username, currentUsername) {
  if (!supabase) return '未配置 Supabase'
  if (username === currentUsername) return '不能删除当前登录的账号'
  const { count } = await supabase.from('users').select('id', { count: 'exact', head: true })
  if ((count ?? 0) <= 1) return '至少需要保留一个账号'
  const { error } = await supabase.from('users').delete().eq('username', username)
  return error ? '删除失败，请稍后重试' : null
}
