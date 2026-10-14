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
