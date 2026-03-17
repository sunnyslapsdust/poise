<template>
  <div class="toast-wrap">
    <TransitionGroup name="toast" tag="div" class="toast-list">
      <div v-for="t in store.toasts" :key="t.id" class="toast">
        {{ t.msg }}
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useBattleStore } from '../stores/battle'
const store = useBattleStore()
</script>

<style scoped>
.toast-wrap {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.toast {
  background: var(--surface2);
  border: 1px solid var(--border2);
  color: var(--text);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: .04em;
  padding: 8px 16px;
  border-radius: 20px;
  white-space: nowrap;
  box-shadow: 0 4px 20px rgba(0,0,0,.4);
}

.toast-enter-active { transition: opacity .15s, transform .15s; }
.toast-leave-active { transition: opacity .2s, transform .2s; }
.toast-enter-from  { opacity: 0; transform: translateY(8px); }
.toast-leave-to    { opacity: 0; transform: translateY(8px); }
</style>
