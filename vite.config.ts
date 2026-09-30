import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Puerto fijo: 5173 lo ocupa otro proceso en esta máquina.
    port: 5174,
    strictPort: true,
  },
})
