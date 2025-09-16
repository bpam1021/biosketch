import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,
    allowedHosts: [
      'main.biosketch.ai',
      'www.main.biosketch.ai',
      'localhost',
      '127.0.0.1',
      '95.216.89.141'
    ],
    proxy: {
      '/api': {
        target: 'https://api.biosketch.ai',
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: 'https://api.biosketch.ai',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        admin: path.resolve(__dirname, "admin.html"),
      },
    },
  },
});