import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The REST + GraphQL layers live on the Express server. In dev we proxy
// everything under /api/v1 (and /graphql) to it so the browser keeps a
// same-origin contract and there are no CORS surprises.
// SERVER_ORIGIN can be overridden when the backend runs on another port.
const SERVER_ORIGIN = process.env.SERVER_ORIGIN ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
        target: SERVER_ORIGIN,
        changeOrigin: true,
      },
      '/graphql': {
        target: SERVER_ORIGIN,
        changeOrigin: true,
      },
    },
  },
});
