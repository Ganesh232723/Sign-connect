import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Only load local HTTPS certs in development (not during Vercel build)
  const isDev = mode === 'development'
  const certsExist =
    isDev &&
    fs.existsSync('./certs/key.pem') &&
    fs.existsSync('./certs/cert.pem')

  return {
    plugins: [react()] as never,
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      // Raise the chunk warning limit (MediaPipe is large)
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('react-router')) {
              return 'vendor'
            }
            if (id.includes('@supabase')) {
              return 'supabase'
            }
            if (id.includes('framer-motion') || id.includes('lucide-react')) {
              return 'ui'
            }
          },
        },
      },
    },
    server: {
      host: true,
      port: 5173,
      strictPort: false,
      // Only enable HTTPS locally when certs exist
      ...(certsExist
        ? {
            https: {
              key: fs.readFileSync('./certs/key.pem'),
              cert: fs.readFileSync('./certs/cert.pem'),
            },
          }
        : {}),
      headers: {
        'Permissions-Policy': 'camera=*, microphone=*, display-capture=*',
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://storage.googleapis.com https://accounts.google.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob: https://img.youtube.com https://images.unsplash.com https://*.supabase.co https://api.dicebear.com",
          "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://accounts.google.com",
          "connect-src 'self' https://*.supabase.co https://api.mymemory.translated.net https://lingva.ml wss://*.supabase.co https://cdn.jsdelivr.net https://storage.googleapis.com https://accounts.google.com https://www.googleapis.com",
          "media-src 'self' blob:",
          "worker-src 'self' blob:",
        ].join('; '),
      },
    },
  }
})
