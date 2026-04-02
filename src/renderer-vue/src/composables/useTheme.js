import { ref, computed } from 'vue'
import { useIpc } from './useIpc'

/**
 * Theme composable
 * Handles light/dark theme toggling and persistence
 */
export function useTheme() {
  const theme = ref('light')

  const isDark = computed(() => theme.value === 'dark')

  function applyTheme(nextTheme) {
    const t = nextTheme === 'dark' ? 'dark' : 'light'
    theme.value = t
    document.documentElement.dataset.theme = t
    try {
      localStorage.setItem('arc_theme', t)
    } catch (e) {
      // Ignore storage errors
    }
  }

  function toggleTheme() {
    const newTheme = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme(newTheme)
    
    if (window.api?.trackEvent) {
      window.api.trackEvent('theme_toggle', { theme: newTheme })
    }
  }

  function initTheme() {
    try {
      const saved = localStorage.getItem('arc_theme')
      if (saved === 'dark' || saved === 'light') {
        applyTheme(saved)
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyTheme('dark')
      } else {
        applyTheme('light')
      }
    } catch (e) {
      applyTheme('light')
    }
  }

  return {
    theme,
    isDark,
    applyTheme,
    toggleTheme,
    initTheme
  }
}
