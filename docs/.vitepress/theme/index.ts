import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Bilingual from './components/Bilingual.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('Bilingual', Bilingual)
  }
} satisfies Theme
