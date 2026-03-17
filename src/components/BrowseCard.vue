<template>
  <div class="card" :class="{ active: open }">
    <!-- Accent bar -->
    <div class="card-accent" :style="{ background: color }"></div>

    <!-- ── Header row (click to expand) ── -->
    <div class="card-row" @click="open = !open">
      <div class="row-left">
        <span class="row-unit-type">{{ unit.name }}</span>
        <span class="row-unit-role">{{ unit.role }}</span>
      </div>
      <div class="row-stats">
        <div class="rs">
          <span class="rs-val">{{ unit.mp }}</span>
          <span class="rs-lbl">Poise</span>
        </div>
        <div class="rs-div"></div>
        <div class="rs">
          <span class="rs-val" :style="{ color }">+{{ unit.pr }}</span>
          <span class="rs-lbl">Rec</span>
        </div>
        <div class="rs-div"></div>
        <div class="rs">
          <span class="rs-val">{{ unit.mov }}</span>
          <span class="rs-lbl">Mov</span>
        </div>
        <div class="rs-div"></div>
        <div class="rs">
          <span class="rs-val" :style="{ color }">{{ die.label }}</span>
          <span class="rs-lbl">Die</span>
        </div>
      </div>
      <button class="add-btn" @click.stop="store.addUnit(unit)" title="Add to Battle">+</button>
    </div>

    <!-- ── Expanded body ── -->
    <div v-if="open" class="card-body">

      <!-- Stat grid -->
      <div class="stat-grid">
        <div class="sg">
          <span class="sg-val">{{ unit.mp }}</span>
          <span class="sg-lbl">Max Poise</span>
        </div>
        <div class="sg">
          <span class="sg-val" :style="{ color }">+{{ unit.pr }}</span>
          <span class="sg-lbl">Recovery</span>
        </div>
        <div class="sg">
          <span class="sg-val">{{ unit.mov }}</span>
          <span class="sg-lbl">Move</span>
        </div>
        <div class="sg">
          <span class="sg-val" :style="{ color }">{{ die.label }}</span>
          <span class="sg-lbl">Die</span>
        </div>
      </div>

      <!-- Weapon -->
      <div class="weapon-row">
        <div>
          <span class="weapon-name">{{ unit.weapon }}</span>
          <span class="weapon-type">{{ unit.wtype }}</span>
        </div>
        <div class="dmg-row">
          <div
            v-for="i in 3" :key="i"
            class="dmg-dot"
            :style="{ background: i <= unit.dmg ? color : 'var(--dim)' }"
          ></div>
          <span class="dmg-label">{{ unit.dmg }} DMG</span>
        </div>
      </div>

      <!-- Tags -->
      <div class="tag-row">
        <span v-for="t in unit.specials" :key="t" class="tag">{{ t }}</span>
      </div>

      <!-- Abilities -->
      <div v-if="unit.abilities.length" class="abilities">
        <div v-for="a in unit.abilities" :key="a.name" class="ab">
          <span class="ab-name">{{ a.name }}. </span>{{ a.desc }}
        </div>
      </div>

      <!-- Add to Battle footer -->
      <div class="add-row">
        <button class="add-battle-btn" @click.stop="store.addUnit(unit)" :style="{ borderColor: color + '44', color }">
          + Add to Battle
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBattleStore } from '../stores/battle'
import { FACTIONS, dieForMP } from '../data/units'

const props = defineProps({ unit: Object })
const store = useBattleStore()

const open  = ref(false)
const color = computed(() => FACTIONS[props.unit.faction].color)
const die   = computed(() => dieForMP(props.unit.mp))
</script>

<style scoped>
.card {
  background: var(--surface);
  border-radius: 10px;
  border: 1px solid var(--border);
  overflow: hidden;
  position: relative;
  transition: border-color .15s;
  user-select: none;
}
.card.active { border-color: var(--border2); }
.card-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }

/* Header row */
.card-row {
  display: flex; align-items: center; height: 58px;
  padding: 0 10px 0 16px; gap: 8px; cursor: pointer;
}
.row-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.row-unit-type { font-family: var(--font-display); font-size: 18px; letter-spacing: .04em; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-unit-role { font-size: 10px; color: var(--muted); letter-spacing: .04em; }

.row-stats { display: flex; gap: 5px; align-items: center; flex-shrink: 0; }
.rs { display: flex; flex-direction: column; align-items: center; min-width: 30px; }
.rs-val { font-family: var(--font-display); font-size: 16px; line-height: 1; }
.rs-lbl { font-size: 8px; letter-spacing: .1em; color: var(--muted); text-transform: uppercase; margin-top: 1px; }
.rs-div { width: 1px; height: 22px; background: var(--border); flex-shrink: 0; }

/* Add button */
.add-btn {
  width: 30px; height: 30px; border-radius: 6px;
  border: 1px solid var(--border); background: transparent;
  color: var(--dim); font-size: 20px; font-weight: 300;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: all .12s; line-height: 1;
}
.add-btn:hover { border-color: var(--border2); color: var(--text); }

/* Expanded body */
.card-body { border-top: 1px solid var(--border); }

.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; padding: 10px 12px 0; }
.sg { background: var(--surface2); border-radius: 7px; padding: 7px 4px 6px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.sg-val { font-family: var(--font-display); font-size: 21px; line-height: 1; }
.sg-lbl { font-size: 8px; font-weight: 500; letter-spacing: .1em; color: var(--muted); text-transform: uppercase; }

.weapon-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: var(--surface2); border-radius: 7px; margin: 6px 12px 0; }
.weapon-name { font-size: 12px; font-weight: 500; }
.weapon-type { font-size: 10px; color: var(--muted); margin-left: 4px; }
.dmg-row { display: flex; gap: 3px; align-items: center; }
.dmg-dot { width: 7px; height: 7px; border-radius: 50%; }
.dmg-label { font-size: 10px; color: var(--muted); margin-left: 5px; }

.tag-row { display: flex; flex-wrap: wrap; gap: 4px; padding: 6px 12px; }
.tag { font-size: 10px; font-weight: 500; padding: 3px 7px; border-radius: 4px; background: rgba(255,255,255,.05); color: var(--muted); border: 1px solid rgba(255,255,255,.06); }

.abilities { padding: 0 12px 8px; }
.ab { font-size: 11px; color: var(--muted); line-height: 1.5; padding: 5px 8px; background: rgba(255,255,255,.03); border-radius: 5px; margin-bottom: 4px; }
.ab-name { font-weight: 500; color: var(--text); }

.add-row { padding: 8px 12px 12px; }
.add-battle-btn {
  width: 100%; padding: 9px; border-radius: 7px;
  border: 1px solid var(--border); background: transparent;
  font-size: 11px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase;
  transition: background .12s; cursor: pointer;
}
.add-battle-btn:hover { background: rgba(255,255,255,.05); }
</style>
