/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Gera os ícones do PWA a partir do nosso favicon (192/512 + maskable + apple).
      pwaAssets: { image: 'public/favicon.svg' },
      manifest: {
        name: 'Taut',
        short_name: 'Taut',
        description:
          'Conecte os números em ordem, contorne as paredes e chegue no traçado ideal. Um novo puzzle por dia.',
        lang: 'pt-BR',
        theme_color: '#db2777',
        background_color: '#fff7ed',
        display: 'standalone',
        start_url: '/',
      },
      // O puzzle é derivado da DATA do dispositivo (computado no cliente), então
      // nunca fica "velho". `autoUpdate` cuida do código: o service worker baixa a
      // versão nova e ativa no próximo carregamento (sem servir um build antigo).
    }),
  ],
  test: {
    // O engine/ é TS puro (sem DOM): roda em 'node'. Testes de UI optam por
    // jsdom com `// @vitest-environment jsdom` no topo do arquivo.
    environment: 'node',
    setupFiles: './src/test/setup.ts',
  },
})
