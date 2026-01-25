import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  // Configure build
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
  }
});
