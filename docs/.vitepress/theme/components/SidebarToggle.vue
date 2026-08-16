<script setup lang="ts">
import { ref, onMounted } from 'vue'

const collapsed = ref(false)

onMounted(() => {
  const saved = localStorage.getItem('sidebar-collapsed')
  if (saved === 'true') {
    collapsed.value = true
    document.documentElement.classList.add('sidebar-collapsed')
  }
})

function toggle() {
  collapsed.value = !collapsed.value
  document.documentElement.classList.toggle('sidebar-collapsed', collapsed.value)
  localStorage.setItem('sidebar-collapsed', String(collapsed.value))
}
</script>

<template>
  <button
    class="sidebar-toggle"
    :class="{ collapsed }"
    @click="toggle"
    :title="collapsed ? '展开侧栏' : '收起侧栏'"
    aria-label="Toggle sidebar"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline v-if="!collapsed" points="15 18 9 12 15 6" />
      <polyline v-else points="9 18 15 12 9 6" />
    </svg>
  </button>
</template>

<style>
.sidebar-toggle {
  display: none;
}

/* ═══════════════ Button position ═══════════════ */
@media (min-width: 960px) {
  .sidebar-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    top: 50%;
    left: var(--vp-sidebar-width);
    transform: translateY(-50%);
    width: 18px;
    height: 38px;
    border: 1px solid var(--vp-c-divider);
    border-left: none;
    border-radius: 0 6px 6px 0;
    background: var(--vp-c-bg);
    color: var(--vp-c-text-3);
    cursor: pointer;
    z-index: 40;
    transition: left 0.25s ease, color 0.15s, background-color 0.15s;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
  }

  .sidebar-toggle:hover {
    color: var(--vp-c-brand);
    background: var(--vp-c-bg-soft);
  }

  .sidebar-toggle.collapsed {
    left: 0;
  }
}

@media (min-width: 1440px) {
  .sidebar-toggle:not(.collapsed) {
    left: calc((100vw - var(--vp-layout-max-width)) / 2 + var(--vp-sidebar-width));
  }
}

/* ═══════════════ Collapsed: hide sidebar panel ═══════════════ */
@media (min-width: 960px) {
  html.sidebar-collapsed .VPSidebar {
    transform: translateX(-100%);
    opacity: 0;
    pointer-events: none;
  }

  /* ── VPContent: remove sidebar padding ── */
  html.sidebar-collapsed .VPContent.has-sidebar {
    padding-left: 0;
  }

  /* ── VPDoc: widen content container (688→960, gaining 272px sidebar space) ── */
  html.sidebar-collapsed .VPDoc.has-aside .content-container {
    max-width: 960px;
  }

  /* ═══ NavBar: restore to non-sidebar appearance ═══ */

  /* 1. Restore background (has-sidebar makes it transparent) */
  html.sidebar-collapsed .VPNavBar.has-sidebar {
    background-color: var(--vp-nav-bg-color);
  }

  /* 2. Restore wrapper padding (has-sidebar sets it to 0) */
  html.sidebar-collapsed .VPNavBar.has-sidebar .wrapper {
    padding: 0 32px;
  }

  /* 3. Restore container max-width (has-sidebar sets 100%) */
  html.sidebar-collapsed .VPNavBar.has-sidebar .container {
    max-width: calc(var(--vp-layout-max-width) - 64px);
  }

  /* 4. Title: static flow (has-sidebar makes it absolute + sidebar-width) */
  html.sidebar-collapsed .VPNavBar.has-sidebar .title {
    position: static;
    top: auto;
    left: auto;
    z-index: auto;
    width: auto;
    padding: 0;
    height: var(--vp-nav-height);
    background-color: transparent;
  }

  /* 5. Content: remove sidebar padding (has-sidebar adds padding-left: sidebar) */
  html.sidebar-collapsed .VPNavBar.has-sidebar .content {
    padding-left: 0;
    padding-right: 0;
  }

  /* 6. Divider: remove sidebar padding */
  html.sidebar-collapsed .VPNavBar.has-sidebar .divider {
    padding-left: 0;
  }

  /* ── Smooth transitions ── */
  .VPContent.has-sidebar {
    transition: padding-left 0.25s ease;
  }

  .VPNavBar.has-sidebar,
  .VPNavBar.has-sidebar .wrapper,
  .VPNavBar.has-sidebar .container,
  .VPNavBar.has-sidebar .title,
  .VPNavBar.has-sidebar .content,
  .VPNavBar.has-sidebar .divider {
    transition: padding 0.25s ease, background-color 0.25s ease,
      max-width 0.25s ease, width 0.25s ease;
  }

  .VPDoc.has-aside .content-container {
    transition: max-width 0.25s ease;
  }
}

/* ═══════════════ Collapsed: ≥1440px centering ═══════════════ */
@media (min-width: 1440px) {
  /* VPContent: keep centering margin, remove sidebar width */
  html.sidebar-collapsed .VPContent.has-sidebar {
    padding-left: calc((100vw - var(--vp-layout-max-width)) / 2);
  }
}
</style>
