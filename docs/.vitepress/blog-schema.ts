import type { ContentData } from 'vitepress'

export interface BlogPost {
  title: string
  date: string
  summary?: string
  tags: string[]
  url: string
  topic: string
  topicLabel: string
}

export interface BlogTopicGroup {
  topic: string
  topicLabel: string
  posts: BlogPost[]
}

interface NormalizeInput {
  source: string
  url: string
  frontmatter: Record<string, unknown>
}

const BLOG_PREFIX = '/blog/'

export function formatTopicLabel(topic: string): string {
  return topic
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function normalizeBlogPost({ source, url, frontmatter }: NormalizeInput): BlogPost | null {
  const topic = extractTopicFromUrl(url)
  if (!topic) {
    return null
  }

  const title = requireString(frontmatter.title, 'title', source)
  const date = normalizeDate(frontmatter.date, source)
  const summary = normalizeOptionalString(frontmatter.summary)
  const tags = normalizeTags(frontmatter.tags)

  return {
    title,
    date,
    summary,
    tags,
    url,
    topic,
    topicLabel: formatTopicLabel(topic)
  }
}

export function normalizePostsFromContent(entries: ContentData[]): BlogPost[] {
  const posts: BlogPost[] = []
  for (const entry of entries) {
    const post = normalizeBlogPost({
      source: entry.url,
      url: entry.url,
      frontmatter: entry.frontmatter
    })
    if (post) {
      posts.push(post)
    }
  }
  return sortBlogPosts(posts)
}

export function sortBlogPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date)
    }
    return a.title.localeCompare(b.title)
  })
}

export function groupPostsByTopic(posts: BlogPost[]): BlogTopicGroup[] {
  const groupMap = new Map<string, BlogPost[]>()
  for (const post of posts) {
    const bucket = groupMap.get(post.topic)
    if (bucket) {
      bucket.push(post)
    } else {
      groupMap.set(post.topic, [post])
    }
  }

  return [...groupMap.entries()]
    .map(([topic, topicPosts]) => ({
      topic,
      topicLabel: formatTopicLabel(topic),
      posts: sortBlogPosts(topicPosts)
    }))
    .sort((a, b) => a.topicLabel.localeCompare(b.topicLabel))
}

function extractTopicFromUrl(url: string): string | null {
  if (!url.startsWith(BLOG_PREFIX)) {
    return null
  }

  const normalized = url.replace(/^\/+|\/+$/g, '')
  const segments = normalized.split('/')
  if (segments.length < 3) {
    return null
  }

  return segments[1]
}

function requireString(value: unknown, fieldName: string, source: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`[blog] Missing required frontmatter "${fieldName}" in ${source}`)
  }
  return value.trim()
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function normalizeDate(value: unknown, source: string): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value !== 'string') {
    throw new Error(`[blog] Missing required frontmatter "date" in ${source}`)
  }

  const date = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(
      `[blog] Invalid date "${value}" in ${source}. Use YYYY-MM-DD format.`
    )
  }
  return date
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}
