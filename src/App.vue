<template>
  <div class="layout">

    <!-- Top bar -->
    <header class="top-bar">
      <span class="app-title">Poise</span>
      <div class="mode-pills">
        <button class="mode-btn" :class="{ active: tab === 'browse' }"  @click="tab = 'browse'">Browse</button>
        <button class="mode-btn" :class="{ active: tab === 'battle' }"  @click="tab = 'battle'">Battle</button>
        <button class="mode-btn" :class="{ active: tab === 'create' }"  @click="tab = 'create'">Create</button>
      </div>
      <button v-if="tab === 'battle' && battle.roster.length" class="reset-btn" @click="battle.resetAll()">Reset</button>
      <div v-else class="reset-placeholder"></div>
    </header>

    <!-- ── Browse: unit type library ─────────────────────────────────────── -->
    <main v-if="tab === 'browse'" class="scroll">
      <div v-for="fid in browseFactionIds" :key="fid" class="faction">
        <div class="faction-hdr">
          <div class="faction-dot" :style="{ background: FACTIONS[fid].color }"></div>
          <span class="faction-lbl">{{ FACTIONS[fid].label }}</span>
          <span class="faction-count">{{ browseByFaction[fid].length }} types</span>
        </div>
        <div class="stack">
          <BrowseCard v-for="unit in browseByFaction[fid]" :key="unit.id" :unit="unit" />
        </div>
      </div>
    </main>

    <!-- ── Battle: active roster ──────────────────────────────────────────── -->
    <main v-else-if="tab === 'battle'" class="scroll">
      <div v-if="!battle.roster.length" class="empty">
        <p class="empty-title">No units in battle</p>
        <p class="empty-sub">Go to Browse and tap <strong>+</strong> to add units</p>
      </div>
      <template v-else>
        <div v-for="fid in battleFactionIds" :key="fid" class="faction">
          <div class="faction-hdr">
            <div class="faction-dot" :style="{ background: FACTIONS[fid].color }"></div>
            <span class="faction-lbl">{{ FACTIONS[fid].label }}</span>
            <span class="faction-count">{{ battleByFaction[fid].length }} units</span>
          </div>
          <div class="stack">
            <UnitCard
              v-for="entry in battleByFaction[fid]"
              :key="entry.iid"
              :iid="entry.iid"
              :unit="unitsById[entry.unitId]"
            />
          </div>
        </div>
      </template>
    </main>

    <!-- ── Create: unit creator ───────────────────────────────────────────── -->
    <div v-else class="creator-wrap">
      <UnitCreatorPage />
    </div>

    <ToastContainer />

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBattleStore }  from './stores/battle'
import { useCreatorStore } from './stores/creator'
import { FACTIONS }        from './data/units'
import BrowseCard       from './components/BrowseCard.vue'
import UnitCard         from './components/UnitCard.vue'
import ToastContainer   from './components/ToastContainer.vue'
import UnitCreatorPage  from './components/UnitCreatorPage.vue'

const battle  = useBattleStore()
const creator = useCreatorStore()
const tab     = ref('browse')

// All factions in display order
const ALL_FACTION_IDS = Object.keys(FACTIONS)

// Index of all units by id (reactive — includes custom & edited units)
const unitsById = computed(() =>
  Object.fromEntries(creator.allUnits.map(u => [u.id, u]))
)

// Browse: all unit types grouped by faction
const browseFactionIds = computed(() =>
  ALL_FACTION_IDS.filter(fid => creator.allUnits.some(u => u.faction === fid))
)
const browseByFaction = computed(() =>
  Object.fromEntries(browseFactionIds.value.map(fid => [
    fid, creator.allUnits.filter(u => u.faction === fid)
  ]))
)

// Battle: roster entries grouped by faction
const battleByFaction = computed(() =>
  Object.fromEntries(ALL_FACTION_IDS.map(fid => [
    fid,
    battle.roster.filter(r => unitsById.value[r.unitId]?.faction === fid)
  ]))
)
const battleFactionIds = computed(() =>
  ALL_FACTION_IDS.filter(fid => battleByFaction.value[fid].length > 0)
)
</script>

<style scoped>
.layout { height: 100%; display: flex; flex-direction: column; }

.top-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-bottom: 1px solid var(--border);
  background: var(--bg); flex-shrink: 0; gap: 8px;
}
.app-title { font-family: var(--font-display); font-size: 16px; letter-spacing: .2em; color: var(--muted); }
.mode-pills { display: flex; gap: 4px; }
.mode-btn {
  font-size: 11px; font-weight: 500; letter-spacing: .1em; text-transform: uppercase;
  padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border);
  background: transparent; color: var(--muted); transition: all .15s;
}
.mode-btn.active { background: var(--surface2); color: var(--text); border-color: var(--border2); }
.reset-btn {
  font-size: 10px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase;
  padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border);
  background: transparent; color: var(--dim); transition: all .15s;
}
.reset-btn:hover { color: var(--muted); border-color: var(--border2); }
.reset-placeholder { width: 52px; }

.scroll { flex: 1; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; padding: 10px 12px 24px; }

/* Creator gets its own flex container so UnitCreatorPage can manage scroll internally */
.creator-wrap { flex: 1; overflow: hidden; display: flex; flex-direction: column; padding: 0; }

.faction { margin-bottom: 6px; }
.faction-hdr { display: flex; align-items: center; gap: 8px; padding: 10px 4px 8px; border-bottom: 1px solid var(--border); margin-bottom: 5px; }
.faction-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.faction-lbl { font-family: var(--font-display); font-size: 13px; letter-spacing: .25em; color: var(--muted); }
.faction-count { font-size: 10px; color: var(--dim); margin-left: auto; }
.stack { display: flex; flex-direction: column; gap: 4px; }

.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60%; gap: 6px; }
.empty-title { font-family: var(--font-display); font-size: 20px; letter-spacing: .1em; color: var(--muted); }
.empty-sub { font-size: 12px; color: var(--dim); text-align: center; }
</style>
