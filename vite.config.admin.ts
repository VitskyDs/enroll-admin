import path from 'path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In dev, Vite serves the default index.html (consumer entry) at every route.
// Rewrite HTML navigation requests to index-admin.html so the admin app loads
// at / and on full reloads of any SPA route. The browser URL is untouched, so
// React Router still matches the real path.
function adminEntry(): Plugin {
  return {
    name: 'admin-dev-entry',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? '/'
        const wantsHtml = req.headers.accept?.includes('text/html')
        if (wantsHtml && !url.includes('.')) req.url = '/index-admin.html'
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [adminEntry(), react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'index-admin.html'),
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('react-router')) return 'router'
          if (id.includes('i18next')) return 'i18n'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor'
        },
      },
    },
  },
})
