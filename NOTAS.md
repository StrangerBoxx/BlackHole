# BLACK HOLE — notas del proyecto

Juego incremental 2D vertical. Phaser 3 + TypeScript (Vite), tests con Vitest, móvil con Capacitor.
Referencia de comportamiento: el prototipo `black-hole/black-hole/index.html` y su `LEEME.txt`.

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
- **Pantalla:** con EXPAND la cámara centra el mundo de 720x960; en pantallas más altas sobra espacio arriba/abajo.
- **Lógica pura** en `src/logica/` (sin Phaser) → se prueba en `tests/`.
- **Assets:** `public/assets/` con los mismos nombres de `LEEME.txt`. Se cargan por nombre, y los de objetos
  según los `id` de `balance.json`. Las escalas salen del radio y del tamaño real del PNG.
- La carpeta `black-hole/black-hole/assets/` no se sube a git (es copia de `public/assets/`).
- Fuente "Lilita One" desde Google Fonts; sin internet se usa una de respaldo.

## Estado por pasos

- [x] 0. Base del proyecto
- [ ] 1. Objeto arrastrable y lanzable
- [ ] 2. Hoyo que atrae y traga
- [ ] 3. Monedas y combo
- [ ] 4. Tienda de mejoras
- [ ] 5. Aparición y desbloqueos
- [ ] 6. Sonidos
- [ ] 7. Guardado
- [ ] 8. Panel de debug, tests y Android
