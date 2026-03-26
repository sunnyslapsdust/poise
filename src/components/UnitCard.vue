<template>
  <div class="card" :class="{ collapsed: !open }">
    <!-- Accent bar -->
    <div class="card-accent" :style="{ background: color }"></div>

    <!-- Status badge (stunned only; KO uses full overlay) -->
    <div v-if="status === 'stunned'" class="status-badge badge-stunned">STUNNED</div>

    <!-- KO overlay: full-card when collapsed (pointer-events:none so header still works),
         body-only when expanded (header physically above it) -->
    <div
      v-if="koOverlay"
      class="ko-overlay"
      :class="{ 'ko-full': !open }"
    >
      <span class="ko-label" :class="{ 'ko-label-sm': !open }">KO</span>
      <button class="ko-dismiss" @click.stop="koOverlay = false">×</button>
    </div>

    <!-- ── Header row (click to collapse/expand) ── -->
    <div class="card-row" @click="store.toggleCollapsed(iid)">
      <div class="row-left">
        <span class="row-unit-type">{{ unit.name }}</span>
        <div class="row-sub">
          <span
            v-if="!editingName"
            class="row-unit-name"
            @click.stop="startEditName"
            title="Click to rename"
          >{{ store.getName(iid) }}</span>
          <input
            v-else
            ref="nameInputRef"
            class="row-unit-name-input"
            v-model="nameInput"
            @blur="saveName"
            @keyup.enter="saveName"
            @keyup.esc="editingName = false"
            @click.stop
          />
        </div>
      </div>
      <div class="row-stats">
        <div class="rs">
          <div class="rs-frac">
            <span class="rs-val" :style="{ color: poiseCol }">{{ ps.cur }}</span>
            <span class="rs-sep">/</span>
            <span class="rs-max">{{ ps.max }}</span>
          </div>
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
      <div class="row-end">
        <span class="chevron">{{ open ? '▾' : '▸' }}</span>
        <button class="remove-btn" @click.stop="store.removeUnit(iid)" title="Remove">×</button>
      </div>
    </div>

    <!-- ── Expanded body (animated roll-up/down) ── -->
    <Transition
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @leave="onLeave"
    >
    <div v-if="open" class="card-body">

      <!-- Stat grid: Rec and Die are clickable actions -->
      <div class="stat-grid">
        <div class="sg">
          <div class="sg-frac">
            <span class="sg-val" :style="{ color: poiseCol }">{{ ps.cur }}</span>
            <span class="sg-sep">/</span>
            <span class="sg-max">{{ ps.max }}</span>
          </div>
          <span class="sg-lbl">Poise</span>
          <div class="mini-bar">
            <div class="mini-fill" :style="{ width: barPct + '%', background: poiseCol }"></div>
          </div>
        </div>
        <div class="sg clickable" @click="handleRecover">
          <span class="sg-val" :style="{ color }">+{{ unit.pr }}</span>
          <span class="sg-lbl">Rec ▶</span>
        </div>
        <div class="sg">
          <span class="sg-val">{{ unit.mov }}</span>
          <span class="sg-lbl">Move</span>
        </div>
        <div class="sg clickable" @click="handleRoll">
          <span class="sg-val" :style="{ color }">{{ diceDisplay }}</span>
          <span class="sg-lbl">{{ diceLbl }}</span>
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
        <div v-for="a in unit.abilities" :key="a.traitId ?? a.name" class="ab">
          <span class="ab-name">{{ resolveAbility(a).name }}. </span>{{ resolveAbility(a).desc }}
        </div>
      </div>

      <!-- Items -->
      <div v-if="resolvedItems.length" class="items">
        <template v-for="(it, i) in resolvedItems" :key="i">
          <!-- Tome -->
          <div v-if="resolveItem(it).type === 'tome'" class="item item-tome">
            <div class="tome-header">
              <span class="tome-icon">📖</span>
              <span class="tome-label">Tome</span>
              <span class="tome-spell-name">{{ resolveItem(it).spell.name }}</span>
            </div>
            <div class="tome-spell-desc">{{ resolveItem(it).spell.desc }}</div>
          </div>
          <!-- Regular item -->
          <div v-else class="item">
            <span class="item-icon">⚙</span>
            <span class="item-name">{{ resolveItem(it).name }}</span>
            <span class="item-desc">{{ resolveItem(it).desc }}</span>
          </div>
        </template>
      </div>

      <!-- ── Spell Panel (wizard only) ── -->
      <div v-if="unit.isWizard" class="spell-panel">

        <!-- Slot indicators -->
        <div class="spell-slots-row">
          <div
            v-for="spell in innateSpells" :key="spell.id"
            class="spell-slot-chip slot-innate"
          >{{ spell.name }}</div>
          <div
            v-for="(slot, i) in spellSlots" :key="i"
            class="spell-slot-chip"
            :class="{ 'slot-filled': slot.spellId && !slot.failed, 'slot-failed': slot.spellId && slot.failed, 'slot-empty': !slot.spellId }"
            :style="slot.spellId && !slot.failed ? { borderColor: color + '66', color } : {}"
          >{{ slot.spellId ? spellById[slot.spellId]?.name : '—' }}</div>
        </div>

        <!-- Cast panel (shown when a spell is selected) -->
        <div v-if="selectedSpell" class="cast-panel">
          <div class="cast-panel-hdr">
            <div class="cast-panel-title">
              <span class="cast-spell-name">{{ selectedSpell.name }}</span>
              <span class="cast-tn-badge">TN {{ selectedSpell.target }}</span>
              <span class="cast-cost-badge">{{ selectedSpell.cost ?? 2 }} CP</span>
            </div>
            <button class="cast-close-btn" @click="closeCastPanel">×</button>
          </div>
          <div class="cast-panel-body">
            <div class="cast-roll-area">
              <button class="cast-conc-btn" @click="doConcentrate" :disabled="spellRolling">
                Concentrate
              </button>
              <div class="cast-num-wrap">
                <span class="cast-big-num" :style="{ color: castNumColor }">{{ castDisplay }}</span>
                <span class="cast-sub-lbl">{{ castLbl }}</span>
              </div>
              <button class="cast-roll-btn" @click="rollSpell" :disabled="spellRolling || ps.cur < (selectedSpell.cost ?? 2)" :style="{ borderColor: color + '55', color }">
                Cast
              </button>
            </div>
            <div v-if="spellConcentration > 0" class="cast-conc-info">
              {{ spellConcentration }} turn{{ spellConcentration > 1 ? 's' : '' }} concentrated — TN reduced to {{ effectiveTN }}
            </div>
          </div>
        </div>

        <!-- Spell list -->
        <div class="spell-list">
          <div
            v-for="spell in availableSpells" :key="spell.id"
            class="spell-item"
            :class="spellItemClasses(spell)"
            @click="selectSpell(spell)"
          >
            <div class="spell-item-top">
              <span class="spell-item-name">{{ spell.name }}</span>
              <span v-if="spell.restrictedTo?.includes(unit.id)" class="spell-innate-tag">Innate</span>
              <span v-else class="spell-school-tag">{{ spell.school }}</span>
              <span class="spell-item-cost">{{ spell.cost ?? 2 }} CP</span>
              <span class="spell-item-tn">{{ spell.target }}</span>
            </div>
            <div class="spell-item-effect">{{ spell.effect }}</div>
          </div>
        </div>

      </div>

      <!-- Battle controls -->
      <div class="battle-ctrl">
        <div class="ctrl-row">
          <span class="ctrl-lbl">Boost</span>
          <button class="ctrl-btn" @click="decrementBoost">−</button>
          <span class="ctrl-val boost-val" :class="{ active: boost > 0 }">{{ boost }}</span>
          <button class="ctrl-btn" @click="incrementBoost">+</button>
          <span class="boost-hint" v-if="boost > 0">+{{ boost }} to roll</span>
        </div>
        <div class="ctrl-row">
          <span class="ctrl-lbl">Current</span>
          <button class="ctrl-btn" @click="store.setCur(iid, ps.cur - 1)">−</button>
          <span class="ctrl-val">{{ ps.cur }}</span>
          <button class="ctrl-btn" @click="store.setCur(iid, ps.cur + 1)">+</button>
        </div>
        <div class="ctrl-row">
          <span class="ctrl-lbl">Max</span>
          <button class="ctrl-btn" @click="store.setMax(iid, ps.max - 1)">−</button>
          <span class="ctrl-val">{{ ps.max }}</span>
          <button class="ctrl-btn" @click="store.setMax(iid, ps.max + 1)">+</button>
        </div>
        <div class="dmg-track-row">
          <span class="dmg-lbl">Life</span>
          <div class="dmg-track">
            <div
              v-for="i in ps.origMax" :key="i"
              class="dmg-pip"
              :class="{ lost: i > ps.max }"
              :style="{ background: i <= ps.max ? color : undefined }"
              @click="store.setMax(iid, i)"
            ></div>
          </div>
        </div>
      </div>

    </div>
    </Transition>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useBattleStore } from '../stores/battle'
import { FACTIONS, SPELLS, dieForMP, resolveAbility, resolveItem } from '../data/units'

const props = defineProps({ iid: String, unit: Object })
const store = useBattleStore()

const open     = computed(() => !store.collapsed[props.iid])
const color    = computed(() => FACTIONS[props.unit.faction].color)
const ps       = computed(() => store.getPoiseState(props.iid))
const die      = computed(() => store.getDie(props.iid))
const poiseCol = computed(() => store.getPoiseColor(props.iid, color.value))
const barPct   = computed(() => store.getBarPct(props.iid))
const status   = computed(() => store.getStatus(props.iid))

// KO overlay — shown when KO, dismissed by user until unit is KO'd again
const koOverlay = ref(status.value === 'ko')
watch(status, s => { if (s === 'ko') koOverlay.value = true })

// ── Inline name editing ───────────────────────────────────────────────────
const editingName  = ref(false)
const nameInput    = ref('')
const nameInputRef = ref(null)

function startEditName(e) {
  e.stopPropagation()
  nameInput.value   = store.getName(props.iid)
  editingName.value = true
  nextTick(() => nameInputRef.value?.select())
}
function saveName() {
  const trimmed = nameInput.value.trim()
  if (trimmed) store.setName(props.iid, trimmed)
  editingName.value = false
}

// ── Roll-up animation (height: auto → 0) ─────────────────────────────────
function onBeforeEnter(el) {
  el.style.height  = '0'
  el.style.opacity = '0'
  el.style.overflow = 'hidden'
}
function onEnter(el, done) {
  el.getBoundingClientRect() // force reflow before transition
  el.style.transition = 'height .22s ease, opacity .18s ease'
  el.style.height  = el.scrollHeight + 'px'
  el.style.opacity = '1'
  el.addEventListener('transitionend', () => {
    el.style.height   = 'auto'
    el.style.overflow = ''
    el.style.transition = ''
    done()
  }, { once: true })
}
function onAfterEnter(el) {
  el.style.height   = 'auto'
  el.style.overflow = ''
}
function onBeforeLeave(el) {
  el.style.height   = el.scrollHeight + 'px'
  el.style.overflow = 'hidden'
}
function onLeave(el, done) {
  el.getBoundingClientRect()
  el.style.transition = 'height .2s ease, opacity .15s ease'
  el.style.height  = '0'
  el.style.opacity = '0'
  el.addEventListener('transitionend', done, { once: true })
}

// Recovery: restore current poise by unit's recovery value
function handleRecover() {
  store.setCur(props.iid, ps.value.cur + props.unit.pr)
}

// Boost: spending current poise to add to the die roll
const boost = ref(0)
function incrementBoost() {
  if (ps.value.cur < 2) return
  boost.value++
  store.setCur(props.iid, ps.value.cur - 2)
}
function decrementBoost() {
  if (boost.value <= 0) return
  boost.value--
  store.setCur(props.iid, ps.value.cur + 2)
}

// Dice roller: drop current by 2, add boost to result, reset boost
const rolling      = ref(false)
const rawRoll      = ref(null)   // the actual die face value
const boostApplied = ref(0)      // boost that was added to this roll
const activeDie    = ref(null)   // die captured at roll-time, drives label during animation

// diceDisplay depends only on rawRoll + boostApplied (NOT rolling)
// so both are set atomically in the final frame — no two-step render
const diceDisplay = computed(() => {
  if (rawRoll.value === null) return die.value.label
  if (boostApplied.value > 0) return rawRoll.value + boostApplied.value
  return rawRoll.value
})
const diceLbl = computed(() => {
  if (rolling.value) return activeDie.value?.label ?? die.value.label
  if (rawRoll.value !== null && boostApplied.value > 0)
    return `${rawRoll.value} + ${boostApplied.value}`
  return 'Die ▶'
})

function handleRoll() {
  if (rolling.value) return
  const savedBoost = boost.value
  const rollDie = dieForMP(ps.value.cur + savedBoost * 2)  // reconstruct pre-boost CP
  activeDie.value = rollDie
  boost.value = 0
  boostApplied.value = 0   // keep 0 during animation so raw values show
  store.setCur(props.iid, ps.value.cur - (props.unit.attackCost ?? 2))
  rolling.value = true
  rawRoll.value = null
  let n = 0
  const iv = setInterval(() => {
    rawRoll.value = Math.floor(Math.random() * rollDie.sides) + 1
    if (++n >= 3) {
      clearInterval(iv)
      boostApplied.value = savedBoost  // set in same tick as rawRoll → atomic render
      rolling.value = false
    }
  }, 25)
}

// ── Spell panel (wizard only) ─────────────────────────────────────────────
const selectedSpell = ref(null)
const spellRolling  = ref(false)
const spellRawRoll  = ref(null)
const spellResult   = ref(null)   // { success, roll, effectiveTN }

const resolvedItems     = computed(() => store.getItems(props.iid))
const spellSlots        = computed(() => store.getSpellSlots(props.iid))
const spellDie          = computed(() => dieForMP(ps.value.cur))
const spellById         = computed(() => Object.fromEntries(SPELLS.map(s => [s.id, s])))
const innateSpells      = computed(() =>
  SPELLS.filter(s => s.restrictedTo?.includes(props.unit.id))
)
const availableSpells   = computed(() => [
  ...innateSpells.value,
  ...SPELLS.filter(s => !s.restrictedTo),
])
const spellConcentration = computed(() =>
  selectedSpell.value ? store.getConcentration(props.iid, selectedSpell.value.id) : 0
)
const effectiveTN = computed(() =>
  selectedSpell.value ? Math.max(1, selectedSpell.value.target - spellConcentration.value) : 0
)

const castDisplay = computed(() => {
  if (spellRawRoll.value === null) return spellDie.value.label
  return spellRawRoll.value
})
const castLbl = computed(() => {
  if (!selectedSpell.value) return ''
  if (spellRolling.value || spellRawRoll.value === null) return `vs TN ${effectiveTN.value}`
  const r = spellResult.value
  if (!r) return `vs TN ${effectiveTN.value}`
  return `${r.roll} vs TN ${r.effectiveTN} — ${r.success ? 'SUCCESS' : 'FAIL'}`
})
const castNumColor = computed(() => {
  if (!spellResult.value) return color.value
  return spellResult.value.success ? color.value : '#ef4444'
})

function spellItemClasses(spell) {
  const inSlot  = spellSlots.value.find(sl => sl.spellId === spell.id)
  const isInnate = !!spell.restrictedTo?.includes(props.unit.id)
  return {
    'spell-slotted':     !!inSlot && !inSlot.failed,
    'spell-slot-failed': !!inSlot && inSlot.failed,
    'spell-selected':    selectedSpell.value?.id === spell.id,
    'spell-disabled':    !store.canAttemptSpell(props.iid, spell.id),
    'spell-innate':      isInnate,
  }
}

function selectSpell(spell) {
  if (!store.canAttemptSpell(props.iid, spell.id)) return
  if (selectedSpell.value?.id === spell.id) { closeCastPanel(); return }
  selectedSpell.value = spell
  spellRawRoll.value  = null
  spellResult.value   = null
}

function closeCastPanel() {
  selectedSpell.value = null
  spellRawRoll.value  = null
  spellResult.value   = null
}

function doConcentrate() {
  if (!selectedSpell.value) return
  store.concentrate(props.iid, selectedSpell.value.id)
  spellRawRoll.value = null
  spellResult.value  = null
}


function rollSpell() {
  if (spellRolling.value || !selectedSpell.value) return
  const castDie = spellDie.value  // capture before CP is deducted inside attemptSpell
  spellRolling.value = true
  spellRawRoll.value = null
  spellResult.value  = null
  let n = 0
  const iv = setInterval(() => {
    spellRawRoll.value = Math.floor(Math.random() * castDie.sides) + 1
    if (++n >= 3) {
      clearInterval(iv)
      const result = store.attemptSpell(props.iid, selectedSpell.value.id)
      spellRawRoll.value = result.roll
      spellResult.value  = result
      spellRolling.value = false
    }
  }, 25)
}
</script>

<style scoped>
.card {
  background: var(--surface);
  border-radius: 10px;
  border: 1px solid var(--border2);
  overflow: hidden;
  position: relative;
  user-select: none;
}
.card.collapsed { border-color: var(--border); }
.card-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }

/* Header row */
.card-row {
  display: flex; align-items: center; height: 62px;
  padding: 0 8px 0 16px; gap: 8px; cursor: pointer;
}
.card-row:hover { background: rgba(255,255,255,.02); }

.row-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.row-unit-type { font-family: var(--font-display); font-size: 18px; letter-spacing: .04em; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-sub { display: flex; align-items: center; gap: 5px; min-width: 0; }
.row-unit-role { font-size: 10px; color: var(--muted); letter-spacing: .04em; white-space: nowrap; flex-shrink: 0; }
.row-sub-sep { font-size: 9px; color: var(--dim); flex-shrink: 0; }
.row-unit-name { font-size: 10px; color: var(--dim); letter-spacing: .04em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; cursor: text; }
.row-unit-name-input { font-size: 10px; color: var(--dim); letter-spacing: .04em; background: transparent; border: none; border-bottom: 1px solid var(--dim); outline: none; min-width: 0; width: 8em; padding: 0; font-family: inherit; }

.row-stats { display: flex; gap: 5px; align-items: center; flex-shrink: 0; }
.rs { display: flex; flex-direction: column; align-items: center; min-width: 32px; }
.rs-frac { display: flex; align-items: baseline; gap: 1px; line-height: 1; }
.rs-val { font-family: var(--font-display); font-size: 16px; line-height: 1; }
.rs-sep { font-family: var(--font-display); font-size: 10px; color: var(--dim); }
.rs-max { font-family: var(--font-display); font-size: 10px; color: var(--muted); }
.rs-lbl { font-size: 8px; letter-spacing: .1em; color: var(--muted); text-transform: uppercase; margin-top: 1px; }
.rs-div { width: 1px; height: 22px; background: var(--border); flex-shrink: 0; }

.row-end { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.chevron { font-size: 11px; color: var(--dim); width: 14px; text-align: center; }
.remove-btn {
  width: 26px; height: 26px; border-radius: 5px;
  border: 1px solid transparent; background: transparent;
  color: var(--dim); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  transition: all .12s; line-height: 1;
}
.remove-btn:hover { border-color: rgba(239,68,68,.3); color: #ef4444; }

/* Expanded body */
.card-body { border-top: 1px solid var(--border); }

.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; padding: 10px 12px 0; }
.sg { background: var(--surface2); border-radius: 7px; padding: 7px 4px 6px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.sg.clickable { cursor: pointer; transition: background .12s; }
.sg.clickable:active { background: #2a304a; }
.sg-val { font-family: var(--font-display); font-size: 21px; line-height: 1; }
.sg-lbl { font-size: 8px; font-weight: 500; letter-spacing: .1em; color: var(--muted); text-transform: uppercase; }
.sg-frac { display: flex; align-items: baseline; gap: 1px; }
.sg-sep { font-family: var(--font-display); font-size: 12px; color: var(--dim); }
.sg-max { font-family: var(--font-display); font-size: 12px; color: var(--muted); }
.mini-bar { width: 100%; height: 3px; background: rgba(255,255,255,.08); border-radius: 2px; margin-top: 4px; overflow: hidden; }
.mini-fill { height: 100%; border-radius: 2px; transition: width .25s, background .25s; }

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

.items { padding: 0 12px 8px; display: flex; flex-direction: column; gap: 4px; }
.item { display: flex; align-items: baseline; gap: 5px; font-size: 11px; color: var(--muted); line-height: 1.5; padding: 5px 8px; background: rgba(255,255,255,.03); border-radius: 5px; }
.item-icon { font-size: 10px; color: var(--dim); flex-shrink: 0; }
.item-name { font-weight: 500; color: var(--text); flex-shrink: 0; }
.item-desc { color: var(--muted); }

.item-tome { flex-direction: column; align-items: stretch; gap: 5px; background: rgba(139,92,246,.07); border: 1px solid rgba(139,92,246,.2); }
.tome-header { display: flex; align-items: center; gap: 6px; }
.tome-icon { font-size: 12px; flex-shrink: 0; }
.tome-label { font-size: 9px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: #a78bfa; flex-shrink: 0; }
.tome-spell-name { font-size: 12px; font-weight: 600; color: #c4b5fd; }
.tome-spell-desc { font-size: 11px; color: var(--muted); line-height: 1.5; padding-left: 18px; }

/* Battle controls */
.battle-ctrl { padding: 10px 12px 12px; border-top: 1px solid var(--border); background: rgba(0,0,0,.2); }
.ctrl-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ctrl-lbl { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); min-width: 70px; font-weight: 500; }
.ctrl-btn { width: 48px; height: 48px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface2); color: var(--text); font-size: 26px; font-weight: 300; display: flex; align-items: center; justify-content: center; flex-shrink: 0; user-select: none; transition: background .1s; line-height: 1; }
.ctrl-btn:active { background: rgba(255,255,255,.15); }
.ctrl-val { font-family: var(--font-display); font-size: 28px; min-width: 36px; text-align: center; }
.boost-val { color: var(--dim); transition: color .12s; }
.boost-val.active { color: #a78bfa; }
.boost-hint { font-size: 10px; letter-spacing: .08em; color: #a78bfa; margin-left: 4px; }
.dmg-track-row { display: flex; align-items: center; gap: 8px; padding-top: 4px; }
.dmg-lbl { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); min-width: 70px; font-weight: 500; }
.dmg-track { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.dmg-pip { width: 18px; height: 18px; border-radius: 50%; cursor: pointer; border: 1px solid rgba(255,255,255,.1); transition: background .12s; }
.dmg-pip.lost { background: var(--dim) !important; border-color: transparent; }

/* ── Spell Panel ── */
.spell-panel { border-top: 1px solid var(--border); padding: 10px 12px 4px; }

.spell-slots-row { display: flex; gap: 6px; margin-bottom: 10px; }
.spell-slot-chip {
  flex: 1; padding: 5px 6px; border-radius: 6px; border: 1px solid var(--border);
  font-size: 10px; font-weight: 500; text-align: center; letter-spacing: .04em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.slot-empty  { color: var(--dim); }
.slot-failed { color: var(--dim); border-style: dashed; }
.slot-filled { background: rgba(255,255,255,.04); }
.slot-innate { border-color: rgba(251,191,36,.3); color: #fbbf24; background: rgba(251,191,36,.06); }

/* Cast panel */
.cast-panel { background: var(--surface2); border-radius: 8px; padding: 10px; margin-bottom: 10px; }
.cast-panel-hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.cast-panel-title { display: flex; align-items: center; gap: 8px; }
.cast-spell-name { font-family: var(--font-display); font-size: 15px; letter-spacing: .05em; }
.cast-tn-badge   { font-size: 10px; font-weight: 600; letter-spacing: .1em; padding: 2px 7px; border-radius: 4px; background: rgba(255,255,255,.06); color: var(--muted); }
.cast-cost-badge { font-size: 10px; font-weight: 600; letter-spacing: .1em; padding: 2px 7px; border-radius: 4px; background: rgba(255,255,255,.06); color: var(--dim); }
.cast-close-btn { width: 24px; height: 24px; border-radius: 5px; border: 1px solid transparent; background: transparent; color: var(--dim); font-size: 16px; display: flex; align-items: center; justify-content: center; }
.cast-close-btn:hover { color: var(--muted); }

.cast-panel-body { display: flex; flex-direction: column; gap: 8px; }
.cast-roll-area { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cast-num-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; }
.cast-big-num { font-family: var(--font-display); font-size: 38px; line-height: 1; transition: color .15s; }
.cast-sub-lbl { font-size: 9px; letter-spacing: .08em; color: var(--muted); text-align: center; margin-top: 2px; min-height: 12px; }
.cast-conc-btn, .cast-roll-btn { padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border); background: transparent; font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; transition: background .12s, color .12s; flex-shrink: 0; }
.cast-conc-btn { color: var(--muted); }
.cast-conc-btn:not(:disabled):hover { background: rgba(255,255,255,.05); color: var(--text); }
.cast-conc-btn:disabled { opacity: .4; }
.cast-roll-btn:disabled { opacity: .5; }
.cast-roll-btn:not(:disabled):hover { background: rgba(255,255,255,.05); }
.cast-conc-info { font-size: 10px; color: var(--muted); letter-spacing: .04em; text-align: center; padding: 2px 0 2px; }

/* Spell list */
.spell-list { display: flex; flex-direction: column; gap: 4px; padding-bottom: 8px; }
.spell-item {
  padding: 8px 10px; border-radius: 7px; border: 1px solid var(--border);
  background: rgba(255,255,255,.02); cursor: pointer; transition: border-color .12s, background .12s;
}
.spell-item:hover:not(.spell-disabled) { background: rgba(255,255,255,.05); }
.spell-item-top { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.spell-item-name { font-size: 12px; font-weight: 600; flex: 1; }
.spell-school-tag { font-size: 9px; font-weight: 500; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,.05); color: var(--muted); border: 1px solid rgba(255,255,255,.06); letter-spacing: .05em; }
.spell-item-cost { font-size: 9px; color: var(--dim); font-weight: 500; }
.spell-item-tn   { font-size: 10px; color: var(--dim); font-weight: 600; min-width: 20px; text-align: right; }
.spell-item-effect { font-size: 10px; color: var(--muted); line-height: 1.45; }

.spell-slotted     { border-color: v-bind("color + '55'"); background: v-bind("color + '10'"); }
.spell-slot-failed { border-color: rgba(255,255,255,.06); opacity: .6; }
.spell-selected    { border-color: v-bind("color + '88'"); background: v-bind("color + '15'"); }
.spell-disabled    { opacity: .35; cursor: default; }
.spell-innate      { border-color: rgba(251,191,36,.2); background: rgba(251,191,36,.04); }
.spell-innate-tag  { font-size: 9px; font-weight: 600; letter-spacing: .1em; padding: 2px 6px; border-radius: 4px; background: rgba(251,191,36,.1); color: #fbbf24; border: 1px solid rgba(251,191,36,.2); }

/* Status badge (stunned) */
.status-badge { position: absolute; top: 8px; right: 40px; font-size: 9px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; padding: 3px 7px; border-radius: 4px; }
.badge-stunned { background: rgba(245,158,11,.2); color: #f59e0b; border: 1px solid rgba(245,158,11,.3); }

/* KO overlay */
.ko-overlay {
  /* expanded: body-only, header physically above so it stays clickable */
  position: absolute; top: 62px; left: 0; right: 0; bottom: 0; z-index: 10;
  background: rgba(10, 8, 8, 0.85);
  border-radius: 0 0 10px 10px;
  display: flex; align-items: center; justify-content: center;
  border-top: 1px solid rgba(239,68,68,.25);
}
/* collapsed: cover full card, pointer-events:none lets header click through */
.ko-full {
  top: 0; border-radius: 10px; border-top: none;
  pointer-events: none;
}
.ko-full .ko-dismiss { pointer-events: auto; } /* dismiss still works */

.ko-label {
  font-family: var(--font-display); font-size: 52px; letter-spacing: .25em;
  color: #ef4444; opacity: .9; pointer-events: none; user-select: none;
}
.ko-label-sm { font-size: 26px; }
.ko-dismiss {
  position: absolute; top: 8px; right: 8px;
  width: 28px; height: 28px; border-radius: 6px;
  border: 1px solid rgba(239,68,68,.3); background: transparent;
  color: #ef4444; font-size: 18px; opacity: .7;
  display: flex; align-items: center; justify-content: center;
  transition: opacity .12s;
}
.ko-dismiss:hover { opacity: 1; }
</style>
