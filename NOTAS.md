# BLACK HOLE — notas del proyecto

Juego incremental 2D vertical. Phaser 3 + TypeScript (Vite), tests con Vitest, móvil con Capacitor.
Referencia de comportamiento: `referencia/prototipo.html` (el prototipo original), `referencia/LEEME.txt`
(guía de tamaños de los assets) y `referencia/guia_objeto.png` (plantilla del círculo de choque).

## Cómo correrlo

```
npm install        # una vez
npm run dev        # abre el juego (también en el celular, en la misma red: usa la IP que muestra)
npm test           # tests de la lógica
npm run build      # versión final en dist/
```

## Reglas del juego (resumen)

- Vista desde arriba, pasto. Mundo de 720x960, sin gravedad. Hoyo fijo en (360, 330).
- Arrastras un objeto y al soltarlo sale con la velocidad del dedo de los últimos 90 ms (tope 2400 px/s).
  Se agarra el objeto más cercano si el dedo está a menos de `r + 22` px.
- Roce: `v *= max(0, 1 - 1.6*dt)`. Rebote 0.6 en bordes y entre objetos (masa = r²; el agarrado no se mueve por choques).
- Paso de tiempo máximo 1/30 s por cuadro (si el celular se traba, el juego va más lento en vez de atravesar paredes).
- Atracción dentro del radio: `fuerza * (1 - dist/radio) + fuerza * 0.15`.
- Captura: `dist < radio_hoyo - r*0.2` y velocidad < velocidad de captura. Caída en espiral de 0.6 s.
- Monedas por objeto: `round(valor * multiplicador)`. Combo si el siguiente cae antes de 2.5 s;
  desde el 3.º seguido aparece "¡Combo xN!".
- Objeto desbloqueado si `r <= radio_hoyo * 0.95`. Aparición con peso `1 + i*0.6`.
- Mejoras: costo `round(base * mult^nivel)`.

Todos los números están en `public/data/balance.json`.

## Decisiones

- **Pedido escrito para Godot, hecho en web.** Equivalencias:
  `.tres` → `balance.json` · Autoload `Progreso.gd` → `src/core/Progreso.ts` · `user://save.json` → `localStorage` ·
  GUT → Vitest · `pitch_scale` → `rate` de Phaser · canvas_items/expand → `Phaser.Scale.EXPAND` ·
  Compatibilidad → `Phaser.AUTO` · "emular toque con mouse" → Phaser ya trata mouse y dedo igual.
- **Phaser 3.90.0** fijo (ya existe Phaser 4, pero se pidió 3).
- **Física propia** en `src/logica/fisica.ts` (no Arcade/Matter): copia exacta del prototipo y se puede testear.
- **Corrección al prototipo:** al separar dos objetos que se pisan, el prototipo empujaba más al *grande*.
  Aquí se reparte con el inverso de la masa (el chico se mueve más). Entre objetos iguales da lo mismo.
- **Pantalla:** con EXPAND, si la pantalla es más alta o más ancha, sobra espacio color tierra alrededor del pasto.
- **Eventos:** la escena de juego avisa `captura` (empieza a caer) y `tragado` (terminó de caer).
  El HUD, las monedas y el sonido escuchan esos eventos en vez de meterse en la escena.
- **Pantalla = barra (84) + pasto (960) + tienda (162)** → tamaño base 720x1206, como el prototipo
  (marcador arriba, campo al medio, mejoras abajo). El pasto se centra en el espacio libre entre barra y tienda,
  así nunca queda tapado. Medidas en `src/core/pantalla.ts`.
- **Arrastre leído en cada cuadro:** la barra y la tienda atrapan los toques (para no agarrar objetos al comprar),
  así que el juego revisa en cada cuadro dónde está el dedo y si se levantó. Soltar encima de la tienda funciona.
- **Tienda:** tocar un botón muestra qué hace el siguiente nivel abajo y compra si alcanza. Borde dorado = alcanza.
- **Bus de eventos entre escenas** (`game.events`): `aviso` (texto, segundos), `combo` (número),
  `compra` (id, nivel) y `desbloqueo` (objetos nuevos).
- **Combo y monedas** usan el tiempo del juego (suma de dt), no el reloj: con velocidad x2 todo sigue cuadrando.
- **Halo, polvo y línea punteada** se dibujan por código (como en el prototipo); sus colores están en `balance.json` → `visual`.
- **Lógica pura** en `src/logica/` (sin Phaser) → se prueba en `tests/`.
- **Assets:** `public/assets/` con los mismos nombres de `LEEME.txt`. Se cargan por nombre, y los de objetos
  según los `id` de `balance.json`. Las escalas salen del radio y del tamaño real del PNG.
- Fuente "Lilita One" desde Google Fonts; sin internet se usa una de respaldo.

## Estado por pasos

- [x] 0. Base del proyecto
- [x] 1. Objeto arrastrable y lanzable (temporal: aparece uno de cada tipo abajo)
- [x] 2. Hoyo que atrae y traga (temporal: lo tragado reaparece abajo; niveles fijos en 0)
- [x] 3. Monedas y combo
- [x] 4. Tienda de mejoras
- [ ] 5. Aparición y desbloqueos
- [ ] 6. Sonidos
- [ ] 7. Guardado
- [ ] 8. Panel de debug, tests y Android
