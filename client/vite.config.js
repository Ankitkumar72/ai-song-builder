import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Force the output to be 'dist' inside the client folder
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // Ensure imports use the correct root
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})