import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

const { useFenceManager } = await import('@/hooks/useFenceManager')

const baseProps = () => ({
  map: null, // 无地图时所有 AMap 副作用均跳过，专注 state 逻辑
  AMap: null,
  mode: 'sale',
  fences: [],
  onInsert: vi.fn(),
  onUpdate: vi.fn(),
  onRemove: vi.fn(),
})

describe('useFenceManager 视图切换', () => {
  it('切换 mode 时中止绘制/编辑状态，不抛错（回归：editBackup 声明位置导致的 TDZ 白屏）', () => {
    const props = baseProps()
    const { rerender } = renderHook((p) => useFenceManager(p), { initialProps: props })
    expect(() => rerender({ ...props, mode: 'rent' })).not.toThrow()
    expect(() => rerender({ ...props, mode: 'sale' })).not.toThrow()
  })
})
