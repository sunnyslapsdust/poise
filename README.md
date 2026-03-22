# Poise

A mobile-friendly companion app for the Poise skirmish wargame. Manages units, tracks Poise (hit points), handles dice rolls, and runs spell casting during battles.

## Tabs

| Tab | Purpose |
|-----|---------|
| **Browse** | View all unit types organised by faction. Tap **+** to add a unit to the active battle. |
| **Battle** | Manage units in an active battle — track Current and Max Poise, roll dice, cast spells, apply boosts. |
| **Create** | Build custom units using building-block selections (experience, armour, weapon, spell slots) and assign abilities and items. |
| **Rules** | In-app rulebook. Edit `src/data/rules.js` to add your rules. |
| **Lore** | World lore and faction background. Edit `src/data/lore.js` to add your lore. |

## Unit Data

All unit definitions live in `src/data/units.json`. Key top-level keys:

- `factions` — faction definitions (id, label, colour)
- `units` — array of unit definitions
- `traits` — ability/trait definitions referenced by units
- `items` — item definitions; supports `type: "tome"` for tome items
- `tomeSpells` — spells granted exclusively by tomes
- `spells` — castable spells; use `restrictedTo: ["unitId"]` for innate spells
- `buildingBlocks` — stat lookup tables for experience, armour, weapon, and spell slot tiers

### Adding a unit

```json
{
  "id": "my_unit", "faction": "falcon",
  "name": "My Unit", "role": "Heavy Melee",
  "specials": [],
  "abilities": [],
  "_blocks": { "experience": "veteran", "armour": "heavy_armour", "weapon": "normal_weapon", "spellSlots": "none" }
}
```

### Randomised items

Use `randomFrom` instead of `itemId` to pick a random item when a unit enters battle:

```json
"items": [
  { "randomFrom": ["tome_soul_drain", "tome_darkness", "tome_hunger"] }
]
```

### Tome items

Define a tome in `items` with `"type": "tome"` and a `spellId` pointing to an entry in `tomeSpells`:

```json
"tome_soul_drain": { "name": "Tome of Soul Drain", "type": "tome", "spellId": "soul_drain" }
```

### Innate spells

Spells with `restrictedTo` are only visible to listed units and do not consume a spell slot:

```json
{ "id": "raise", "name": "Raise", ..., "restrictedTo": ["necromancer"] }
```

### Spell CP cost

Add `"cost": N` to any spell to override the default cost of 2 CP:

```json
{ "id": "bind", "name": "Bind", ..., "cost": 4 }
```

## Content Files

| File | Contents |
|------|----------|
| `src/data/units.json` | All game data — units, spells, items, traits, factions |
| `src/data/rules.md` | Rules tab content (standard Markdown) |
| `src/data/lore.md` | Lore tab content (standard Markdown) |

## Project Structure

```
src/
  App.vue                  # Root layout and tab routing
  main.js                  # Entry point
  style.css                # Global CSS variables (dark theme)
  components/
    UnitCard.vue           # Battle unit card (poise tracking, dice, spells)
    BrowseCard.vue         # Browse unit preview card
    UnitCreatorPage.vue    # Custom unit builder
    RulesPage.vue          # Rules tab renderer
    LorePage.vue           # Lore tab renderer
    ToastContainer.vue     # Toast notifications
  data/
    units.json             # All game data
    units.js               # Exports and stat calculation helpers
    rules.md               # Rules tab content
    lore.md                # Lore tab content
    names.js               # Fantasy name generator
  stores/
    battle.js              # Pinia store — battle state, spell slots, poise
    creator.js             # Pinia store — unit library, custom units
```

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build

```bash
npm run build
```

Output goes to `dist/` — deployable to any static host.
