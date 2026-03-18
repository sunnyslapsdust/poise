// src/stores/creator.js
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { UNITS, FACTIONS, calcBlockStats } from '../data/units'

const LS_CUSTOM = 'poise-custom-units'
const LS_EDITS  = 'poise-unit-edits'

export const useCreatorStore = defineStore('creator', () => {

  const customUnits = ref(JSON.parse(localStorage.getItem(LS_CUSTOM) || '[]'))
  const unitEdits   = ref(JSON.parse(localStorage.getItem(LS_EDITS)  || '{}'))

  watch(customUnits, v => localStorage.setItem(LS_CUSTOM, JSON.stringify(v)), { deep: true })
  watch(unitEdits,   v => localStorage.setItem(LS_EDITS,  JSON.stringify(v)), { deep: true })

  // Merged list: base units with any edits applied, then custom units
  const allUnits = computed(() => [
    ...UNITS.map(u => ({ ...u, ...(unitEdits.value[u.id] || {}) })),
    ...customUnits.value,
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
    const stats  = calcBlockStats(blocks)
    return {
      id: 'custom-' + Date.now(),
      faction: Object.keys(FACTIONS)[0],
      name: 'New Unit',
      role: 'Unit',
      ...stats,
      specials: ['Greenhorn', 'Unarmoured'],
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
