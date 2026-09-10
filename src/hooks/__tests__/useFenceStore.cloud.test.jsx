import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 云端模式：mock 整个 supabase 模块
const cloud = vi.hoisted(() => ({ rows: [], error: null }))

vi.mock('@/config/supabase', () => ({
  hasSupabaseConfig: true,
  supabase: {
    from: () => ({
      select: () => ({
        order: () => Promise.resolve({ data: cloud.rows, error: cloud.error }),
      }),
      insert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    removeChannel: () => {},
  },
}))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

const { useFenceStore } = await import('@/hooks/useFenceStore')

const row = (over) => ({
  id: crypto.randomUUID(),
  mode: 'sale',
  code: 'S-001',
  name: '大宁地区',
  path: [
    [121.41, 31.29],
    [121.42, 31.29],
    [121.41, 31.3],
  ],
  area: 100,
  created_at: '2026-09-09T10:00:00.000Z',
  ...over,
})

beforeEach(() => {
  localStorage.clear()
  cloud.rows = []
  cloud.error = null
})

describe('云端加载', () => {
  it('云端行映射为围栏并去重（同 id / 同 mode|code|name）', async () => {
    const a = row()
    cloud.rows = [a, { ...a }, row({ id: crypto.randomUUID() })]
    const { result } = renderHook(() => useFenceStore())
    await waitFor(() => expect(result.current.syncStatus).toBe('online'))
    expect(result.current.fences).toHaveLength(1)
    expect(result.current.fences[0].createdAt).toBe(a.created_at)
  })

  it('云端查询失败时降级为本地模式', async () => {
    cloud.error = { message: 'network down' }
    const { result } = renderHook(() => useFenceStore())
    await waitFor(() => expect(result.current.syncStatus).toBe('offline'))
  })

  it('云端字段 created_at 映射为 createdAt', async () => {
    cloud.rows = [row()]
    const { result } = renderHook(() => useFenceStore())
    await waitFor(() => expect(result.current.syncStatus).toBe('online'))
    expect(result.current.fences[0]).toMatchObject({ code: 'S-001', name: '大宁地区' })
  })
})
