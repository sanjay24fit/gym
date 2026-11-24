import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /supabase proxy is only for local development against `supabase start`
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase'
          }
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-lucide'
          }
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/supabase': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase/, ''),
      },
    },
  },
})
