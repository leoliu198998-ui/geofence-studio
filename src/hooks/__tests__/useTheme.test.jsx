import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const THEME_KEY = 'geofence-studio:theme'

let systemDark = false
const listeners = new Set()

function mockMatchMedia() {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === '(prefers-color-scheme: dark)' ? systemDark : false,
    media: query,
    addEventListener: (_e, cb) => listeners.add(cb),
    removeEventListener: (_e, cb) => listeners.delete(cb),
  }))
}

const { useTheme } = await import('@/hooks/useTheme')

beforeEach(() => {
  localStorage.clear()
  systemDark = false
  listeners.clear()
  document.documentElement.classList.remove('dark')
  mockMatchMedia()
})

afterEach(() => {
  document.documentElement.classList.remove('dark')
})

describe('useTheme', () => {
  it('默认 system；系统亮色时 resolved 为 light', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('system')
    expect(result.current.resolved).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('系统深色时 system 解析为 dark，html 加 dark class', () => {
    systemDark = true
    mockMatchMedia()
    const { result } = renderHook(() => useTheme())
    expect(result.current.resolved).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('非法存储值回退 system', () => {
    localStorage.setItem(THEME_KEY, 'neon')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('system')
  })

  it('读取持久化选择', () => {
    localStorage.setItem(THEME_KEY, 'dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(result.current.resolved).toBe('dark')
  })

  it('cycleTheme 三态循环 dark→light→system→dark 并持久化', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.cycleTheme()) // system → dark
    expect(result.current.theme).toBe('dark')
    act(() => result.current.cycleTheme()) // dark → light
    expect(result.current.theme).toBe('light')
    act(() => result.current.cycleTheme()) // light → system
    expect(result.current.theme).toBe('system')
    act(() => result.current.cycleTheme()) // system → dark
    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })

  it('setTheme 直接设置并写入 localStorage', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme('light'))
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    expect(result.current.resolved).toBe('light')
  })
})
