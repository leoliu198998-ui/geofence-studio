import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { hasSupabaseConfig, supabase } from '@/config/supabase'
import { isRole } from '@/lib/permissions'

/** 用户名 → Supabase Auth 内部伪邮箱（Auth 原生邮箱制，用户名体系映射到 @geofence.local 域） */
export const emailOf = (username) => `${username}@geofence.local`
const LEGACY_SESSION_KEY = 'geofence-studio:session' // 自建 users 表时代的会话，迁移后清理

const fromProfile = (p) => ({
  id: p.id,
  username: p.username,
  displayName: p.display_name || p.username,
  role: isRole(p.role) ? p.role : 'viewer', // 未知角色按最小权限处理
  createdAt: p.created_at,
})

async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return data ? fromProfile(data) : null
}

/** 调用 account-admin Edge Function，统一把错误映射成中文提示 */
async function invokeAdmin(action, payload) {
  const { data, error } = await supabase.functions.invoke('account-admin', {
    body: { action, payload },
  })
  if (error) {
    try {
      const body = await error.context.json()
      return body?.error || '操作失败，请稍后重试'
    } catch {
      return '操作失败，请稍后重试'
    }
  }
  return data?.error ?? null
}

/**
 * 登录态：Supabase Auth（JWT 会话由 SDK 持久化/续期）+ profiles 表提供用户名与角色。
 * 未配置 Supabase 时 enabled=false，应用保持纯本地模式、无登录门槛。
 * 角色门控是 UI 约束 + RLS 服务端强制的双层：RLS 见 20260910140000 迁移。
 */
export function useAuth() {
  const enabled = hasSupabaseConfig
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(enabled)

  useEffect(() => {
    if (!enabled) return undefined
    try {
      localStorage.removeItem(LEGACY_SESSION_KEY)
    } catch {
      // 忽略
    }
    let cancelled = false

    const applySession = async (session) => {
      if (!session?.user) {
        if (!cancelled) {
          setUser(null)
          setChecking(false)
        }
        return
      }
      // Realtime 的 RLS 需要显式注入当前 JWT，否则收不到 postgres_changes
      supabase.realtime.setAuth?.(session.access_token)
      const profile = await fetchProfile(session.user.id)
      if (cancelled) return
      if (!profile) {
        // auth 用户存在但没有资料（账号被删除等情况）：强制登出
        await supabase.auth.signOut()
        if (!cancelled) {
          setUser(null)
          setChecking(false)
        }
        return
      }
      setUser(profile)
      setChecking(false)
    }

    // onAuthStateChange 回调内不能直接 await supabase 调用（SDK 会死锁），异步派发
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setChecking(false)
        return
      }
      setTimeout(() => applySession(session), 0)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [enabled])

  /** @returns {Promise<string|null>} 失败原因；成功返回 null */
  const login = useCallback(async (username, password) => {
    if (!supabase) return '未配置 Supabase，无法登录'
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailOf(username),
      password,
    })
    if (error) {
      return error.code === 'invalid_credentials' ? '账号或密码不正确' : `登录失败：${error.message}`
    }
    const profile = data.user ? await fetchProfile(data.user.id) : null
    toast.success(`欢迎回来，${profile?.displayName ?? username}`)
    return null
  }, [])

  const logout = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  /** 修改当前账号密码，@returns {Promise<string|null>} */
  const changePassword = useCallback(
    async (oldPassword, newPassword) => {
      if (!user || !supabase) return '未登录'
      if (newPassword.length < 6) return '新密码至少 6 位'
      // Auth 不提供「校验旧密码」，用旧密码重新登录一次来验证
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: emailOf(user.username),
        password: oldPassword,
      })
      if (verifyErr) return '当前密码不正确'
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      return error ? '修改失败，请稍后重试' : null
    },
    [user],
  )

  return { enabled, user, checking, login, logout, changePassword }
}

// ---- 账号维护（RLS 只读 profiles；增删走 account-admin Edge Function，服务端校验 admin）----

export async function fetchUsers() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })
  return error ? [] : data.map(fromProfile)
}

/** @returns {Promise<string|null>} */
export function createUser({ username, displayName, password, role }) {
  if (!supabase) return Promise.resolve('未配置 Supabase')
  return invokeAdmin('create', { username, displayName, password, role })
}

/** @returns {Promise<string|null>} */
export function deleteUser(username) {
  if (!supabase) return Promise.resolve('未配置 Supabase')
  return invokeAdmin('delete', { username })
}

/** 修改账号角色（admin 限定，服务端校验），@returns {Promise<string|null>} */
export function updateUserRole(username, role) {
  if (!supabase) return Promise.resolve('未配置 Supabase')
  return invokeAdmin('updateRole', { username, role })
}

/** 管理员为用户重置密码（手动指定新密码），@returns {Promise<string|null>} */
export function resetUserPassword(username, password) {
  if (!supabase) return Promise.resolve('未配置 Supabase')
  if ((password ?? '').length < 6) return Promise.resolve('新密码至少 6 位')
  return invokeAdmin('resetPassword', { username, password })
}
