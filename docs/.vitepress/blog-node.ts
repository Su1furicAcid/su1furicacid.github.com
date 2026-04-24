import fs from 'node:fs'
import path from 'node:path'

import type { BlogTopicGroup } from './blog-schema'
import { normalizeBlogPost, sortBlogPosts } from './blog-schema'

type SidebarItem = {
  text: string
  link?: string
  items?: SidebarItem[]
  collapsed?: boolean
}

export function loadBlogPostsFromFilesystem(docsDir: string) {
  const blogDir = path.join(docsDir, 'blog')
  if (!fs.existsSync(blogDir)) {
    return []
  }

  const markdownFiles = walkMarkdownFiles(blogDir)
  const posts = markdownFiles
    .filter((filePath) => path.relative(docsDir, filePath).replace(/\\/g, '/') !== 'blog/index.md')
    .map((filePath) => {
      const relativePath = path.relative(docsDir, filePath).replace(/\\/g, '/')
      const source = fs.readFileSync(filePath, 'utf-8')
      const frontmatter = parseFrontmatter(source)
      const url = `/${relativePath}`
        .replace(/(^|\/)index\.md$/, '$1')
        .replace(/\.md$/, '')

      return normalizeBlogPost({
        source: relativePath,
        url,
        frontmatter
      })
    })
    .filter((post): post is NonNullable<typeof post> => Boolean(post))

  return sortBlogPosts(posts)
}

export function createBlogSidebarGroups(topicGroups: BlogTopicGroup[]): SidebarItem[] {
  const groups = topicGroups.map((group) => ({
    text: group.topicLabel,
    collapsed: false,
    items: group.posts.map((post) => ({
      text: `${post.title} (${post.date})`,
      link: post.url
    }))
  }))

  return [
    {
      text: 'Blog',
      items: [
        { text: 'Blog Index', link: '/blog/' }
      ]
    },
    ...groups
  ]
}

function walkMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(absolutePath))
      continue
    }

    if (entry.isFile() && absolutePath.endsWith('.md')) {
      files.push(absolutePath)
    }
  }

  return files
}

function parseFrontmatter(source: string): Record<string, unknown> {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) {
    return {}
  }

  const lines = match[1].split(/\r?\n/)
  const data: Record<string, unknown> = {}

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const keyMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!keyMatch) {
      continue
    }

    const key = keyMatch[1]
    const rawValue = keyMatch[2]

    if (key === 'tags') {
      if (rawValue.trim().startsWith('[') && rawValue.trim().endsWith(']')) {
        const inlineValues = rawValue
          .trim()
          .slice(1, -1)
          .split(',')
          .map((tag) => stripQuotes(tag.trim()))
          .filter(Boolean)
        data.tags = inlineValues
        continue
      }

      const tags: string[] = []
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1]
        const tagMatch = nextLine.match(/^\s*-\s+(.+)$/)
        if (!tagMatch) {
          break
        }
        tags.push(stripQuotes(tagMatch[1].trim()))
        i += 1
      }
      data.tags = tags
      continue
    }

    data[key] = stripQuotes(rawValue.trim())
  }

  return data
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}
