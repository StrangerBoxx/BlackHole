import { defineConfig } from 'vite';

// base './' makes the built files use relative paths, which the phone app (Capacitor) needs.
// host: true lets you open the dev server from your phone on the same Wi-Fi (http://<your-pc-ip>:5173).
export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: { outDir: 'dist', target: 'es2020' },
});
