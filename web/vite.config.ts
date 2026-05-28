import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.mmd'],
  resolve: {
    alias: {
      '@primed/parser': path.resolve(__dirname, '../packages/parser/src/index.ts'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['sdflash.local', 'primed.local', 'localhost'],
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['sdflash.local', 'primed.local', 'localhost'],
  },
})
