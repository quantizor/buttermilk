import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// The README and MIGRATING files live at the monorepo root; Vite's
// `server.fs.allow` must include them so `?raw` imports resolve.
const repoRoot = resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  server: {
    fs: { allow: [repoRoot] },
  },
});
