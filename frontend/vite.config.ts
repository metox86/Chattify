import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    host: "0.0.0.0",
    allowedHosts: ["intro-fleet-saving-acer.trycloudflare.com"],
    proxy: {
      '/api/peer': {
        target: 'http://127.0.0.1:3000',
        ws: true, // BU OLMADAN WSS ÇALIŞMAZ
        changeOrigin: true,
        // rewrite eklemeyelim, PeerJS kendi içinde /peerjs ekini zaten koyuyor
      },
      "/socket.io": {
        target: "http://127.0.0.1:3000",
        ws: true,
        changeOrigin: true
      },
      "/auth": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      },
      "/api/v1": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      },
      "/upload": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      }
    }
  }
})
