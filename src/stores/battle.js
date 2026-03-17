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
  function getDie(iid)        { return dieForMP(poise.value[iid].max) }
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
  function _emptySlots() {
    return [
      { spellId: null, failed: false },
      { spellId: null, failed: false },
      { spellId: null, failed: false },
    ]
  }

  function addUnit(unit) {
    const iid = unit.id + '-' + (++_uid)
    roster.value.push({ iid, unitId: unit.id })
    poise.value[iid] = {
      cur: unit.mp, max: unit.mp, origMax: unit.mp,
      ...(unit.isWizard ? { spellSlots: _emptySlots() } : {}),
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
    if (s.spellSlots) s.spellSlots = _emptySlots()
  }

  // ── Spell actions ───────────────────────────────────────────────────────

  function getSpellSlots(iid) {
    return poise.value[iid]?.spellSlots ?? []
  }

  function canAttemptSpell(iid, spellId) {
    const slots = poise.value[iid]?.spellSlots
    if (!slots) return false
    if (slots.some(sl => sl.spellId === spellId)) return true
    return slots.filter(sl => sl.spellId !== null).length < 3
  }

  // Returns { success, roll, total }
  function attemptSpell(iid, spellId, investedPoise) {
    const s = poise.value[iid]
    const actualInvested = Math.min(investedPoise, s.cur)
    const die  = dieForMP(s.cur)
    const roll  = Math.floor(Math.random() * die.sides) + 1
    const total = roll + actualInvested
    const spell = SPELLS.find(sp => sp.id === spellId)
    const success = total >= spell.target

    const existingSlot = s.spellSlots.find(sl => sl.spellId === spellId)
    if (!existingSlot) {
      const emptySlot = s.spellSlots.find(sl => sl.spellId === null)
      if (emptySlot) { emptySlot.spellId = spellId; emptySlot.failed = !success }
    } else if (success) {
      existingSlot.failed = false
    }

    setCur(iid, s.cur - actualInvested - 2)
    return { success, roll, total }
  }

  function resetAll() {
    roster.value.forEach(r => resetUnit(r.iid))
  }

  return {
    roster, poise, names, collapsed, toasts,
    getPoiseState, getName, getDie, getPoiseColor, getBarPct, getStatus,
    addUnit, removeUnit, setMax, setCur, resetUnit, resetAll, toggleCollapsed,
    getSpellSlots, canAttemptSpell, attemptSpell,
  }
})
