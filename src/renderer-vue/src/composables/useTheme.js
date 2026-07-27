import { ref } from 'vue'

export function useTheme() {
  const theme = ref('light')

  function applyTheme(newTheme) {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    try {
      localStorage.setItem('theme', newTheme)
    } catch (e) {
      // localStorage not available
    }
  }

  function initTheme() {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null
    applyTheme(saved || 'light')
  }

  function toggleTheme() {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme,
    initTheme,
    toggleTheme,
  }
}
