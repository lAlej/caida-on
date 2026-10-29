import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const backend = process.env['BACKEND_URL'] ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En desarrollo el navegador habla solo con Vite; él reenvía al servidor del juego.
    proxy: {
      '/api': backend,
      '/ws': { target: backend.replace(/^http/, 'ws'), ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
