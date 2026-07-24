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

function isEmpty(group: BlogTopicGroup): boolean {
  return group.posts.length === 0 && group.subcategories.length === 0
}
</script>

# Blog

Posts are grouped by topic and sorted by publication date automatically. Topics may contain nested subcategories.

<div v-if="topicGroups.length === 0">
  No posts yet.
</div>

<template v-for="group in topicGroups" :key="group.topic">
  <section v-if="!isEmpty(group)">
    <h2>{{ group.topicLabel }}</h2>
    <ul v-if="group.posts.length > 0">
      <li v-for="post in group.posts" :key="post.url">
        <a :href="withBase(post.url)">{{ post.title }}</a>
        <span> ({{ post.date }})</span>
        <p v-if="post.summary">{{ post.summary }}</p>
      </li>
    </ul>
    <section v-for="sub in group.subcategories" :key="sub.subcategory">
      <h3>{{ sub.subcategoryLabel }}</h3>
      <ul>
        <li v-for="post in sub.posts" :key="post.url">
          <a :href="withBase(post.url)">{{ post.title }}</a>
          <span> ({{ post.date }})</span>
          <p v-if="post.summary">{{ post.summary }}</p>
        </li>
      </ul>
    </section>
  </section>
</template>
