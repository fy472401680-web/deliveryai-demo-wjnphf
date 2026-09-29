import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'dark-mode'

/**
 * 黑夜模式状态管理 hook。
 * 优先级：localStorage > 默认关闭（明亮模式）。
 * localStorage 不可用时降级为内存态，不报错不阻塞。
 */
export function useDarkMode() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    const initial = getInitialDarkMode()
    applyDarkMode(initial)
    return initial
  })

  useEffect(() => {
    applyDarkMode(enabled)
  }, [enabled])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false')
      } catch {
        // localStorage 不可用时降级为内存态，不报错
      }
      return next
    })
  }, [])

  return { enabled, toggle }
}

function getInitialDarkMode(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch {
    // localStorage 不可用时降级为默认关闭
  }
  return false
}

function applyDarkMode(enabled: boolean) {
  const root = document.documentElement
  if (enabled) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}
