import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 纯本地模式：supabase 未配置
vi.mock('@/config/supabase', () => ({ hasSupabaseConfig: false, supabase: null }))
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

const { useFenceStore } = await import('@/hooks/useFenceStore')

const CACHE_KEY = 'geofence-studio:fences'

function seedCache(list) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(list))
}

function readCache() {
  return JSON.parse(localStorage.getItem(CACHE_KEY))
}

const fence = (over) => ({
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
  createdAt: '2026-09-09T10:00:00.000Z',
  ...over,
})

beforeEach(() => {
  localStorage.clear()
})

describe('loadCache 去重', () => {
  it('同 id 重复行只保留一条', () => {
    const f = fence()
    seedCache([f, { ...f }])
    const { result } = renderHook(() => useFenceStore())
    expect(result.current.fences).toHaveLength(1)
  })

  it('同 (mode, code, name) 不同 id 的历史双写残留被清理', () => {
    const a = fence()
    const b = fence({ id: crypto.randomUUID() })
    seedCache([a, b])
    const { result } = renderHook(() => useFenceStore())
    expect(result.current.fences).toHaveLength(1)
    expect(result.current.fences[0].id).toBe(a.id)
  })

  it('同 code+name 但不同 mode 不算重复', () => {
    seedCache([fence(), fence({ id: crypto.randomUUID(), mode: 'rent', code: 'S-001' })])
    const { result } = renderHook(() => useFenceStore())
    expect(result.current.fences).toHaveLength(2)
  })

  it('旧格式（无 mode）默认归买卖视图', () => {
    const legacy = fence()
    delete legacy.mode
    seedCache([legacy])
    const { result } = renderHook(() => useFenceStore())
    expect(result.current.fences[0].mode).toBe('sale')
  })

  it('缓存损坏时降级为空列表', () => {
    localStorage.setItem(CACHE_KEY, '{broken json')
    const { result } = renderHook(() => useFenceStore())
    expect(result.current.fences).toEqual([])
  })
})

describe('编号递增', () => {
  it('空库从 S-001 开始，逐条递增', () => {
    const { result } = renderHook(() => useFenceStore())
    const base = { mode: 'sale', name: '甲', path: [[1, 1], [2, 2], [3, 3]], area: 1 }
    let first
    let second
    act(() => {
      first = result.current.insertFence(base)
    })
    act(() => {
      second = result.current.insertFence(base)
    })
    expect(first.code).toBe('S-001')
    expect(second.code).toBe('S-002')
  })

  it('租赁视图使用 R- 前缀且序列独立', () => {
    seedCache([fence()])
    const { result } = renderHook(() => useFenceStore())
    let created
    act(() => {
      created = result.current.insertFence({
        mode: 'rent',
        name: '乙',
        path: [[1, 1], [2, 2], [3, 3]],
        area: 1,
      })
    })
    expect(created.code).toBe('R-001')
  })

  it('insertFences 批量插入在一次调用内顺序续号（不重复编号）', () => {
    seedCache([fence()])
    const { result } = renderHook(() => useFenceStore())
    let created
    act(() => {
      created = result.current.insertFences([
        { mode: 'sale', name: '黄兴买卖区', path: [[1, 1], [2, 2], [3, 3]], area: 1 },
        { mode: 'sale', name: '彭虹买卖区1', path: [[4, 4], [5, 5], [6, 6]], area: 2 },
      ])
    })
    expect(created.map((f) => f.code)).toEqual(['S-002', 'S-003'])
    expect(result.current.fences).toHaveLength(3)
  })

  it('历史最大编号之后续号（S-009 存在时新插入为 S-010）', () => {
    seedCache([fence({ code: 'S-009' })])
    const { result } = renderHook(() => useFenceStore())
    let created
    act(() => {
      created = result.current.insertFence({
        mode: 'sale',
        name: '丙',
        path: [[1, 1], [2, 2], [3, 3]],
        area: 1,
      })
    })
    expect(created.code).toBe('S-010')
  })
})

describe('增删改（本地模式）', () => {
  it('updateFence 修改名称并持久化到缓存', () => {
    const f = fence()
    seedCache([f])
    const { result } = renderHook(() => useFenceStore())
    act(() => result.current.updateFence(f.id, { name: '新名字' }))
    expect(result.current.fences[0].name).toBe('新名字')
    expect(readCache()[0].name).toBe('新名字')
  })

  it('removeFence 删除后缓存同步', () => {
    const f = fence()
    seedCache([f, fence({ id: crypto.randomUUID(), code: 'S-002', name: '乙' })])
    const { result } = renderHook(() => useFenceStore())
    act(() => result.current.removeFence(f.id))
    expect(result.current.fences).toHaveLength(1)
    expect(result.current.fences[0].name).toBe('乙')
    expect(readCache()).toHaveLength(1)
  })

  it('名称为空白时回退「未命名围栏」', () => {
    const { result } = renderHook(() => useFenceStore())
    let created
    act(() => {
      created = result.current.insertFence({
        mode: 'sale',
        name: '   ',
        path: [[1, 1], [2, 2], [3, 3]],
        area: 1,
      })
    })
    expect(created.name).toBe('未命名围栏')
  })
})
