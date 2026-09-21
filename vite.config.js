import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  // Relative base for GitHub Pages deployment
  base: './',
  plugins: [
    basicSsl()
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: true
  }
});
