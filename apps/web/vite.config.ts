import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vitest/config'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig(({ mode }) => {
  const plugins = [
    mode !== 'test' ? devtools() : null,
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tailwindcss(),
    mode !== 'test' ? tanstackStart() : null,
    viteReact(),
  ].filter(Boolean) as PluginOption[]

  return {
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    proxy: mode === 'development'
      ? {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
        }
      : undefined,
  },
  test: {
    environment: 'jsdom',
  },
  plugins,
}
})

export default config
