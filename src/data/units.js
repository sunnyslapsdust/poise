// src/data/units.js
import unitsData from './units.json'

export const FACTIONS      = unitsData.factions
export const UNITS         = unitsData.units
export const SPELLS        = unitsData.spells
export const TRAITS        = unitsData.traits
export const BUILD_RULES   = unitsData.buildingBlocks

// Calculate final stats from a { experience, armour, weapon, spellSlots? } block selection
export function calcBlockStats(blocks) {
  const base = BUILD_RULES.base
  const exp  = BUILD_RULES.experience.find(e => e.id === blocks.experience) ?? {}
  const arm  = BUILD_RULES.armour.find(a => a.id === blocks.armour) ?? {}
  const wpn  = BUILD_RULES.weapon.find(w => w.id === blocks.weapon) ?? {}
  const spl  = BUILD_RULES.spellSlots.find(s => s.id === (blocks.spellSlots ?? 'none')) ?? {}
  const slots = spl.slots ?? 0
  return {
    mp:         base.mp + (exp.mp ?? 0) + (arm.mp ?? 0) + (wpn.mp ?? 0) + (spl.mp ?? 0),
    pr:         Math.max(0, base.pr + (exp.pr ?? 0) + (arm.pr ?? 0) + (wpn.pr ?? 0)),
    mov:        Math.max(1, base.mov + (arm.mov ?? 0)),
    dmg:        base.dmg + (wpn.dmg ?? 0),
    weapon:     wpn.name  ?? 'Normal Weapon',
    wtype:      wpn.wtype ?? 'Melee',
    isWizard:   slots > 0 || undefined,
    spellSlots: slots > 0 ? slots : undefined,
  }
}

// Resolve an ability entry — traitId reference or inline { name, desc }
export function resolveAbility(entry) {
  if (entry.traitId) return TRAITS[entry.traitId] ?? { name: entry.traitId, desc: '(unknown trait)' }
  return entry
}

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
