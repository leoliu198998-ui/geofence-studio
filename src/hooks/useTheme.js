import { useEffect, useState } from 'react'

const THEME_KEY = 'geofence-studio:theme'
const MODES = ['dark', 'light', 'system']

function getStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return MODES.includes(v) ? v : 'system'
  } catch {
    return 'system'
  }
}

/**
 * 三态主题：dark / light / system。
 * html 根元素 class 切换 + localStorage 持久化 + 系统主题监听。
 */
export function useTheme() {
  const [theme, setTheme] = useState(getStoredTheme)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // 忽略
    }
  }, [theme])

  const cycleTheme = () =>
    setTheme((t) => (t === 'dark' ? 'light' : t === 'light' ? 'system' : 'dark'))

  return { theme, resolved, setTheme, cycleTheme }
}
