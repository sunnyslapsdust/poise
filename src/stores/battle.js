// src/stores/battle.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dieForMP, poiseColor, SPELLS } from '../data/units'
import { generateSingleName } from '../data/names'

export const useBattleStore = defineStore('battle', () => {

  // ── Roster: instances added from Browse ────────────────────────────────
  // array of { iid, unitId }; persists when switching tabs
  const roster = ref([])
  let _uid = 0

  // ── Per-instance state (keyed by iid) ──────────────────────────────────
  const poise     = ref({})
  const names     = ref({})
  const collapsed = ref({})

  // ── Toasts ─────────────────────────────────────────────────────────────
  const toasts = ref([])
  let _toastId = 0
  function addToast(msg) {
    const id = ++_toastId
    toasts.value = [...toasts.value, { id, msg }]
    setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 2200)
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function getPoiseState(iid) { return poise.value[iid] }
  function getName(iid)       { return names.value[iid] }
  function getDie(iid)        { return dieForMP(poise.value[iid].cur) }
  function getPoiseColor(iid, factionColor) {
    const s = poise.value[iid]
    return poiseColor(s.cur, s.max, factionColor)
  }
  function getBarPct(iid) {
    const s = poise.value[iid]
    return s.max > 0 ? Math.round((s.cur / s.max) * 100) : 0
  }
  function getStatus(iid) {
    const s = poise.value[iid]
    if (s.max <= 0)  return 'ko'
    if (s.max === 1) return 'stunned'
    return null
  }

  // ── Actions ────────────────────────────────────────────────────────────

  // Accept the full unit object so custom units work without importing UNITS here
  function _emptySlots(count = 3) {
    return Array.from({ length: count }, () => ({ spellId: null, failed: false }))
  }

  function addUnit(unit) {
    const iid = unit.id + '-' + (++_uid)
    roster.value.push({ iid, unitId: unit.id })
    poise.value[iid] = {
      cur: unit.mp, max: unit.mp, origMax: unit.mp,
      ...(unit.isWizard ? {
        spellSlots: _emptySlots(unit.spellSlots ?? 3),
        concentrations: {},
        allowedSpellSchools: unit.spellSchools ?? null,
        grantedSpells: unit.grantedSpells ?? [],
      } : {}),
    }
    names.value[iid]     = generateSingleName(names.value)
    collapsed.value[iid] = false
    addToast(`${unit.name} added to battle`)
  }

  function removeUnit(iid) {
    const idx = roster.value.findIndex(r => r.iid === iid)
    if (idx === -1) return
    roster.value.splice(idx, 1)
    delete poise.value[iid]
    delete names.value[iid]
    delete collapsed.value[iid]
  }

  function toggleCollapsed(iid) {
    collapsed.value[iid] = !collapsed.value[iid]
  }

  function setMax(iid, value) {
    const s = poise.value[iid]
    s.max = Math.max(0, Math.min(s.origMax, value))
    s.cur = s.max
  }

  function setCur(iid, value) {
    const s = poise.value[iid]
    s.cur = Math.max(0, Math.min(s.max, value))
  }

  function resetUnit(iid) {
    const s = poise.value[iid]
    s.max = s.origMax
    s.cur = s.origMax
    if (s.spellSlots) { s.spellSlots = _emptySlots(); s.concentrations = {} }
  }

  // ── Spell actions ───────────────────────────────────────────────────────

  function getSpellSlots(iid) {
    return poise.value[iid]?.spellSlots ?? []
  }

  function canAttemptSpell(iid, spellId) {
    const s = poise.value[iid]
    if (!s?.spellSlots) return false
    const spell    = SPELLS.find(sp => sp.id === spellId)
    const unitId   = roster.value.find(r => r.iid === iid)?.unitId
    // Restricted spells: auto-granted to listed units, unavailable to all others
    if (spell?.restrictedTo) {
      if (!spell.restrictedTo.includes(unitId)) return false
    } else {
      // Non-restricted spells: check explicit grant or school filter
      const isGranted = s.grantedSpells?.includes(spellId)
      if (!isGranted && s.allowedSpellSchools) {
        if (spell && !s.allowedSpellSchools.includes(spell.school)) return false
      }
    }
    if (s.spellSlots.some(sl => sl.spellId === spellId)) return true
    return s.spellSlots.filter(sl => sl.spellId !== null).length < s.spellSlots.length
  }

  function getConcentration(iid, spellId) {
    return poise.value[iid]?.concentrations?.[spellId] ?? 0
  }

  function concentrate(iid, spellId) {
    const s = poise.value[iid]
    if (!s) return
    if (!s.concentrations) s.concentrations = {}
    s.concentrations[spellId] = (s.concentrations[spellId] ?? 0) + 1
  }

  // Returns { success, roll, effectiveTN }
  function attemptSpell(iid, spellId) {
    const s = poise.value[iid]
    const conc = s.concentrations?.[spellId] ?? 0
    const die  = dieForMP(s.cur)
    const roll  = Math.floor(Math.random() * die.sides) + 1
    const spell = SPELLS.find(sp => sp.id === spellId)
    const effectiveTN = Math.max(1, spell.target - conc)
    const success = roll >= effectiveTN

    const existingSlot = s.spellSlots.find(sl => sl.spellId === spellId)
    if (!existingSlot) {
      const emptySlot = s.spellSlots.find(sl => sl.spellId === null)
      if (emptySlot) { emptySlot.spellId = spellId; emptySlot.failed = !success }
    } else if (success) {
      existingSlot.failed = false
    }

    // Reset concentration for this spell after casting
    if (!s.concentrations) s.concentrations = {}
    s.concentrations[spellId] = 0

    setCur(iid, s.cur - 2)
    return { success, roll, effectiveTN }
  }

  function resetAll() {
    roster.value.forEach(r => resetUnit(r.iid))
  }

  return {
    roster, poise, names, collapsed, toasts,
    getPoiseState, getName, getDie, getPoiseColor, getBarPct, getStatus,
    addUnit, removeUnit, setMax, setCur, resetUnit, resetAll, toggleCollapsed,
    getSpellSlots, canAttemptSpell, getConcentration, concentrate, attemptSpell,
  }
})
