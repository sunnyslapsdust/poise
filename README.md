# Poise System — Web App

Built with Vite + Vue 3 + Pinia.

## Setup

```bash
npm install
npm run dev
npx vite
```

Open http://localhost:5173 in your browser.

## Adding pixel art

Place your 64×64 PNG files in `src/assets/`. Then in `src/data/units.js`,
change `art: null` to:

```js
art: new URL('../assets/paragon.png', import.meta.url).href
```

## Adding units

Edit `src/data/units.js` — add entries to the `UNITS` array. New units
automatically get a random name assigned on load.

## Project structure

```
src/
  App.vue              # Root layout, faction list
  main.js              # Entry point
  style.css            # Global CSS variables
  components/
    UnitCard.vue       # Card component (collapsed + expanded + battle)
  data/
    units.js           # Unit stats and game rules
    names.js           # Fantasy name generator
  stores/
    battle.js          # Pinia store — poise state, UI state
```

## Build for production

```bash
npm run build
```

Output goes to `dist/` — open `dist/index.html` directly in any browser,
or serve it with any static host.
