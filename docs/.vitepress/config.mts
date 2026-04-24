import { defineConfig } from 'vitepress'
import { fileURLToPath } from 'node:url'

import { createBlogSidebarGroups, loadBlogPostsFromFilesystem } from './blog-node'
import { groupPostsByTopic } from './blog-schema'

const docsDir = fileURLToPath(new URL('..', import.meta.url))
const blogPosts = loadBlogPostsFromFilesystem(docsDir)
const blogGroups = groupPostsByTopic(blogPosts)
const blogSidebar = createBlogSidebarGroups(blogGroups)

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'Ao Sun',
  description: 'Personal Homepage',
  base: '/',
  cleanUrls: true,
  markdown: {
    math: true
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    search: {
      provider: 'local'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/su1furicacid/su1furicacid.github.com' }
    ],
    nav: [
      { text: 'Home', link: '/' },
      { text: 'About', link: '/about' },
      { text: 'Publications', link: '/publications' },
      { text: 'Blog', link: '/blog/' }
    ],
    blogGroups,
    sidebar: {
      '/blog/': blogSidebar,
      '/': [
        {
          text: 'Home',
          items: [
            { text: 'About', link: '/about' },
            { text: 'Publications', link: '/publications' },
            { text: 'Blog', link: '/blog/' }
          ]
        }
      ]
    },
    docFooter: {
      prev: 'Previous page',
      next: 'Next page'
    },
    outline: {
      label: 'On this page'
    },
    returnToTopLabel: 'Back to top',
    sidebarMenuLabel: 'Menu'
  }
})
