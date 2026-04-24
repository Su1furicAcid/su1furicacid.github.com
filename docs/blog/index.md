---
title: Blog
outline: false
---

<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

import type { BlogTopicGroup } from '../.vitepress/blog-schema'

const { theme } = useData()
const topicGroups = computed(
  () => (theme.value.blogGroups as BlogTopicGroup[] | undefined) ?? []
)
</script>

# Blog

Posts are grouped by topic and sorted by publication date automatically.

<div v-if="topicGroups.length === 0">
  No posts yet.
</div>

<section v-for="group in topicGroups" :key="group.topic">
  <h2>{{ group.topicLabel }}</h2>
  <ul>
    <li v-for="post in group.posts" :key="post.url">
      <a :href="withBase(post.url)">{{ post.title }}</a>
      <span> ({{ post.date }})</span>
      <p v-if="post.summary">{{ post.summary }}</p>
    </li>
  </ul>
</section>
