import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Relative base so the production build also works when opened from a
  // sub-path or the local filesystem.
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
});
