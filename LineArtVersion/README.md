# FEED IT!

A black-and-white incremental game: drag objects, throw them into a spinning black hole, earn coins, buy upgrades.
Built with plain JavaScript + [Vite](https://vite.dev), packaged as an Android / iOS app with [Capacitor](https://capacitorjs.com).

## Quick start (in VS Code)

1. Install [Node.js](https://nodejs.org) 20 or newer (22 recommended).
2. Open this folder in VS Code (`File > Open Folder`). Accept the "recommended extensions" prompt.
3. Open the terminal (`Ctrl+\``) and run:

   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:5173. Edits to files in `src/` show up instantly.
5. To test on your phone while developing: connect it to the same Wi-Fi and open `http://<your-computer-ip>:5173`
   (the dev server prints the address as "Network").
6. To debug with breakpoints: start `npm run dev`, then press `F5` in VS Code (Chrome or Edge).

While the dev server runs, the game state is available in the browser console as `__feedit`
(for example `__feedit.S.coins = 100000` gives you coins, then buy something).

## Project structure

```
feed-it/
├─ index.html              The page: title, coin counter, play area, shop, camcorder frame, thumb drawing
├─ src/
│  ├─ main.js              Entry point: starts everything and runs the game loop
│  ├─ config.js            All the numbers: physics, object types, upgrades, costs   <- tweak the game here
│  ├─ world.js             The objects on the floor: spawning, coins, combos
│  ├─ physics.js           Pull of the hole, gravity, friction, bounces, collisions, swallowing
│  ├─ input.js             Touch / mouse: grab, drag, throw
│  ├─ camera.js            The tilted camera: floor <-> screen projection
│  ├─ render.js            All drawing: horizon, vortex, objects (from their images), shadows, popups
│  ├─ audio.js             Plays the sound files (one-shots + looping drone)
│  ├─ ui.js                HTML parts: shop buttons, toasts, thumb-tap animation, timecode
│  ├─ menu.js              Pause button and pause menu (Reanudar / Opciones with volume and language / Salir)
│  ├─ i18n.js              All the texts in Spanish and English
│  ├─ save.js              Saved progress (localStorage)
│  ├─ events.js            Tiny event bus (physics tells audio/UI what happened)
│  ├─ util.js              Small helpers
│  ├─ styles.css           All the CSS (camcorder frame, buttons, thumb)
│  └─ assets/              Every image and sound, picked up automatically by file name:
│     ├─ objects/          <type id>.svg for each object in TYPES (square, object centred, 80% of the width = its size)
│     ├─ icons/            <upgrade id>.svg for each shop button (only the shape is used; it is recoloured)
│     ├─ sounds/           coin, buy, unlock, swallow (.wav one-shots) and drone (.wav, seamless loop)
│     └─ images/           thumb.png (the tapping thumb)
├─ public/                 Files copied as they are (favicon)
├─ assets/                 icon-only.png + splash.png: the source for the app icon and splash screen
├─ (android/, ios/)        Created by you later with `npx cap add android` / `npx cap add ios` (not included)
├─ capacitor.config.json   App id, app name, web folder
├─ vite.config.js          Dev server and build settings
├─ jsconfig.json           Helps VS Code understand the code (autocomplete)
├─ package.json            Dependencies and the npm scripts below
└─ .vscode/                VS Code: format on save, debug launch, one-click tasks
```

## Things you will probably want to change

| What | Where |
| --- | --- |
| Costs, hole size, pull strength, coin values, new object types | `src/config.js` |
| Camera angle and perspective | `TILT` and `PERSP` in `src/config.js` |
| Throw feel (gravity, speed, bounce) | `GRAV`, `MAXT`, `BOUNCE`, `DAMP` in `src/config.js` |
| How objects look | `src/assets/objects/<id>.svg` (a PNG with the same name works too) |
| Shop icons | `src/assets/icons/<upgrade id>.svg` |
| Sounds | `src/assets/sounds/*.wav` (replace a file, keep its name); volumes and pitch in `src/audio.js` |
| The vortex look | `drawVortex()` in `src/render.js` |
| Camcorder frame (REC, corners, scanlines) | `#cam` in `index.html` and `src/styles.css` |
| The thumb drawing and animation | `src/assets/images/thumb.png` (`<img id="finger">` in `index.html`), `pressThumb()` in `src/ui.js` |
| Texts (Spanish and English) | `src/i18n.js` (every text, both languages; the player picks one in Opciones) |
| App name / id | `capacitor.config.json` (`appId` must be unique, for example `com.yourname.feedit`) |

To add a new object type: add a row to `TYPES` in `src/config.js` and its image as `src/assets/objects/<id>.svg` (or `.png`). For a standing figure (like the human) add `up: true`; its image can be any shape but must face right.

## Turn it into a phone app

Everything below uses the `npm` scripts in `package.json`.

### Android (works on Windows, macOS, Linux)

1. Install [Android Studio](https://developer.android.com/studio) (it brings the Android SDK).
2. Change `appId` in `capacitor.config.json` to your own (for example `com.yourname.feedit`).
3. Create the Android project once (this makes the `android/` folder; it is not included):

   ```bash
   npm run build
   npx cap add android
   ```

4. Run:

   ```bash
   npm run android
   ```

   This builds the game, copies it into the Android project and opens Android Studio.
5. In Android Studio press the green Run button with a phone connected (USB debugging on) or an emulator.

After the first time, run `npm run cap:sync` whenever you change the game, then press Run again.

For quick testing with live reload on a connected phone: `npx cap run android --livereload --external`.

### iOS (needs a Mac with Xcode)

1. Install Xcode and CocoaPods on the Mac.
2. Add the iOS project once (this creates the `ios/` folder; it is not included because it needs a Mac):

   ```bash
   npx cap add ios
   ```

3. Run `npm run ios`, then press Run in Xcode. To publish you need an Apple Developer account.

### App icon and splash screen

`assets/icon-only.png` (1024x1024) and `assets/splash.png` (2732x2732) are the sources. Replace them with your
own artwork and run:

```bash
npm run assets
```

It generates every icon and splash size for Android and iOS.

### Publishing

- **Google Play:** in Android Studio use `Build > Generate Signed App Bundle`, then upload the `.aab` in the
  Play Console (one-time developer fee).
- **App Store:** in Xcode use `Product > Archive`, then upload with the Organizer.
- Before publishing, set your own `appId`, bump the version in `android/app/build.gradle` (`versionCode`,
  `versionName`) and in Xcode, and add a privacy policy link if the stores ask for one.

## npm scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with instant reload |
| `npm run build` | Builds the game into `dist/` |
| `npm run preview` | Serves the built game locally to check it |
| `npm run cap:sync` | Build + copy into the Android / iOS projects |
| `npm run android` | Build + sync + open Android Studio |
| `npm run ios` | Build + sync + open Xcode |
| `npm run assets` | Generate icons and splash screens from `assets/` |

## Notes

- `package.json` lists dependencies as `"latest"`; `npm install` resolves them and writes `package-lock.json`. Commit that file so versions stay fixed.
- Progress is saved with `localStorage` (key `bh_save`), which also works inside the phone app.
- The game is portrait-only: the app locks the orientation at start-up (`src/main.js`).
- Sound starts after the first touch (phones do not allow sound before that).
