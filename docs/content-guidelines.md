# Content Guidelines

## Pages and Directories

- English pages live directly under `docs/`.
- Blog posts are organized by topic, for example `blog/Program-Verification/`.
- Blog index and Blog sidebar are generated automatically from `docs/blog/**/*.md`.
- Do not manually edit blog links in `docs/blog/index.md` or VitePress sidebar config.

## Blog Frontmatter Convention

Each blog post must include:

```yaml
title: string
date: YYYY-MM-DD
summary: string
tags:
  - string
```

- `title` and `date` are required for build-time indexing.
- `summary` and `tags` are optional but recommended.

## Publications Convention

- Group entries by year in descending order.
- Each entry should include title, authors, venue, and links.
