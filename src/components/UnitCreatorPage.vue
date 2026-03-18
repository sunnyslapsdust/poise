<template>

  <!-- ── LIST VIEW ─────────────────────────────────────────────────────── -->
  <div v-if="!draft" class="list-view">

    <!-- Data panel toggle -->
    <div class="data-bar">
      <span class="data-bar-lbl">Unit data</span>
      <button class="data-toggle-btn" @click="toggleDataPanel">
        {{ dataOpen ? 'Close' : 'JSON' }}
      </button>
    </div>

    <!-- JSON import/export panel -->
    <div v-if="dataOpen" class="data-panel">
      <textarea class="json-area" v-model="allJson" spellcheck="false"></textarea>
      <div v-if="dataError" class="json-error">{{ dataError }}</div>
      <div class="data-panel-actions">
        <button class="btn-apply" @click="handleImport">Import</button>
        <button class="btn-copy"  @click="handleCopy">Copy</button>
      </div>
    </div>

    <!-- Scrollable unit list -->
    <div class="list-scroll">

    <!-- Units by faction -->
    <div v-for="fid in listFactionIds" :key="fid" class="faction">
      <div class="faction-hdr">
        <div class="faction-dot" :style="{ background: FACTIONS[fid].color }"></div>
        <span class="faction-lbl">{{ FACTIONS[fid].label }}</span>
      </div>
      <div class="unit-list">
        <div
          v-for="unit in listByFaction[fid]"
          :key="unit.id"
          class="unit-row"
          @click="startEdit(unit)"
        >
          <div class="unit-row-accent" :style="{ background: FACTIONS[fid].color }"></div>
          <div class="unit-row-info">
            <span class="unit-row-name">{{ unit.name }}</span>
            <span class="unit-row-role">{{ unit.role }}</span>
          </div>
          <span
            class="unit-badge"
            :class="creator.isBaseUnit(unit.id)
              ? (creator.isModified(unit.id) ? 'badge-mod' : 'badge-base')
              : 'badge-custom'"
          >
            {{ creator.isBaseUnit(unit.id) ? (creator.isModified(unit.id) ? 'Modified' : 'Base') : 'Custom' }}
          </span>
        </div>
      </div>
    </div>

    <button class="new-unit-btn" @click="startNew">+ New Unit</button>

    </div><!-- end list-scroll -->
  </div>

  <!-- ── EDITOR VIEW ────────────────────────────────────────────────────── -->
  <div v-else class="editor-view">

    <!-- Sticky header -->
    <div class="editor-hdr">
      <button class="back-btn" @click="draft = null">←</button>
      <span class="editor-title">{{ draft.name || 'Untitled' }}</span>
      <div class="view-pills">
        <button :class="['vpill', { active: editorTab === 'form' }]" @click="editorTab = 'form'">Form</button>
        <button :class="['vpill', { active: editorTab === 'json' }]" @click="switchToJson">JSON</button>
      </div>
    </div>

    <!-- ── FORM TAB ── -->
    <div v-if="editorTab === 'form'" class="editor-scroll">

      <!-- Identity -->
      <div class="section">
        <div class="section-title">Identity</div>
        <label class="field">
          <span class="field-lbl">Name</span>
          <input class="field-input" v-model="draft.name" />
        </label>
        <label class="field">
          <span class="field-lbl">Role</span>
          <input class="field-input" v-model="draft.role" />
        </label>
        <div class="field">
          <span class="field-lbl">Faction</span>
          <div class="faction-pills">
            <button
              v-for="(f, fid) in FACTIONS" :key="fid"
              class="faction-pill"
              :class="{ active: draft.faction === fid }"
              :style="draft.faction === fid
                ? { background: f.color + '22', borderColor: f.color, color: f.color }
                : {}"
              @click="draft.faction = fid"
            >{{ f.label }}</button>
          </div>
        </div>
      </div>

      <!-- Stats: building blocks for custom units, free steppers for base units -->
      <div class="section">
        <div class="section-title">{{ draft._blocks ? 'Build' : 'Stats' }}</div>

        <!-- ── Building block selectors (custom units) ── -->
        <template v-if="draft._blocks">
          <div v-for="cat in BUILD_CATS" :key="cat.key" class="field">
            <span class="field-lbl">{{ cat.label }}</span>
            <div class="block-pills">
              <button
                v-for="opt in cat.options" :key="opt.id"
                class="block-pill"
                :class="{ active: draft._blocks[cat.key] === opt.id }"
                @click="selectBlock(cat.key, opt.id)"
              >{{ opt.label }}</button>
            </div>
          </div>
          <!-- Derived stat preview -->
          <div class="stat-preview">
            <div class="sp-item"><span class="sp-lbl">MP</span><span class="sp-val">{{ draft.mp }}</span></div>
            <div class="sp-item"><span class="sp-lbl">PR</span><span class="sp-val">{{ draft.pr }}</span></div>
            <div class="sp-item"><span class="sp-lbl">MOV</span><span class="sp-val">{{ draft.mov }}</span></div>
            <div class="sp-item"><span class="sp-lbl">DMG</span><span class="sp-val">{{ draft.dmg }}</span></div>
            <div class="sp-item sp-wide"><span class="sp-lbl">Weapon</span><span class="sp-val">{{ draft.weapon }} · {{ draft.wtype }}</span></div>
          </div>
          <!-- Weapon display name override -->
          <label class="field" style="margin-top:8px">
            <span class="field-lbl">Weapon display name</span>
            <input class="field-input" v-model="draft.weapon" />
          </label>
        </template>

        <!-- ── Free steppers (base units) ── -->
        <template v-else>
          <div class="stats-grid">
            <div v-for="s in STAT_DEFS" :key="s.key" class="stat-cell">
              <span class="stat-lbl">{{ s.label }}</span>
              <div class="stat-ctrl">
                <button class="stat-btn" @click="adjustStat(s.key, -1)">−</button>
                <span class="stat-val">{{ draft[s.key] }}</span>
                <button class="stat-btn" @click="adjustStat(s.key, 1)">+</button>
              </div>
            </div>
          </div>
          <!-- Weapon for base units -->
          <div class="section" style="margin-top:12px;margin-bottom:0">
            <label class="field">
              <span class="field-lbl">Weapon name</span>
              <input class="field-input" v-model="draft.weapon" />
            </label>
            <div class="field">
              <span class="field-lbl">Type</span>
              <div class="toggle-row">
                <button :class="['toggle-btn', { active: draft.wtype === 'Melee' }]"  @click="draft.wtype = 'Melee'">Melee</button>
                <button :class="['toggle-btn', { active: draft.wtype === 'Ranged' }]" @click="draft.wtype = 'Ranged'">Ranged</button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Tags / Specials (building blocks auto-populate experience & armour tags) -->
      <div class="section">
        <div class="section-title">Tags</div>
        <div class="chip-list">
          <div v-for="(tag, i) in draft.specials" :key="i" class="chip">
            <span>{{ tag }}</span>
            <button class="chip-rm" @click="draft.specials.splice(i, 1)">×</button>
          </div>
        </div>
        <div class="add-row">
          <input class="field-input" v-model="newTag" placeholder="New tag…" @keyup.enter="addTag" />
          <button class="btn-add-tag" @click="addTag">Add</button>
        </div>
      </div>

      <!-- Abilities -->
      <div class="section">
        <div class="section-title">Abilities</div>

        <!-- Existing abilities -->
        <div v-for="(ab, i) in draft.abilities" :key="i" class="ability-block">
          <!-- Library trait reference -->
          <template v-if="ab.traitId">
            <div class="ab-top-row">
              <span class="ab-trait-name">{{ resolveAbility(ab).name }}</span>
              <span class="ab-library-badge">Library</span>
              <button class="chip-rm" @click="draft.abilities.splice(i, 1)">×</button>
            </div>
            <div class="ab-trait-desc">{{ resolveAbility(ab).desc }}</div>
          </template>
          <!-- Inline custom ability -->
          <template v-else>
            <div class="ab-top-row">
              <input class="field-input" v-model="ab.name" placeholder="Ability name" />
              <button class="chip-rm" @click="draft.abilities.splice(i, 1)">×</button>
            </div>
            <textarea class="ab-desc" v-model="ab.desc" placeholder="Description…" rows="2"></textarea>
          </template>
        </div>

        <!-- Trait library picker -->
        <div class="trait-picker">
          <span class="trait-picker-lbl">From library</span>
          <div class="trait-chips">
            <button
              v-for="(trait, tid) in TRAITS" :key="tid"
              class="trait-chip"
              :class="{ 'trait-added': draft.abilities.some(a => a.traitId === tid) }"
              @click="addTrait(tid)"
            >{{ trait.name }}</button>
          </div>
        </div>

        <button class="btn-add-ability" @click="draft.abilities.push({ name: '', desc: '' })">+ Custom ability</button>
      </div>

      <!-- Action bar -->
      <div class="action-bar">
        <button class="btn-save" @click="handleSave">Save</button>
        <button class="btn-dup"  @click="handleDuplicate">Duplicate</button>
        <button
          v-if="creator.isBaseUnit(draft.id) && creator.isModified(draft.id)"
          class="btn-reset"
          @click="handleReset"
        >Reset to Default</button>
        <button
          v-if="!creator.isBaseUnit(draft.id)"
          class="btn-delete"
          @click="handleDelete"
        >Delete</button>
      </div>

    </div><!-- end form tab -->

    <!-- ── JSON TAB ── -->
    <div v-else class="editor-scroll">
      <p class="json-hint">Edit JSON and tap Apply — fields update immediately.</p>
      <textarea class="json-area" v-model="jsonText" spellcheck="false"></textarea>
      <div v-if="jsonError" class="json-error">{{ jsonError }}</div>
      <button class="btn-apply" @click="applyJson">Apply</button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCreatorStore } from '../stores/creator'
import { FACTIONS, BUILD_RULES, calcBlockStats, TRAITS, resolveAbility } from '../data/units'

const creator = useCreatorStore()

// ── Stat definitions (base unit free-edit) ────────────────────────────────
const STAT_DEFS = [
  { key: 'mp',  label: 'Max Poise', min: 1, max: 20 },
  { key: 'pr',  label: 'Recovery',  min: 0, max: 10 },
  { key: 'mov', label: 'Move',      min: 1, max: 10 },
  { key: 'dmg', label: 'Damage',    min: 1, max: 5  },
]

// ── Building block categories ──────────────────────────────────────────────
const BUILD_CATS = [
  { key: 'experience', label: 'Experience',  options: BUILD_RULES.experience },
  { key: 'armour',     label: 'Armour',      options: BUILD_RULES.armour },
  { key: 'weapon',     label: 'Weapon',      options: BUILD_RULES.weapon },
  { key: 'spellSlots', label: 'Spell Slots', options: BUILD_RULES.spellSlots },
]

function selectBlock(catKey, optId) {
  if (!draft.value?._blocks) return
  draft.value._blocks[catKey] = optId
  const stats = calcBlockStats(draft.value._blocks)
  draft.value.mp         = stats.mp
  draft.value.pr         = stats.pr
  draft.value.mov        = stats.mov
  draft.value.dmg        = stats.dmg
  draft.value.weapon     = stats.weapon
  draft.value.wtype      = stats.wtype
  draft.value.isWizard   = stats.isWizard
  draft.value.spellSlots = stats.spellSlots
  // Sync experience, armour and spellcaster tag into specials
  const exp = BUILD_RULES.experience.find(e => e.id === draft.value._blocks.experience)
  const arm = BUILD_RULES.armour.find(a => a.id === draft.value._blocks.armour)
  const blockLabels = [exp?.label, arm?.label].filter(Boolean)
  if (stats.isWizard) blockLabels.push('Spellcaster')
  const prevBlockLabels = BUILD_RULES.experience.map(e => e.label)
    .concat(BUILD_RULES.armour.map(a => a.label))
    .concat(['Spellcaster'])
  const userSpecials = (draft.value.specials ?? []).filter(s => !prevBlockLabels.includes(s))
  draft.value.specials = [...blockLabels, ...userSpecials]
}

// ── List view ─────────────────────────────────────────────────────────────
const listFactionIds = computed(() =>
  Object.keys(FACTIONS).filter(fid => creator.allUnits.some(u => u.faction === fid))
)
const listByFaction = computed(() =>
  Object.fromEntries(listFactionIds.value.map(fid => [
    fid, creator.allUnits.filter(u => u.faction === fid)
  ]))
)

// ── JSON data panel ───────────────────────────────────────────────────────
const dataOpen  = ref(false)
const allJson   = ref('')
const dataError = ref('')

function toggleDataPanel() {
  if (!dataOpen.value) allJson.value = creator.exportData()
  dataError.value = ''
  dataOpen.value = !dataOpen.value
}
function handleImport() {
  try {
    creator.importData(allJson.value)
    dataError.value = ''
    dataOpen.value  = false
  } catch (e) {
    dataError.value = 'Invalid JSON: ' + e.message
  }
}
function handleCopy() {
  navigator.clipboard?.writeText(allJson.value)
}

// ── Editor view ───────────────────────────────────────────────────────────
const draft     = ref(null)
const editorTab = ref('form')
const jsonText  = ref('')
const jsonError = ref('')
const newTag    = ref('')

function startEdit(unit) {
  draft.value     = JSON.parse(JSON.stringify(unit))
  editorTab.value = 'form'
  jsonError.value = ''
}
function startNew() {
  draft.value     = creator.newUnit()
  editorTab.value = 'form'
  jsonError.value = ''
}

function adjustStat(key, delta) {
  const def = STAT_DEFS.find(s => s.key === key)
  draft.value[key] = Math.max(def.min, Math.min(def.max, draft.value[key] + delta))
}

function addTrait(traitId) {
  if (!draft.value) return
  if (draft.value.abilities.some(a => a.traitId === traitId)) return
  draft.value.abilities.push({ traitId })
}

function addTag() {
  const t = newTag.value.trim()
  if (t && !draft.value.specials.includes(t)) draft.value.specials.push(t)
  newTag.value = ''
}

function switchToJson() {
  jsonText.value  = JSON.stringify(draft.value, null, 2)
  jsonError.value = ''
  editorTab.value = 'json'
}
function applyJson() {
  try {
    draft.value     = JSON.parse(jsonText.value)
    jsonError.value = ''
    editorTab.value = 'form'
  } catch (e) {
    jsonError.value = 'Invalid JSON: ' + e.message
  }
}

function handleSave() {
  creator.saveUnit(draft.value)
  draft.value = null
}
function handleDuplicate() {
  draft.value = creator.duplicateUnit(draft.value)
}
function handleReset() {
  creator.resetUnit(draft.value.id)
  const refreshed = creator.allUnits.find(u => u.id === draft.value.id)
  draft.value = refreshed ? JSON.parse(JSON.stringify(refreshed)) : null
}
function handleDelete() {
  creator.deleteUnit(draft.value.id)
  draft.value = null
}
</script>

<style scoped>
/* ── Shared layout ─────────────────────────────────────────────────────── */
.list-view, .editor-view {
  display: flex; flex-direction: column; height: 100%;
}

/* ── List view ─────────────────────────────────────────────────────────── */
.data-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px 8px; border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.data-bar-lbl { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--dim); }
.data-toggle-btn {
  font-size: 10px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 5px; border: 1px solid var(--border);
  background: transparent; color: var(--muted); transition: all .12s;
}
.data-toggle-btn:hover { border-color: var(--border2); color: var(--text); }

.data-panel {
  padding: 10px 12px; border-bottom: 1px solid var(--border);
  background: var(--surface); flex-shrink: 0;
}
.data-panel-actions { display: flex; gap: 8px; margin-top: 8px; }

.list-scroll { flex: 1; overflow-y: auto; padding: 10px 12px 24px; }

.faction { margin-bottom: 6px; }
.faction-hdr { display: flex; align-items: center; gap: 8px; padding: 10px 0 8px; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
.faction-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.faction-lbl { font-family: var(--font-display); font-size: 13px; letter-spacing: .25em; color: var(--muted); }

.unit-list { display: flex; flex-direction: column; gap: 3px; }
.unit-row {
  display: flex; align-items: center; gap: 10px;
  background: var(--surface); border-radius: 8px; border: 1px solid var(--border);
  padding: 0 10px 0 0; height: 52px; overflow: hidden; cursor: pointer;
  transition: border-color .12s;
}
.unit-row:hover { border-color: var(--border2); }
.unit-row-accent { width: 3px; height: 100%; flex-shrink: 0; }
.unit-row-info { flex: 1; min-width: 0; }
.unit-row-name { display: block; font-family: var(--font-display); font-size: 16px; letter-spacing: .04em; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.unit-row-role { display: block; font-size: 10px; color: var(--muted); }

.unit-badge {
  font-size: 9px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
  padding: 3px 7px; border-radius: 4px; flex-shrink: 0;
}
.badge-base   { background: rgba(255,255,255,.05); color: var(--dim); border: 1px solid var(--border); }
.badge-mod    { background: rgba(245,158,11,.12); color: #f59e0b; border: 1px solid rgba(245,158,11,.25); }
.badge-custom { background: rgba(167,139,250,.12); color: #a78bfa; border: 1px solid rgba(167,139,250,.25); }

.new-unit-btn {
  margin-top: 12px; width: 100%; padding: 12px;
  border-radius: 8px; border: 1px dashed var(--border2);
  background: transparent; color: var(--muted);
  font-size: 11px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase;
  transition: all .12s;
}
.new-unit-btn:hover { border-color: #a78bfa; color: #a78bfa; }

/* ── Editor view ───────────────────────────────────────────────────────── */
.editor-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-bottom: 1px solid var(--border);
  background: var(--bg); flex-shrink: 0;
  position: sticky; top: 0; z-index: 5;
}
.back-btn {
  font-size: 18px; color: var(--muted); background: transparent;
  border: none; padding: 4px 6px; line-height: 1; border-radius: 5px;
}
.back-btn:hover { color: var(--text); }
.editor-title {
  flex: 1; font-family: var(--font-display); font-size: 18px;
  letter-spacing: .06em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.view-pills { display: flex; gap: 4px; flex-shrink: 0; }
.vpill {
  font-size: 10px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 5px; border: 1px solid var(--border);
  background: transparent; color: var(--muted); transition: all .12s;
}
.vpill.active { background: var(--surface2); color: var(--text); border-color: var(--border2); }

.editor-scroll { flex: 1; overflow-y: auto; padding: 12px 12px 32px; }

/* ── Form sections ──────────────────────────────────────────────────────── */
.section { margin-bottom: 16px; }
.section-title {
  font-size: 9px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase;
  color: var(--dim); margin-bottom: 8px; padding-bottom: 5px;
  border-bottom: 1px solid var(--border);
}

.field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
.field-lbl { font-size: 10px; letter-spacing: .06em; color: var(--muted); }
.field-input {
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 6px; padding: 8px 10px; color: var(--text); font-size: 13px;
  outline: none; transition: border-color .12s; font-family: inherit; width: 100%;
}
.field-input:focus { border-color: var(--border2); }

.faction-pills { display: flex; gap: 5px; flex-wrap: wrap; }
.faction-pill {
  font-size: 10px; font-weight: 500; padding: 5px 10px; border-radius: 5px;
  border: 1px solid var(--border); background: transparent; color: var(--muted);
  transition: all .12s;
}

/* Building block pills */
.block-pills { display: flex; flex-wrap: wrap; gap: 5px; }
.block-pill {
  font-size: 11px; font-weight: 500; padding: 6px 11px; border-radius: 6px;
  border: 1px solid var(--border); background: transparent; color: var(--muted);
  transition: all .12s; cursor: pointer;
}
.block-pill.active { background: var(--surface2); color: var(--text); border-color: var(--border2); }
.block-pill:hover:not(.active) { border-color: var(--border2); color: var(--text); }

/* Derived stat preview */
.stat-preview {
  display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px;
  padding: 10px; background: var(--surface2); border-radius: 8px;
}
.sp-item { display: flex; flex-direction: column; align-items: center; min-width: 44px; }
.sp-wide { min-width: unset; flex: 1; align-items: flex-start; flex-direction: row; gap: 8px; align-items: center; }
.sp-lbl { font-size: 8px; letter-spacing: .12em; text-transform: uppercase; color: var(--dim); }
.sp-val { font-family: var(--font-display); font-size: 20px; line-height: 1.1; }
.sp-wide .sp-val { font-size: 13px; font-family: inherit; color: var(--muted); }

/* Stats grid */
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.stat-cell { background: var(--surface2); border-radius: 8px; padding: 8px 10px; }
.stat-lbl { font-size: 9px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 6px; }
.stat-ctrl { display: flex; align-items: center; gap: 8px; }
.stat-btn {
  width: 34px; height: 34px; border-radius: 6px; border: 1px solid var(--border);
  background: var(--bg); color: var(--text); font-size: 20px; font-weight: 300;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: background .1s; line-height: 1;
}
.stat-btn:active { background: rgba(255,255,255,.12); }
.stat-val { font-family: var(--font-display); font-size: 22px; min-width: 32px; text-align: center; }

/* Weapon type toggle */
.toggle-row { display: flex; gap: 6px; }
.toggle-btn {
  flex: 1; padding: 7px; border-radius: 6px; border: 1px solid var(--border);
  background: transparent; color: var(--muted); font-size: 12px; font-weight: 500;
  transition: all .12s;
}
.toggle-btn.active { background: var(--surface2); color: var(--text); border-color: var(--border2); }

/* Tags / chips */
.chip-list { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.chip {
  display: flex; align-items: center; gap: 4px;
  background: rgba(255,255,255,.05); border: 1px solid var(--border);
  border-radius: 4px; padding: 3px 6px 3px 8px; font-size: 11px; color: var(--muted);
}
.chip-rm {
  background: transparent; border: none; color: var(--dim);
  font-size: 14px; line-height: 1; padding: 0 2px; cursor: pointer;
}
.chip-rm:hover { color: #ef4444; }
.add-row { display: flex; gap: 6px; }
.btn-add-tag {
  padding: 8px 14px; border-radius: 6px; border: 1px solid var(--border);
  background: transparent; color: var(--muted); font-size: 12px; font-weight: 500;
  white-space: nowrap; transition: all .12s; flex-shrink: 0;
}
.btn-add-tag:hover { border-color: var(--border2); color: var(--text); }

/* Trait library picker */
.trait-picker { margin-bottom: 10px; }
.trait-picker-lbl { font-size: 9px; letter-spacing: .12em; text-transform: uppercase; color: var(--dim); display: block; margin-bottom: 6px; }
.trait-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.trait-chip {
  font-size: 10px; font-weight: 500; padding: 4px 9px; border-radius: 4px;
  border: 1px solid var(--border); background: transparent; color: var(--muted);
  transition: all .12s; cursor: pointer;
}
.trait-chip:hover:not(.trait-added) { border-color: var(--border2); color: var(--text); }
.trait-added { background: rgba(167,139,250,.1); border-color: rgba(167,139,250,.35); color: #a78bfa; cursor: default; }

/* Abilities */
.ab-trait-name { font-size: 12px; font-weight: 600; flex: 1; }
.ab-library-badge { font-size: 9px; font-weight: 600; letter-spacing: .08em; padding: 2px 6px; border-radius: 3px; background: rgba(167,139,250,.1); color: #a78bfa; border: 1px solid rgba(167,139,250,.25); flex-shrink: 0; }
.ab-trait-desc { font-size: 11px; color: var(--dim); line-height: 1.45; padding: 4px 0 2px; }
.ability-block {
  background: var(--surface2); border-radius: 8px; padding: 8px 10px;
  margin-bottom: 8px; border: 1px solid var(--border);
}
.ab-top-row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
.ab-top-row .field-input { flex: 1; }
.ab-desc {
  width: 100%; background: var(--bg); border: 1px solid var(--border);
  border-radius: 5px; padding: 7px 8px; color: var(--text); font-size: 12px;
  font-family: inherit; resize: vertical; outline: none; transition: border-color .12s;
}
.ab-desc:focus { border-color: var(--border2); }
.btn-add-ability {
  width: 100%; padding: 9px; border-radius: 7px;
  border: 1px dashed var(--border); background: transparent;
  color: var(--dim); font-size: 11px; font-weight: 500; letter-spacing: .08em;
  transition: all .12s;
}
.btn-add-ability:hover { border-color: var(--border2); color: var(--muted); }

/* Action bar */
.action-bar { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--border); }
.action-bar button {
  flex: 1; padding: 10px; border-radius: 7px; font-size: 11px; font-weight: 500;
  letter-spacing: .08em; text-transform: uppercase; transition: all .12s;
  min-width: 80px;
}
.btn-save   { border: 1px solid rgba(167,139,250,.4); color: #a78bfa; background: rgba(167,139,250,.08); }
.btn-save:hover { background: rgba(167,139,250,.15); }
.btn-dup    { border: 1px solid var(--border); color: var(--muted); background: transparent; }
.btn-dup:hover { border-color: var(--border2); color: var(--text); }
.btn-reset  { border: 1px solid rgba(245,158,11,.3); color: #f59e0b; background: rgba(245,158,11,.08); }
.btn-delete { border: 1px solid rgba(239,68,68,.3);  color: #ef4444; background: rgba(239,68,68,.08); }
.btn-delete:hover { background: rgba(239,68,68,.15); }

/* JSON tab */
.json-hint { font-size: 11px; color: var(--dim); margin-bottom: 8px; }
.json-area {
  width: 100%; min-height: 260px; background: var(--surface2);
  border: 1px solid var(--border); border-radius: 7px;
  padding: 10px; color: var(--text); font-family: monospace; font-size: 11px;
  resize: vertical; outline: none; transition: border-color .12s; line-height: 1.5;
}
.json-area:focus { border-color: var(--border2); }
.json-error { font-size: 11px; color: #ef4444; margin: 6px 0; }
.btn-apply {
  margin-top: 8px; padding: 10px 20px; border-radius: 7px;
  border: 1px solid rgba(167,139,250,.4); background: rgba(167,139,250,.08);
  color: #a78bfa; font-size: 11px; font-weight: 500; letter-spacing: .08em;
  text-transform: uppercase; transition: all .12s;
}
.btn-apply:hover { background: rgba(167,139,250,.15); }
.btn-copy {
  padding: 10px 20px; border-radius: 7px;
  border: 1px solid var(--border); background: transparent;
  color: var(--muted); font-size: 11px; font-weight: 500; letter-spacing: .08em;
  text-transform: uppercase; transition: all .12s;
}
.btn-copy:hover { border-color: var(--border2); color: var(--text); }
</style>
