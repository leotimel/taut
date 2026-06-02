/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // O engine/ é TS puro (sem DOM): roda em 'node'. Testes de UI optam por
    // jsdom com `// @vitest-environment jsdom` no topo do arquivo.
    environment: 'node',
    setupFiles: './src/test/setup.ts',
  },
})
