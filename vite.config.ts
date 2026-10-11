import { defineConfig } from "vitest/config";

export default defineConfig({
  // Rutas relativas: necesario para que Capacitor encuentre los archivos en el celular
  base: "./",
  build: { outDir: "dist", assetsInlineLimit: 0, chunkSizeWarningLimit: 2000 }, // Phaser pesa ~1.2 MB
  test: { include: ["tests/**/*.test.ts"] },
});
