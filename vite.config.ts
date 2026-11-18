import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Served at the project root on Vercel. Set DAMPER_BASE=/some/subpath/ for a host that
// serves it under a subpath (GitHub Pages did, at /damper-frontend/).
export default defineConfig({
  base: process.env.DAMPER_BASE ?? '/',
  plugins: [react()],
  test: { environment: 'jsdom', include: ['test/**/*.test.{ts,tsx}'] },
});
