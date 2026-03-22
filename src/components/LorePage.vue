<template>
  <main class="scroll">
    <div class="md-content" v-html="html"></div>
  </main>
</template>

<script setup>
import { marked } from 'marked'
import raw from '../data/lore.md?raw'

const html = marked.parse(raw)
</script>

<style scoped>
.scroll { flex: 1; overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; padding: 16px 16px 32px; }

.md-content :deep(h1) { font-family: var(--font-display); font-size: 20px; letter-spacing: .15em; color: var(--text); margin: 0 0 20px; }
.md-content :deep(h2) {
  font-family: var(--font-display); font-size: 14px; letter-spacing: .2em;
  text-transform: uppercase; color: var(--muted);
  padding-bottom: 6px; border-bottom: 1px solid var(--border);
  margin: 24px 0 10px;
}
.md-content :deep(h2:first-of-type) { margin-top: 0; }
.md-content :deep(p)  { font-size: 13px; color: var(--muted); line-height: 1.65; margin: 0 0 10px; }
.md-content :deep(ul),
.md-content :deep(ol) { font-size: 13px; color: var(--muted); line-height: 1.65; margin: 0 0 10px; padding-left: 20px; }
.md-content :deep(li) { margin-bottom: 4px; }
.md-content :deep(strong) { color: var(--text); font-weight: 600; }
.md-content :deep(em) { color: var(--dim); font-style: italic; }
.md-content :deep(blockquote) { border-left: 3px solid var(--border2); margin: 0 0 12px; padding: 4px 0 4px 14px; color: var(--dim); font-style: italic; font-size: 13px; }
</style>
