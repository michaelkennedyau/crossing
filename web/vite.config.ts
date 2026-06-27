import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

/**
 * Multi-entry island build. NO index.html is emitted (the Worker SSRs the shell), so "/" is never
 * shadowed by a static asset. Entry filenames are STABLE (no content hash) so the SSR shell can
 * reference /assets/<name>.js directly without a manifest; chunks + emitted assets keep hashes.
 */
export default defineConfig({
  base: '/',
  plugins: [react()],
  // Isolate from the parent ~/Claude/varo PostCSS/Tailwind config (this project is nested inside the
  // Next.js app). An explicit empty inline config stops Vite walking up the tree and injecting a
  // global Tailwind reset into our island CSS.
  css: { postcss: { plugins: [] } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: false,
    target: 'es2021',
    rollupOptions: {
      input: {
        engine: resolve(__dirname, 'src/entries/engine.ts'),
        bridge: resolve(__dirname, 'src/entries/bridge.tsx'),
        // sound / concierge entries are added in their phases
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
