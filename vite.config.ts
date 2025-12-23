import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, './src/domain'),
      '@engines': path.resolve(__dirname, './src/engines'),
      '@workers': path.resolve(__dirname, './src/workers'),
    },
  },
})
