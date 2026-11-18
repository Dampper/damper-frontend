import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the site under /damper-frontend/. Set DAMPER_BASE=/ for any other host.
export default defineConfig({
  base: process.env.DAMPER_BASE ?? '/damper-frontend/',
  plugins: [react()],
  test: { environment: 'jsdom', include: ['test/**/*.test.{ts,tsx}'] },
});
