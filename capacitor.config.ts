import type { CapacitorConfig } from "@capacitor/cli";

// App de Android: empaqueta la carpeta dist/ (npm run build) dentro de la app.
const config: CapacitorConfig = {
  // Identificador único de la app en Google Play. Cámbialo antes de publicar (no se puede cambiar después).
  appId: "com.blackhole.juego",
  appName: "Black Hole",
  webDir: "dist",
  android: {
    backgroundColor: "#1d1712",
  },
};

export default config;
