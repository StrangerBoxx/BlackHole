# BLACK HOLE — notas del proyecto

Juego incremental 2D vertical, **estilo "laboratorio blanco"**: un agujero negro se abre en el piso de un
laboratorio y se traga lo que le lanzas. Phaser 3 + TypeScript (Vite), tests con Vitest, móvil con Capacitor (Android).
Referencia de comportamiento: `referencia/prototipo.html` (el prototipo original, todavía con el estilo de pasto),
`referencia/guia_objeto.png` (plantilla del círculo de choque). La guía de assets actual está más abajo.

## Estilo laboratorio

- **Colores:** fondo `#e3e8eb`, paneles de acero claro `#f4f6f8`, bordes `#c3ccd3`, texto `#22303b`,
  acentos **naranja `#f07a1c`** (chips, costos, "alcanza") y **cian `#1a9fd6`** (pestañas, halo, álbum).
  Todo en `src/core/estilo.ts`.
- **Fuentes** (incluidas en el juego, funcionan sin internet): **Rajdhani** para títulos y números,
  **IBM Plex Sans** para el texto.
- **Moneda = "chip de energía"** (solo en los textos; por dentro el código sigue diciendo `monedas`).
- **Efectos** (valores en `balance.json` → `visual`):
  - Piso que se retuerce y se hunde hacia el hoyo: shader WebGL (`src/efectos/DistorsionFX.ts`) aplicado solo al suelo.
    Sin WebGL (raro) el piso queda normal. `distorsion.radio` = veces el radio del hoyo.
  - Brillo naranja y cian que pulsa alrededor del hoyo (`brillo`).
  - Halo de atracción cian suave con borde punteado que gira despacio (`halo`).
  - Chispas naranjas y cian que caen en espiral; ráfaga + anillo de luz al tragar (`chispas`).
  - Capa de luz: cálida desde la izquierda, fría desde la derecha y viñeta suave (`luz`, `src/efectos/Luz.ts`).
  - Sombras de los objetos gris azulado, desplazadas abajo a la derecha (`sombra`).
  - Todo esto lo dibuja `src/entidades/Hoyo.ts` (salvo el shader y la luz).
- **Hoyo inclinado (en perspectiva):** `visual.inclinacion` (1 = desde arriba, 0.75 = un poco de lado) aplasta
  en vertical todo el hoyo (capas, halo, anillo de hambre, chispas, distorsión) y la órbita del dron.
  `visual.profundidad` = qué tan hondo se ve el pozo: se dibuja la pared interior de atrás.
  La atracción, la captura y la regla de aparición usan el mismo óvalo (`distanciaInclinada` en
  `src/logica/captura.ts`), así lo que se ve coincide con lo que pasa. Los objetos siguen vistos desde arriba.

## Salas y objetos

Mismos radios, valores y orden que el prototipo; solo cambian id, nombre e imagen.

| Sala (id) | Multiplica | Objetos (id), de chico a grande | Jefe |
|---|---|---|---|
| Laboratorio (`laboratorio`) | x1 | tornillo · matraz · casco · extintor · silla · caja_herramientas · servidor · robot ("Robot de limpieza") | tanque ("Tanque de nitrógeno") |
| Almacén (`almacen`) | x12 | tuerca · probeta · botiquin · bidon · carrito · barril · estante · montacargas | contenedor_carga |
| Reactor (`reactor`) | x150 | fusible · bateria · valvula · bobina · panel · generador · transformador · turbina | nucleo ("Núcleo del reactor") |

Especial: `bomba` se llama "Carga inestable". Antes eran Parque/Ciudad/Luna (piedra→tornillo, lata→matraz,
pelota→casco, cono→extintor, neumatico→silla, caja→caja_herramientas, basurero→servidor, auto→robot, etc.):
los guardados viejos se traducen solos al cargar (`migrarNombres` en `src/logica/guardado.ts`).

## Assets (nombres fijos)

| Archivo | Tamaño | Escala en el juego |
|---|---|---|
| `img/objetos/<id>.png` | 256x256, círculo de choque de 240 px | diámetro de choque = 2 × radio del objeto |
| `img/suelo.png`, `img/suelo_almacen.png`, `img/suelo_reactor.png` | 720x960, hoyo en (360, 330) | tal cual |
| `img/hoyo_borde.png` | 512x512 | radio del hoyo × 3.4 |
| `img/hoyo_remolino.png` | 512x512 (gira a 1.5 rad/s) | radio del hoyo × 3.8 |
| `img/hoyo_nucleo.png` | 256x256 | radio del hoyo × 2 |
| `img/moneda.png` (chip de energía) | 64x64 | 32 px en el "+N", 20-32 px en la interfaz |
| `img/materia.png`, `img/dron.png` | 64x64, 128x128 | ícono / 72 px |
| `sonidos/ambiente.wav` (loop 30 s), `tragar`, `moneda`, `comprar`, `desbloquear` | WAV | volumen en `balance.json` → `sonido` |

Las imágenes no llevan sombra: la pone el juego. Todo el arte actual es **provisorio** y lo generan:
`node herramientas/generar-arte.mjs` (crea solo los PNG que faltan; `--todas` rehace todo y **pisa tus dibujos**;
necesita Google Chrome) y `node herramientas/generar-ambiente.mjs` (rehace `ambiente.wav`).

**Ambiente** (`ambiente.wav`): envolvente y **sin ruido blanco**. Lleva un drone grave del agujero negro que respira
cada 15 s, un colchón armónico en La menor con novena (cada nota sube y baja a su ritmo), campanitas de cristal
suaves y un zumbido eléctrico muy bajo. Todo es tono puro; los 30 s empalman sin corte.

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
  - Agregar un objeto: una línea en `objetos`, su id en la lista de una zona (`zonas[].objetos`)
    y `public/assets/img/objetos/<id>.png`.
  - Agregar una zona: un bloque en `zonas` (8 objetos, jefe, suelo, multiplicador) y su `suelo_<algo>.png`.
  - Sonidos de eventos nuevos (`sonido.eventos`): reusan un WAV con otro tono y volumen.
- **Imágenes y sonidos** (`public/assets/`): reemplazar el archivo por otro **con el mismo nombre**. Las escalas
  se calculan solas desde el radio y el tamaño real del PNG. Si falta un WAV, ese sonido no suena (no se cae).
- **Arte provisorio:** ver "Assets" arriba.

## Carpetas

```
public/data/balance.json   todos los números
public/assets/             imágenes y sonidos (nombres fijos, ver "Assets")
src/main.ts                configuración de Phaser
src/escenas/               CargaScene (lee balance y assets) · InicioScene (fondo del menú de inicio)
                           JuegoScene (piso, hoyo, objetos) · PanelScene (Misiones/Álbum)
                           PestanaColapso (pestaña Colapso) · DebugScene (solo desarrollo)
src/entidades/             Hoyo · Objeto · Dron · Popup ("+N" y textos flotantes)
src/ui/                    interfaz (marcador, menú, configuración, avisos, modos) · inicio (pantalla de inicio)
                           · dock (mejoras) · burbuja (ayuda) · interfaz.css
                           · Boton (botón de los paneles de Phaser)
public/assets/ui/          íconos SVG de la interfaz (reemplazables)
src/efectos/               DistorsionFX (shader del piso) · Luz (capa de luz y viñeta)
src/core/                  Progreso (autoload) · Guardado · Sonido · Balance · Debug · pantalla · estilo · assets
src/logica/                lógica pura sin Phaser: fisica, lanzamiento, captura, mejoras, objetos, aparicion,
                           monedas, tiros, especiales, hambre, dron, offline, misiones, album, colapso,
                           economia, sonido, guardado, balance
herramientas/              generadores de arte y de sonido ambiente provisorios
tests/                     un archivo de tests por módulo de lógica
android/                   proyecto Android (Capacitor)
referencia/                prototipo y guías originales
```

## Reglas del juego (resumen)

- Vista desde arriba, piso del laboratorio. Mundo de 720x960, sin gravedad. Hoyo fijo en (360, 330).
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
  (40 intentos; si no hay lugar, ese turno no sale nada). Si el piso está lleno, se pierde el turno del reloj.
- Mejoras: costo `round(base * mult^nivel)`.

### Mecánicas agregadas (después del prototipo)

- **Chips** = valor × sala × Valor × álbum × Valor eterno × combo × tiros × especial (redondeado).
- **Combo multiplica:** x(1 + combo×0.25), tope x3. Mejora **Combo**: ventana 2.5 s + 0.3 s/nivel (máx 10).
- **Tiros especiales** (solo lanzados por el jugador, rapidez ≥ 200):
  Carambola (rebotó en pared u objeto; también el objeto golpeado por uno lanzado) x1.5 ·
  Desde lejos (soltado a ≥ 380 px) x1.5 · Directo (entra en ≤ 0.9 s sin tocar nada) x1.25. Se suman: 1 + Σbonus.
- **Especiales** (una tirada al aparecer): bomba 4% · dorado 4% (+Suerte dorada) · pesado 6% (solo r ≥ 20).
  Dorado x10. Pesado x4, peso x5 (choca más fuerte, lo atrae menos), **no se agarra**. Bomba: al caer empuja
  hacia el hoyo todo lo que está a < 460 px con impulso `700 × (1 - d/460) / peso`.
- **Hambre:** anillo alrededor del hoyo; se llena con el valor base de lo tragado. Meta `150 × 1.5^jefes`.
  Llena → aparece el **jefe** de la sala (r 72-78, valor 400). El jefe cae si su *centro* entra al hoyo.
- **Gravedad** (mejora): tirón constante hacia el hoyo en todo el piso, 18/nivel.
- **Dron** (mejora): cada `9 × 0.84^nivel` s (mín 1.2) vuela a un objeto agarrable y lo empuja con
  `v = distancia × 1.6 × 1.12` (llega lento y cae). Lo que empuja no cuenta como tiro especial.
- **Offline:** al abrir, si hay dron: (segundos / intervalo) × valor promedio × multiplicadores × 50%,
  máximo 2 h (+Hoyo nocturno), mínimo 1 min.
- **Misiones:** 3 activas de 9 plantillas (`misiones.plantillas`). Premio = 30 × premio × (dificultad+1) × multiplicadores.
- **Álbum:** por sala, 8 objetos + jefe. Completo → chips x1.1 para siempre (se acumula por sala).
- **Salas:** Laboratorio (x1) → Almacén (x12) → Reactor (x150). Mismos radios, otros objetos y suelo.
- **Colapso** (prestigio): requiere Tamaño al máximo. Da `floor(√(monedas de la vuelta / 400))` de materia
  oscura (mín 1), pasa a la sala siguiente (el Reactor se repite) y borra chips, mejoras, hambre, jefes y misiones.
  Se conservan álbum, total, materia oscura y permanentes.
- **Permanentes** (con materia oscura, costo `round(base × mult^nivel)`): Valor eterno (x1 + 0.5/nivel),
  Empujón inicial (150 chips/nivel al empezar sala), Combo largo (+0.5 s), Suerte dorada (+2% dorado),
  Dron de fábrica (empieza con Dron nivel N), Hoyo nocturno (+2 h offline).
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
- **Pantalla completa** (`src/core/pantalla.ts`): el juego mide 720 de ancho y su alto sale de la forma de la
  pantalla, entre 960 y 1600 (Scale.FIT). El mundo mide lo mismo que la pantalla: las paredes están en los
  bordes. Si el alto pasa de 960, el suelo se repite hacia abajo en filas de 80 px saltándose las primeras 80
  (`src/efectos/Suelo.ts`). En PC (pantalla ancha) queda 720x960 centrado con bandas grises. El hoyo sigue en
  (360, 330). Los objetos aparecen entre y=90 y alto−140 (lejos del marcador y del dock).
- **Arrastre leído en cada cuadro:** el juego revisa en cada cuadro dónde está el dedo y si se levantó,
  así soltar un objeto encima del dock también lo lanza.

### Pantalla de inicio

Al abrir el juego aparece el inicio: `InicioScene` dibuja de fondo el piso de baldosas blancas del laboratorio,
el agujero negro grande (40 % del alto, con distorsión, halo y chispas) y objetos del laboratorio que caen en
espiral. Encima, en HTML (`src/ui/inicio.ts`): el título BLACK / HOLE, el lema y tres botones:

- **Jugar** (naranja; dice "Continuar" si ya hay partida) → pasa a la escena de juego.
- **Logros** (con x/12) → hoja con los 12 logros, su trofeo, descripción y barra de avance.
- **Configuración** → Sonido sí/no y Reiniciar progreso (lo mismo que la tuerca del juego).

Dentro del juego, Configuración (tuerca) trae además **Menú principal** para volver al inicio.
La interfaz tiene dos modos (`modo-inicio` / `modo-juego` en `#ui`): en el inicio se esconden marcador y dock.

### Logros

12 metas en `balance.json` → `logros` (`src/logica/logros.ts`), por tipo: objetos tragados, mejor combo, jefes,
dorados, tiros especiales, colapsos, sala alcanzada y álbumes completos. Se desbloquean solos (se
revisan cada vez que cambia el progreso) con aviso "🏆 ¡Logro!" y sonido. No dan premio. Para los que no salen
del progreso normal se guardan récords de por vida (`records`: mejor combo, jefes, dorados, tiros); récords y
logros se conservan al colapsar.

### Menú estilo dock (interfaz en HTML encima del juego)

Está en HTML/CSS (`src/ui/`) porque el vidrio con desenfoque (`backdrop-filter`) no existe dentro del canvas.
La raíz `#ui` se alinea con el canvas y escala con su ancho (`--e` = ancho / 720); los botones miden al menos
44 px. Respeta la zona segura del celular (`env(safe-area-inset-*)`). Los contenedores dejan pasar los toques
al juego; solo los botones los atrapan. Mientras el panel de Misiones/Álbum/Colapso está abierto, se esconde.

- **Colores:** naranja `#f07a1c` (chips, costos, "alcanza"), cian `#1a9fd6` (íconos, acentos), texto `#1b252e`,
  gris `#64717c`, bordes `#c3ccd3`, vidrio = blanco 86 % con desenfoque. Títulos y números en Rajdhani 700,
  texto en IBM Plex Sans.
- **Marcador (arriba):** "BLACK HOLE" pequeño con letras espaciadas ("HOLE" cian) a la izquierda; a la derecha
  una pastilla de vidrio con el chip y la cantidad, un botón de **menú** (tres líneas) y la **tuerca** de
  Configuración.
- **Menú (desplegable):** Misiones (con "N por cobrar"), Álbum (x/9) y Colapso ("¡Listo!"). Tocar una opción
  abre su panel. El botón del menú lleva un puntito naranja si hay misión por cobrar o el colapso está listo.
- **Configuración (tuerca):** panelcito blanco con objetos tragados (y sala / materia oscura), Sonido sí/no y
  Reiniciar progreso (dos toques).
- Solo uno de los dos (menú o configuración) está abierto a la vez; ambos se cierran al tocar el campo.
- **Avisos** ("¡Combo x3!", "Nuevo objeto…"): arriba, debajo del marcador (y ≈ 160), lejos del dock.
- **Dock (abajo):** barra de vidrio separada de los bordes con Atracción, Fuerza, Tamaño, Aparición y Valor,
  más "Más", que abre una bandeja con Combo, Gravedad y Dron (8 mejoras no caben en una fila).
  Cada botón: ícono cian, nombre, costo naranja con chip y nivel ("Nv 3" / "Máx") en la esquina.
  - Se puede comprar → borde naranja con halo. No alcanza → 55 % de opacidad. Máximo → costo "—".
  - Un toque compra (animación de apretado a 0.94). Sin chips → burbuja "Te faltan N chips".
  - Mantener presionado (dedo) o pasar el mouse (PC) → burbuja "Atracción → Radio de atracción: 111 px",
    que se va sola en 2 s. Mantener presionado no compra.
  - Los estados se actualizan cuando cambia el progreso (no en cada cuadro).
- **Íconos:** `public/assets/ui/*.svg` (atraccion, fuerza, tamano, aparicion, valor, combo, gravedad, dron, mas,
  misiones, album, colapso, menu, configuracion, logros, jugar). Se pueden reemplazar por otros SVG con el mismo nombre.
- **No incluido:** "Probar mis dibujos" (se decidió no hacerlo).
- **Bus de eventos entre escenas** (`game.events`, lista en `src/core/estilo.ts`): `captura` (tipo),
  `tragado` (InfoTragado: tipo, monedas, especial, tiros, combo, jefe), `aviso` (texto, segundos), `combo`,
  `tiro`, `jefe`, `dron`, `mision`, `album`, `compra`, `desbloqueo`, `colapso`, `reinicio`.
  También `juegoListo` (avisos del comienzo) y `panel` (abierto/cerrado).
  La interfaz, el sonido y las misiones escuchan eso en vez de meterse en la escena.
- **Salas en los datos** (`zonas` en `balance.json`; en el código se llaman "zonas"): la bomba y los jefes
  están en `objetos` pero no en ninguna `zonas[].objetos`, así nunca salen como objetos normales.
- **Reiniciar / colapsar / cambiar de zona** vuelve a armar la escena de juego (`scene.restart`): así el suelo
  y todo lo de la zona quedan siempre bien.
- **Panel (Misiones · Álbum · Colapso):** escena encima de todo; pausa el juego mientras está abierta.
  Cada pestaña se registra con `registrarPestana` (Colapso vive en su propio archivo).
- **Combo y monedas** usan el tiempo del juego (suma de dt), no el reloj: con velocidad x2 todo sigue cuadrando.
- **Sonido** (`src/core/Sonido.ts`): "tragar" suena al *empezar* a caer (como el prototipo); "moneda" al terminar.
  Volumen general 0.85 y por archivo en `balance.json` → `sonido`. El ambiente arranca con el primer toque
  (los navegadores no dejan sonar antes). "Sonido: sí/no" en Configuración (tuerca); se recuerda en el dispositivo.
- **Guardado** (`src/core/Guardado.ts`): `localStorage["black-hole-save"]`, versión 3: monedas, total, niveles,
  zona, hambre, jefes, misiones, álbum, materia oscura, permanentes, monedas de la vuelta, colapsos y `ultimaVez`.
  Se guarda en cada cambio, al esconder la app y cada 30 s. Al cargar se arreglan datos rotos (niveles > máximo
  → máximo, misiones u objetos que no existen se descartan, etc.). Los guardados viejos (v1, v2) cargan bien
  y sus nombres de objetos se traducen a los del laboratorio.
  "Reiniciar progreso" (en Configuración) pide un segundo toque antes de borrar (como el prototipo).
- **Panel de debug** (`src/escenas/DebugScene.ts`), solo con `npm run dev`: se abre con **F1** o con **3 toques rápidos
  en la esquina superior izquierda** (sobre el título). Trae +1000 / +100 000 chips, subir/bajar cada mejora (gratis), sacar
  dorado / pesado / bomba, hambre llena, +10 materia oscura, sala siguiente ("Zona siguiente"), círculos de choque
  (rojo objetos, amarillo hoyo, celeste atracción), velocidad x2 (dos pasos de física por cuadro) y reiniciar.
  `npm run build` no lo incluye. En desarrollo también quedan `juego` y `progreso` en la consola del navegador.
- **Efectos por código** (halo, brillo, chispas, luz, línea punteada): colores en `balance.json` → `visual`.
- **Sin dibujos de respaldo en el juego:** si falta un PNG, Phaser muestra un cuadro vacío. Para recuperarlo,
  `node herramientas/generar-arte.mjs` vuelve a crear solo los que faltan.
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
publicar** en `capacitor.config.ts` y `android/app/build.gradle`; después ya no se puede), fondo gris claro.
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
- [x] 8. Panel de debug, tests y proyecto Android

Después (loop y más incremental):

- [x] Combo que multiplica + mejora Combo
- [x] Tiros especiales
- [x] Objetos especiales (dorado, pesado, bomba)
- [x] Hambre y jefes
- [x] Gravedad y Dron
- [x] Ganancia offline
- [x] Misiones y álbum
- [x] Zonas, colapso, materia oscura y permanentes

Estilo laboratorio (rama `estilo-laboratorio`):

- [x] Objetos y salas renombrados (+ traducción de guardados viejos)
- [x] Assets estilo laboratorio (generados) y remolino x3.8
- [x] Efectos: distorsión del piso, brillo, halo punteado, chispas y ráfaga, luz, sombras
- [x] Interfaz clara, Rajdhani + IBM Plex Sans, chips de energía
- [x] Ambiente con zumbido eléctrico

Ideas pendientes: arte definitivo (todo es provisorio), sonidos propios para eventos y para tragar/chips
(hoy son los del prototipo), más salas, ícono de la app, ajustar números de balance jugando.
No llegó la carpeta `referencia_laboratorio/`: el estilo se hizo desde la descripción (colores, fuentes, efectos).
