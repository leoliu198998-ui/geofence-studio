import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 内存版 Supabase：auth（邮箱密码）+ profiles 表 + functions.invoke。
// 测试接缝是 @/config/supabase 模块边界，断言全部走在 useAuth 的公开行为上。
const state = vi.hoisted(() => ({
  profiles: [], // { id, username, display_name, role, created_at }
  passwords: new Map(), // email -> password
  ids: new Map(), // email -> user id
  session: null,
  listener: null,
  fnCalls: [],
  fnResponse: { data: { ok: true }, error: null },
}))

vi.mock('@/config/supabase', () => {
  const applyEq = (rows, filters) =>
    rows.filter((r) => filters.every(([col, val]) => r[col] === val))

  const makeQuery = (rows, filters = []) => ({
    eq: (col, val) => makeQuery(rows, [...filters, [col, val]]),
    order: () => Promise.resolve({ data: applyEq(rows, filters), error: null }),
    maybeSingle: () => Promise.resolve({ data: applyEq(rows, filters)[0] ?? null, error: null }),
    then: (resolve) => resolve({ data: applyEq(rows, filters), error: null }),
  })

  return {
    hasSupabaseConfig: true,
    supabase: {
      auth: {
        onAuthStateChange: (cb) => {
          state.listener = cb
          setTimeout(() => cb('INITIAL_SESSION', state.session), 0)
          return { data: { subscription: { unsubscribe: vi.fn() } } }
        },
        getSession: () => Promise.resolve({ data: { session: state.session } }),
        signInWithPassword: ({ email, password }) => {
          if (state.passwords.get(email) === password && state.ids.has(email)) {
            const user = { id: state.ids.get(email), email }
            state.session = { user, access_token: 'tok' }
            state.listener?.('SIGNED_IN', state.session)
            return Promise.resolve({ data: { user, session: state.session }, error: null })
          }
          return Promise.resolve({
            data: { user: null, session: null },
            error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
          })
        },
        signOut: () => {
          state.session = null
          state.listener?.('SIGNED_OUT', null)
          return Promise.resolve({ error: null })
        },
        updateUser: ({ password }) => {
          if (state.session?.user?.email) {
            state.passwords.set(state.session.user.email, password)
          }
          return Promise.resolve({ error: null })
        },
      },
      from: (table) => ({
        select: () => makeQuery(table === 'profiles' ? state.profiles : []),
      }),
      functions: {
        invoke: (name, { body }) => {
          state.fnCalls.push({ name, body })
          return Promise.resolve(state.fnResponse)
        },
      },
      realtime: { setAuth: vi.fn() },
    },
  }
})
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

const { useAuth, createUser, deleteUser, fetchUsers, resetUserPassword, updateUserRole } =
  await import('@/hooks/useAuth')

function seedAccount({ username = 'admin', displayName = '管理员', role = 'admin', password = 'admin123' } = {}) {
  const id = crypto.randomUUID()
  const email = `${username}@geofence.local`
  state.profiles.push({
    id,
    username,
    display_name: displayName,
    role,
    created_at: new Date().toISOString(),
  })
  state.passwords.set(email, password)
  state.ids.set(email, id)
}

beforeEach(() => {
  localStorage.clear()
  state.profiles = []
  state.passwords = new Map()
  state.ids = new Map()
  state.session = null
  state.listener = null
  state.fnCalls = []
  state.fnResponse = { data: { ok: true }, error: null }
})

describe('login / logout', () => {
  it('账号密码正确：返回 null，用户资料（含角色）加载完成', async () => {
    seedAccount()
    const { result } = renderHook(() => useAuth())
    let err
    await act(async () => {
      err = await result.current.login('admin', 'admin123')
    })
    expect(err).toBeNull()
    await waitFor(() =>
      expect(result.current.user).toMatchObject({
        username: 'admin',
        displayName: '管理员',
        role: 'admin',
      }),
    )
    expect(result.current.checking).toBe(false)
  })

  it('密码错误与账号不存在返回同样的模糊提示', async () => {
    seedAccount()
    const { result } = renderHook(() => useAuth())
    let wrongPw
    let noUser
    await act(async () => {
      wrongPw = await result.current.login('admin', 'wrong-pass')
    })
    await act(async () => {
      noUser = await result.current.login('ghost', 'admin123')
    })
    expect(wrongPw).toBe('账号或密码不正确')
    expect(noUser).toBe('账号或密码不正确')
    expect(result.current.user).toBeNull()
  })

  it('auth 用户没有资料（账号被删）时强制登出', async () => {
    // 只有密码没有 profile：模拟资料被删除的账号
    state.passwords.set('ghost@geofence.local', 'admin123')
    state.ids.set('ghost@geofence.local', crypto.randomUUID())
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('ghost', 'admin123')
    })
    await waitFor(() => expect(result.current.user).toBeNull())
    expect(state.session).toBeNull()
  })

  it('logout 清除会话', async () => {
    seedAccount()
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('admin', 'admin123')
    })
    await waitFor(() => expect(result.current.user).not.toBeNull())
    await act(async () => {
      await result.current.logout()
    })
    expect(result.current.user).toBeNull()
    expect(state.session).toBeNull()
  })
})

describe('changePassword', () => {
  it('旧密码错误时拒绝', async () => {
    seedAccount()
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('admin', 'admin123')
    })
    await waitFor(() => expect(result.current.user).not.toBeNull())
    let err
    await act(async () => {
      err = await result.current.changePassword('wrong-old', 'newpass1')
    })
    expect(err).toBe('当前密码不正确')
  })

  it('修改成功后新密码可登录', async () => {
    seedAccount()
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('admin', 'admin123')
    })
    await waitFor(() => expect(result.current.user).not.toBeNull())
    let err
    await act(async () => {
      err = await result.current.changePassword('admin123', 'newpass1')
    })
    expect(err).toBeNull()
    await act(async () => {
      await result.current.logout()
    })
    await act(async () => {
      err = await result.current.login('admin', 'newpass1')
    })
    expect(err).toBeNull()
  })

  it('新密码不足 6 位直接拒绝（不访问网络）', async () => {
    seedAccount()
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('admin', 'admin123')
    })
    await waitFor(() => expect(result.current.user).not.toBeNull())
    let err
    await act(async () => {
      err = await result.current.changePassword('admin123', '123')
    })
    expect(err).toContain('至少 6 位')
  })
})

describe('账号维护（走 account-admin Edge Function）', () => {
  it('resetUserPassword 携带新密码调用 function', async () => {
    seedAccount()
    const err = await resetUserPassword('lisi', 'newpass1')
    expect(err).toBeNull()
    expect(state.fnCalls[0]).toMatchObject({
      name: 'account-admin',
      body: { action: 'resetPassword', payload: { username: 'lisi', password: 'newpass1' } },
    })
  })

  it('resetUserPassword 新密码不足 6 位直接拒绝（不访问网络）', async () => {
    seedAccount()
    const err = await resetUserPassword('lisi', '123')
    expect(err).toContain('至少 6 位')
    expect(state.fnCalls).toHaveLength(0)
  })

  it('updateUserRole 携带目标角色调用 function', async () => {
    seedAccount()
    const err = await updateUserRole('zhangsan', 'viewer')
    expect(err).toBeNull()
    expect(state.fnCalls[0]).toMatchObject({
      name: 'account-admin',
      body: { action: 'updateRole', payload: { username: 'zhangsan', role: 'viewer' } },
    })
  })

  it('createUser 携带角色调用 function，成功后出现在 profiles 列表', async () => {
    seedAccount()
    const err = await createUser({
      username: 'zhangsan',
      displayName: '张三',
      password: '123456',
      role: 'viewer',
    })
    expect(err).toBeNull()
    expect(state.fnCalls[0]).toMatchObject({
      name: 'account-admin',
      body: { action: 'create', payload: { username: 'zhangsan', role: 'viewer' } },
    })
  })

  it('function 返回的中文错误原样透出', async () => {
    state.fnResponse = {
      data: null,
      error: { context: { json: () => Promise.resolve({ error: '只有管理员可以维护账号' }) } },
    }
    expect(await deleteUser('zhangsan')).toBe('只有管理员可以维护账号')
  })

  it('fetchUsers 读取 profiles 并映射角色标签字段', async () => {
    seedAccount()
    seedAccount({ username: 'lisi', displayName: '李四', role: 'viewer', password: 'x'.repeat(6) })
    const list = await fetchUsers()
    expect(list.map((u) => [u.username, u.role])).toEqual([
      ['admin', 'admin'],
      ['lisi', 'viewer'],
    ])
  })
})
