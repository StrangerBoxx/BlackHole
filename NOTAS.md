# BLACK HOLE — notas del proyecto

Juego incremental 2D vertical. Phaser 3 + TypeScript (Vite), tests con Vitest, móvil con Capacitor (Android).
Referencia de comportamiento: `referencia/prototipo.html` (el prototipo original), `referencia/LEEME.txt`
(guía de tamaños de los assets) y `referencia/guia_objeto.png` (plantilla del círculo de choque).

## Cómo correrlo

```
npm install           # una vez (o después de bajar el proyecto de nuevo)
npm run dev           # juego en el navegador; en el celular usa la dirección "Network" (misma Wi-Fi)
npm test              # tests de la lógica
npm run build         # versión final en dist/ (sin panel de debug)
npm run android       # build + copia a android/
npm run android:abrir # abre el proyecto en Android Studio
```

## Cómo cambiar cosas sin tocar código

- **Balance** (`public/data/balance.json`): objetos, mejoras, efectos, física, combo, aparición, volúmenes,
  colores de efectos. Guardar y recargar la página.
  - Efecto lineal: `{ "mejora", "base", "porNivel" }` → `base + nivel*porNivel`.
  - Efecto exponencial: `{ "mejora", "base", "factorPorNivel", "minimo" }` → `max(minimo, base*factor^nivel)`.
  - Agregar un objeto: una línea en `objetos` + `public/assets/img/objetos/<id>.png`.
- **Imágenes y sonidos** (`public/assets/`): reemplazar el archivo por otro **con el mismo nombre**. Las escalas
  se calculan solas desde el radio y el tamaño real del PNG. Si falta un WAV, ese sonido no suena (no se cae).

## Carpetas

```
public/data/balance.json   todos los números
public/assets/             imágenes y sonidos (nombres fijos, ver referencia/LEEME.txt)
src/main.ts                configuración de Phaser
src/escenas/               CargaScene (lee balance y assets) · JuegoScene (pasto, hoyo, objetos)
                           HudScene (marcador, avisos, tienda) · DebugScene (solo desarrollo)
src/entidades/             Hoyo · Objeto · BotonMejora · Popup ("+N")
src/core/                  Progreso (autoload) · Guardado · Sonido · Balance · Debug · pantalla · estilo · assets
src/logica/                lógica pura sin Phaser: fisica, lanzamiento, captura, mejoras, objetos, aparicion,
                           monedas, sonido, guardado, balance
tests/                     un archivo de tests por módulo de lógica
android/                   proyecto Android (Capacitor)
referencia/                prototipo y guías originales
```

## Reglas del juego (resumen)

- Vista desde arriba, pasto. Mundo de 720x960, sin gravedad. Hoyo fijo en (360, 330).
- Arrastras un objeto y al soltarlo sale con la velocidad del dedo de los últimos 90 ms (tope 2400 px/s).
  Se agarra el objeto más cercano si el dedo está a menos de `r + 22` px. Sin restricción de zona.
- Roce: `v *= max(0, 1 - 1.6*dt)`. Rebote 0.6 en bordes y entre objetos (masa = r²; el agarrado no se mueve por choques).
- Paso de tiempo máximo 1/30 s por cuadro (si el celular se traba, el juego va más lento en vez de atravesar paredes).
- Atracción dentro del radio: `fuerza * (1 - dist/radio) + fuerza * 0.15`.
- Captura: `dist < radio_hoyo - r*0.2` y velocidad < velocidad de captura. Caída en espiral de 0.6 s.
- Monedas por objeto: `round(valor * multiplicador)`. Combo si el siguiente cae antes de 2.5 s;
  desde el 3.º seguido aparece "¡Combo xN!".
- Objeto desbloqueado si `r <= radio_hoyo * 0.95`. Aparición con peso `1 + i*0.6`.
  Al empezar salen 4 de una vez. Lugar: a más de `min(radio_atracción, 260) + r + 20` del hoyo y a 8 px de otros
  (40 intentos; si no hay lugar, ese turno no sale nada). Si el pasto está lleno, se pierde el turno del reloj.
- Mejoras: costo `round(base * mult^nivel)`.
- Sonido: "tragar" con tono `1.3 - tamaño*0.6` (tamaño = r/56, tope 1) y volumen `(0.6 + tamaño*0.8) * vol`;
  "moneda" con tono `2^(combo/12)`, tope 12.

## Decisiones

- **Pedido escrito para Godot, hecho en web.** Equivalencias:
  `.tres` → `balance.json` · Autoload `Progreso.gd` → `src/core/Progreso.ts` · `user://save.json` → `localStorage` ·
  GUT → Vitest · `pitch_scale` → `rate` de Phaser · canvas_items/expand → `Phaser.Scale.EXPAND` ·
  Compatibilidad → `Phaser.AUTO` · "emular toque con mouse" → Phaser ya trata mouse y dedo igual ·
  preset de exportación Android → proyecto `android/` de Capacitor.
- **Phaser 3.90.0** fijo (ya existe Phaser 4, pero se pidió 3).
- **Física propia** en `src/logica/fisica.ts` (no Arcade/Matter): copia exacta del prototipo y se puede testear.
- **Corrección al prototipo:** al separar dos objetos que se pisan, el prototipo empujaba más al *grande*.
  Aquí se reparte con el inverso de la masa (el chico se mueve más). Entre objetos iguales da lo mismo.
- **Pantalla = barra (84) + pasto (960) + tienda (162)** → tamaño base 720x1206, como el prototipo
  (marcador arriba, campo al medio, mejoras abajo). El pasto se centra en el espacio libre entre barra y tienda,
  así nunca queda tapado. Si la pantalla es más alta o más ancha, sobra espacio color tierra. Medidas en
  `src/core/pantalla.ts`. En el celular se respeta la zona del reloj y de los botones del sistema (safe area).
- **Arrastre leído en cada cuadro:** la barra y la tienda atrapan los toques (para no agarrar objetos al comprar),
  así que el juego revisa en cada cuadro dónde está el dedo y si se levantó. Soltar encima de la tienda funciona.
- **Tienda:** tocar un botón muestra qué hace el siguiente nivel abajo y compra si alcanza. Borde dorado = alcanza.
- **Bus de eventos entre escenas** (`game.events`, lista en `src/core/estilo.ts`): `captura` (tipo),
  `tragado` (tipo, monedas), `aviso` (texto, segundos), `combo` (número), `compra` (id, nivel),
  `desbloqueo` (objetos nuevos), `reinicio`. El HUD y el sonido escuchan eso en vez de meterse en la escena.
- **Combo y monedas** usan el tiempo del juego (suma de dt), no el reloj: con velocidad x2 todo sigue cuadrando.
- **Sonido** (`src/core/Sonido.ts`): "tragar" suena al *empezar* a caer (como el prototipo); "moneda" al terminar.
  Volumen general 0.85 y por archivo en `balance.json` → `sonido`. El ambiente arranca con el primer toque
  (los navegadores no dejan sonar antes). "Sonido: sí/no" arriba a la izquierda; se recuerda en el dispositivo.
- **Guardado** (`src/core/Guardado.ts`): `localStorage["black-hole-save"]` con `{version, monedas, total, niveles}`.
  Se guarda en cada cambio y al esconder la app. Al cargar se arreglan datos rotos (niveles > máximo → máximo, etc.).
  "Reiniciar" arriba a la izquierda pide un segundo toque antes de borrar (como el prototipo).
- **Panel de debug** (`src/escenas/DebugScene.ts`), solo con `npm run dev`: se abre con **F1** o con **3 toques rápidos
  en la esquina superior derecha**. Trae +1000 / +100 000 monedas, subir/bajar cada mejora (gratis), círculos de choque
  (rojo objetos, amarillo hoyo, celeste atracción), velocidad x2 (dos pasos de física por cuadro) y reiniciar.
  `npm run build` no lo incluye. En desarrollo también quedan `juego` y `progreso` en la consola del navegador.
- **Halo, polvo y línea punteada** se dibujan por código (como en el prototipo); sus colores están en `balance.json` → `visual`.
- **Fuentes** "Lilita One" y "Nunito" incluidas en el juego (paquetes `@fontsource`): funcionan sin internet.
- **No portado del prototipo:** el botón "Probar mis dibujos" (cargar imágenes desde el navegador). Para probar arte
  nuevo se reemplaza el archivo en `public/assets/` y se recarga.

## Android

Requisito: **Android Studio** (trae Java y el SDK). Este PC no lo tenía, así que el APK no se compiló aquí.

1. `npm run android` (compila el juego y lo copia a `android/`). Repetir cada vez que cambie el juego.
2. `npm run android:abrir` → en Android Studio: botón ▶ con un teléfono conectado (modo desarrollador + depuración USB),
   o **Build → Build App Bundle(s) / APK(s)**.
3. Para publicar: **Build → Generate Signed App Bundle** y crear un keystore. Guardar el keystore y su clave fuera
   del repositorio (`*.jks`/`*.keystore` están en `.gitignore`); si se pierde, no se puede actualizar la app.

Configurado: orientación vertical fija, nombre "Black Hole", `appId` `com.blackhole.juego` (**cambiarlo antes de
publicar** en `capacitor.config.ts` y `android/app/build.gradle`; después ya no se puede), fondo color tierra.
Pendiente: ícono propio (hoy usa el de Capacitor; se puede generar con `@capacitor/assets`).

## Estado por pasos

- [x] 0. Base del proyecto
- [x] 1. Objeto arrastrable y lanzable
- [x] 2. Hoyo que atrae y traga
- [x] 3. Monedas y combo
- [x] 4. Tienda de mejoras
- [x] 5. Aparición y desbloqueos
- [x] 6. Sonidos
- [x] 7. Guardado
- [x] 8. Panel de debug, tests (90) y proyecto Android
