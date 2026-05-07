import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy API requests to the backend — avoids CORS issues in development
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      // Proxy Socket.IO requests
      '/socket.io': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        ws: true,
        // Suppress noisy EPIPE/ECONNRESET errors from WebSocket proxy.
        // These are harmless — they occur when the backend restarts,
        // a browser tab closes, or Socket.IO reconnects.
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (['EPIPE', 'ECONNRESET'].includes(err.code)) return;
            console.error('Proxy error:', err.message);
          });
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err) => {
              if (['EPIPE', 'ECONNRESET'].includes(err.code)) return;
              console.error('WS proxy socket error:', err.message);
            });
          });
        },
      },
    },
  },
})
