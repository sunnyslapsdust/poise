// src/stores/creator.js
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { UNITS, FACTIONS, BUILD_RULES, calcUnitStats } from '../data/units'

const LS_CUSTOM = 'poise-custom-units'
const LS_EDITS  = 'poise-unit-edits'

export const useCreatorStore = defineStore('creator', () => {

  const customUnits = ref(JSON.parse(localStorage.getItem(LS_CUSTOM) || '[]'))
  const unitEdits   = ref(JSON.parse(localStorage.getItem(LS_EDITS)  || '{}'))

  watch(customUnits, v => localStorage.setItem(LS_CUSTOM, JSON.stringify(v)), { deep: true })
  watch(unitEdits,   v => localStorage.setItem(LS_EDITS,  JSON.stringify(v)), { deep: true })

  // Apply block-derived stats to any unit that has _blocks
  function applyBlockStats(u) {
    if (!u._blocks) return u
    const stats   = calcUnitStats(u._blocks, u.abilities ?? [])
    const expLabel = BUILD_RULES.experience.find(e => e.id === u._blocks.experience)?.label
    const armEntry = BUILD_RULES.armour.find(a => a.id === u._blocks.armour)
    const autoTags = [expLabel].filter(Boolean)
    if (armEntry && armEntry.id !== 'unarmoured') autoTags.push(armEntry.label)
    if (stats.isWizard) autoTags.push('Spellcaster')
    return {
      ...u,
      mp:         stats.mp,
      pr:         stats.pr,
      mov:        stats.mov,
      dmg:        stats.dmg,
      weapon:     u.weapon ?? stats.weapon,   // custom name wins; fall back to block name
      wtype:      stats.wtype,
      isWizard:   stats.isWizard,
      spellSlots: stats.spellSlots,
      specials:   [...autoTags, ...(u.specials ?? [])],
    }
  }

  // Merged list: base units with any edits applied, then custom units
  // Stats for block-based units are always derived live from their _blocks
  const allUnits = computed(() => [
    ...UNITS.map(u => applyBlockStats({ ...u, ...(unitEdits.value[u.id] || {}) })),
    ...customUnits.value.map(applyBlockStats),
  ])

  function isBaseUnit(id)  { return UNITS.some(u => u.id === id) }
  function isModified(id)  { return isBaseUnit(id) && !!unitEdits.value[id] && Object.keys(unitEdits.value[id]).length > 0 }

  function saveUnit(unitDef) {
    if (isBaseUnit(unitDef.id)) {
      // Only store fields that differ from the base definition
      const base = UNITS.find(u => u.id === unitDef.id)
      const diff = {}
      for (const key of Object.keys(unitDef)) {
        if (JSON.stringify(unitDef[key]) !== JSON.stringify(base[key])) diff[key] = unitDef[key]
      }
      unitEdits.value = { ...unitEdits.value, [unitDef.id]: diff }
    } else {
      const idx = customUnits.value.findIndex(u => u.id === unitDef.id)
      if (idx !== -1) {
        const arr = [...customUnits.value]
        arr[idx] = { ...unitDef }
        customUnits.value = arr
      } else {
        customUnits.value = [...customUnits.value, { ...unitDef }]
      }
    }
  }

  function resetUnit(id) {
    const edits = { ...unitEdits.value }
    delete edits[id]
    unitEdits.value = edits
  }

  function deleteUnit(id) {
    customUnits.value = customUnits.value.filter(u => u.id !== id)
  }

  function duplicateUnit(unit) {
    const copy = {
      ...JSON.parse(JSON.stringify(unit)),
      id: 'custom-' + Date.now(),
      name: unit.name + ' (Copy)',
    }
    customUnits.value = [...customUnits.value, copy]
    return copy
  }

  function newUnit() {
    const blocks = { experience: 'greenhorn', armour: 'unarmoured', weapon: 'normal_weapon', spellSlots: 'none' }
    const stats  = calcUnitStats(blocks)
    return {
      id: 'custom-' + Date.now(),
      faction: Object.keys(FACTIONS)[0],
      name: 'New Unit',
      role: 'Unit',
      ...stats,
      specials: [],
      abilities: [],
      _blocks: blocks,
    }
  }

  function exportData() {
    return JSON.stringify({ edits: unitEdits.value, custom: customUnits.value }, null, 2)
  }

  function importData(jsonStr) {
    const data = JSON.parse(jsonStr)
    if (data.edits)  unitEdits.value   = data.edits
    if (data.custom) customUnits.value = data.custom
  }

  return {
    allUnits,
    isBaseUnit, isModified,
    saveUnit, resetUnit, deleteUnit, duplicateUnit, newUnit,
    exportData, importData,
  }
})
