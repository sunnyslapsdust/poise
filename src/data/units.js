// src/data/units.js
import unitsData from './units.json'

export const FACTIONS = unitsData.factions
export const UNITS    = unitsData.units
export const SPELLS   = unitsData.spells

// ── Game rules ────────────────────────────────────────────────────────────

export function dieForMP(mp) {
  if (mp <= 5)  return { label: 'D4',  sides: 4  }
  if (mp <= 7)  return { label: 'D6',  sides: 6  }
  if (mp <= 9)  return { label: 'D8',  sides: 8  }
  if (mp <= 11) return { label: 'D10', sides: 10 }
  return               { label: 'D12', sides: 12 }
}

export function poiseColor(cur, max, factionColor) {
  if (cur <= 1)                    return '#ef4444'
  if (max > 0 && cur / max < 0.4) return '#f59e0b'
  return factionColor
}
