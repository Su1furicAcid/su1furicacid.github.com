<script setup lang="ts">
/**
 * Bilingual layout component for side-by-side English / Chinese content.
 *
 * Usage in markdown:
 *
 * <Bilingual>
 * <template #en>
 *
 * English paragraph.
 *
 * </template>
 * <template #zh>
 *
 * 中文段落。
 *
 * </template>
 * </Bilingual>
 */
</script>

<template>
  <div class="bilingual">
    <div class="bilingual-col bilingual-en">
      <div class="bilingual-label">EN</div>
      <div class="bilingual-content">
        <slot name="en" />
      </div>
    </div>
    <div class="bilingual-col bilingual-zh">
      <div class="bilingual-label">中</div>
      <div class="bilingual-content">
        <slot name="zh" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.bilingual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5rem;
  margin: 1.5rem 0;
  align-items: start;
  content-visibility: auto;
  contain-intrinsic-size: auto 150px;
}

.bilingual-col {
  min-width: 0;
  overflow-x: auto;
}

.bilingual-label {
  position: sticky;
  top: 0;
  z-index: 1;
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 0.15rem 0.5rem;
  margin-bottom: 0.75rem;
  border-radius: 3px;
}

.bilingual-en .bilingual-label {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}

.bilingual-zh .bilingual-label {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
}

/* Use a divider line between columns */
.bilingual-zh {
  border-left: 1px solid var(--vp-c-divider);
  padding-left: 2.5rem;
}

/* Highlighted text */
:deep(mark) {
  background: rgba(250, 204, 21, 0.25);
  padding: 0.05em 0.2em;
  border-radius: 2px;
}

/* Tighten paragraph spacing inside columns */
.bilingual-content :deep(p) {
  margin: 0.8rem 0;
  line-height: 1.7;
}

.bilingual-content :deep(p:first-child) {
  margin-top: 0;
}

.bilingual-content :deep(ul),
.bilingual-content :deep(ol) {
  margin: 0.6rem 0;
  padding-left: 1.25rem;
}

.bilingual-content :deep(li) {
  margin: 0.3rem 0;
  line-height: 1.65;
}

.bilingual-content :deep(strong) {
  font-weight: 600;
}

.bilingual-content :deep(a) {
  color: var(--vp-c-brand);
  text-decoration: none;
}

.bilingual-content :deep(a:hover) {
  text-decoration: underline;
}

.bilingual-content :deep(blockquote) {
  margin: 0.8rem 0;
  padding: 0.5rem 1rem;
  border-left: 3px solid var(--vp-c-divider);
  color: var(--vp-c-text-2);
}

/* Responsive: stack vertically on narrow screens */
@media (max-width: 968px) {
  .bilingual {
    grid-template-columns: 1fr;
    gap: 0;
    contain-intrinsic-size: auto 300px;
  }

  .bilingual-zh {
    border-left: none;
    border-top: 1px solid var(--vp-c-divider);
    padding-left: 0;
    padding-top: 1.5rem;
    margin-top: 1.5rem;
  }

  .bilingual-label {
    position: static;
  }
}
</style>
