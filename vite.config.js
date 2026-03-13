import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  root: 'src/renderer-vue',
  base: './',
  build: {
    outDir: '../../dist-renderer',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer-vue/src')
    }
  },
  server: {
    port: 5173
  }
})
