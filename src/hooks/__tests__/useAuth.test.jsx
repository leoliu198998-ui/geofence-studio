import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 内存 users 表 + 最小 supabase 查询构建器
const db = vi.hoisted(() => ({ users: [] }))

vi.mock('@/config/supabase', () => {
  const applyEq = (rows, filters) =>
    rows.filter((r) => filters.every(([col, val]) => r[col] === val))

  const makeQuery = (rows, filters = []) => {
    const q = {
      eq: (col, val) => makeQuery(rows, [...filters, [col, val]]),
      order: () => Promise.resolve({ data: applyEq(rows, filters), error: null }),
      maybeSingle: () =>
        Promise.resolve({ data: applyEq(rows, filters)[0] ?? null, error: null }),
      then: (resolve) => resolve({ data: applyEq(rows, filters), error: null, count: applyEq(rows, filters).length }),
    }
    return q
  }

  return {
    hasSupabaseConfig: true,
    supabase: {
      from: (table) => ({
        select: (_cols, _opts) => makeQuery(table === 'users' ? db.users : []),
        insert: (row) => {
          db.users.push({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row })
          return Promise.resolve({ error: null })
        },
        update: (patch) => ({
          eq: (col, val) => {
            db.users = db.users.map((u) => (u[col] === val ? { ...u, ...patch } : u))
            return Promise.resolve({ error: null })
          },
        }),
        delete: () => ({
          eq: (col, val) => {
            db.users = db.users.filter((u) => u[col] !== val)
            return Promise.resolve({ error: null })
          },
        }),
      }),
    },
  }
})
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

const { useAuth, hashPassword, createUser, deleteUser, fetchUsers } = await import('@/hooks/useAuth')

const SESSION_KEY = 'geofence-studio:session'
// 与 migration 中默认 admin 的哈希一致：SHA-256('geofence-studio:v1:admin123')
const ADMIN123_HASH = '9a3e60d678b07ffb867040c6b98a579d6ecc1860ea651c38ccb44cbaf1480c4a'

async function seedUser(username = 'admin', password = 'admin123', displayName = '管理员') {
  db.users.push({
    id: crypto.randomUUID(),
    username,
    password_hash: await hashPassword(password),
    display_name: displayName,
    created_at: new Date().toISOString(),
  })
}

beforeEach(() => {
  localStorage.clear()
  db.users = []
})

describe('hashPassword', () => {
  it('SHA-256(盐+明文) 与 migration 默认 admin 哈希一致', async () => {
    expect(await hashPassword('admin123')).toBe(ADMIN123_HASH)
  })

  it('不同密码哈希不同', async () => {
    expect(await hashPassword('admin123')).not.toBe(await hashPassword('admin124'))
  })
})

describe('login / logout', () => {
  it('账号密码正确：返回 null，写入会话与 localStorage', async () => {
    await seedUser()
    const { result } = renderHook(() => useAuth())
    let err
    await act(async () => {
      err = await result.current.login('admin', 'admin123')
    })
    expect(err).toBeNull()
    expect(result.current.user).toMatchObject({ username: 'admin', displayName: '管理员' })
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)).username).toBe('admin')
  })

  it('密码错误与账号不存在返回同样的模糊提示', async () => {
    await seedUser()
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
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('logout 清除会话', async () => {
    await seedUser()
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('admin', 'admin123')
    })
    act(() => result.current.logout())
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('挂载时复核会话：账号已被删除则会话失效', async () => {
    await seedUser()
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ username: 'ghost', displayName: 'Ghost', signedInAt: 'x' }),
    )
    const { result } = renderHook(() => useAuth())
    expect(result.current.checking).toBe(true)
    await waitFor(() => expect(result.current.checking).toBe(false))
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })
})

describe('changePassword', () => {
  it('旧密码错误时拒绝', async () => {
    await seedUser()
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('admin', 'admin123')
    })
    let err
    await act(async () => {
      err = await result.current.changePassword('wrong-old', 'newpass1')
    })
    expect(err).toBe('当前密码不正确')
  })

  it('修改成功后新密码可登录', async () => {
    await seedUser()
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('admin', 'admin123')
    })
    let err
    await act(async () => {
      err = await result.current.changePassword('admin123', 'newpass1')
    })
    expect(err).toBeNull()
    expect(db.users[0].password_hash).toBe(await hashPassword('newpass1'))
  })

  it('新密码不足 6 位直接拒绝（不访问数据库）', async () => {
    await seedUser()
    const { result } = renderHook(() => useAuth())
    await act(async () => {
      await result.current.login('admin', 'admin123')
    })
    let err
    await act(async () => {
      err = await result.current.changePassword('admin123', '123')
    })
    expect(err).toContain('至少 6 位')
  })
})

describe('账号维护', () => {
  it('createUser 校验用户名格式与密码长度', async () => {
    expect(await createUser({ username: '不合法!', password: '123456' })).toContain('用户名')
    expect(await createUser({ username: 'a', password: '123456' })).toContain('用户名')
    expect(await createUser({ username: 'zhangsan', password: '123' })).toContain('至少 6 位')
  })

  it('createUser 拒绝重复用户名，成功后出现在列表', async () => {
    await seedUser()
    expect(await createUser({ username: 'admin', password: '123456' })).toBe('用户名已存在')
    expect(
      await createUser({ username: 'zhangsan', displayName: '张三', password: '123456' }),
    ).toBeNull()
    const list = await fetchUsers()
    expect(list.map((u) => u.username)).toEqual(['admin', 'zhangsan'])
    expect(list[1].displayName).toBe('张三')
  })

  it('deleteUser 保护：不能删自己、至少保留一个账号', async () => {
    await seedUser()
    expect(await deleteUser('admin', 'admin')).toBe('不能删除当前登录的账号')
    expect(await deleteUser('admin', 'someone-else')).toBe('至少需要保留一个账号')
    await seedUser('zhangsan', '123456', '张三')
    expect(await deleteUser('zhangsan', 'admin')).toBeNull()
    expect((await fetchUsers()).map((u) => u.username)).toEqual(['admin'])
  })
})
