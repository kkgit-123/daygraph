/* global process */
// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
  plugins: [
    react(),
    tailwindcss(),
  ],
  // three.js (~135 kB gzip) is only in the lazily loaded orbScene chunk, so the larger chunk is expected
  build: { chunkSizeWarningLimit: 600 },
  server: {
    port: Number(env.PORT) || 3000,
    strictPort: true,
    // proxy: {
    //   '/api': {
    //     target: 'https://media-eval-backend-445535618662.us-central1.run.app',
    //     changeOrigin: true,
    //     secure: true,
    //   }
    // }
  }
  };
});
