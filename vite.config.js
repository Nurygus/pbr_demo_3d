import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pbr_demo_3d/',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
});

