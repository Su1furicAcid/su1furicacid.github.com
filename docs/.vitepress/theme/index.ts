import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import Bilingual from './components/Bilingual.vue'
import SidebarToggle from './components/SidebarToggle.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'layout-top': () => h(SidebarToggle)
    })
  },
  enhanceApp({ app }) {
    app.component('Bilingual', Bilingual)
  }
} satisfies Theme
