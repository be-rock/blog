# PaperMod Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the Hugo blog from Blowfish to PaperMod with a custom home page showing a minimal profile intro + recent posts list.

**Architecture:** Replace the Blowfish theme submodule with PaperMod, consolidate multi-file config into a single `hugo.toml`, and add a custom `layouts/index.html` that renders profile info and recent posts on the same page.

**Tech Stack:** Hugo static site generator, PaperMod theme, GitHub Pages deployment

**Worktree:** `.worktrees/papermod-migration` (branch: `feature/papermod-migration`)

---

### Task 1: Remove Blowfish Submodule

**Files:**
- Modify: `.gitmodules`
- Remove: `themes/blowfish/`

**Step 1: Remove the Blowfish submodule**

```bash
cd /Users/brockb/code/git/blog/.worktrees/papermod-migration
git submodule deinit -f themes/blowfish
git rm -f themes/blowfish
rm -rf .git/modules/themes/blowfish
```

Note: In a worktree, `.git` is a file pointing to the main repo's `.git/worktrees/` directory. The submodule cache lives in the main repo's `.git/modules/`. Check where `.git` points before running `rm -rf`.

**Step 2: Verify removal**

```bash
cat .gitmodules  # Should be empty or not exist
ls themes/       # Should be empty
```

**Step 3: Commit**

```bash
git add -A
git commit -m "remove Blowfish theme submodule"
```

---

### Task 2: Add PaperMod Theme

**Files:**
- Create: `themes/PaperMod/` (submodule)
- Modify: `.gitmodules`

**Step 1: Add PaperMod as a git submodule**

```bash
cd /Users/brockb/code/git/blog/.worktrees/papermod-migration
git submodule add --depth=1 https://github.com/adnanh/hugo-PaperMod.git themes/PaperMod
```

**Step 2: Verify**

```bash
ls themes/PaperMod/layouts/  # Should contain _default, partials, etc.
cat .gitmodules               # Should reference PaperMod
```

**Step 3: Commit**

```bash
git add -A
git commit -m "add PaperMod theme as submodule"
```

---

### Task 3: Create New Config

**Files:**
- Create: `hugo.toml` (project root)
- Remove: `config/_default/hugo.toml`
- Remove: `config/_default/params.toml`
- Remove: `config/_default/menus.en.toml`
- Remove: `config/_default/languages.en.toml`
- Remove: `config/` directory

This replaces 4 config files with 1. The new config uses PaperMod's `profileMode` with buttons and social icons.

**Step 1: Create the new `hugo.toml`**

Create `hugo.toml` in the worktree root with this exact content:

```toml
baseURL = "https://be-rock.github.io/blog/"
languageCode = "en-us"
title = "Brock's Blog - Data|DevOps|Cloud"
theme = "PaperMod"

enableRobotsTXT = true
buildDrafts = false
buildFuture = false
enableEmoji = true
enableGitInfo = true
summaryLength = 30

[pagination]
  pagerSize = 10

[taxonomies]
  tag = "tags"
  category = "categories"

[outputs]
  home = ["HTML", "RSS", "JSON"]

[markup.tableOfContents]
  startLevel = 2
  endLevel = 5
  ordered = false

[params]
  defaultTheme = "dark"
  disableThemeToggle = false
  ShowReadingTime = true
  ShowPostNavLinks = true
  ShowBreadCrumbs = false
  ShowToc = true
  ShowWordCount = true
  ShowRssButtonInSectionTermList = true
  ShowShareButtons = false
  dateFormat = "2006-01-02"
  mainSections = ["posts"]

  [params.profileMode]
    enabled = true
    title = "Brock B"
    subtitle = "A tech enthusiast learning through writing with a primary focus on Data, Cloud, and DevOps"

    [[params.profileMode.buttons]]
      name = "Posts"
      url = "/blog/posts/"

    [[params.profileMode.buttons]]
      name = "Tags"
      url = "/blog/tags/"

  [[params.socialIcons]]
    name = "github"
    url = "https://github.com/be-rock"

  [[params.socialIcons]]
    name = "rss"
    url = "/blog/index.xml"

[[menus.main]]
  name = "Home"
  url = "/"
  weight = 1

[[menus.main]]
  name = "Posts"
  url = "/posts/"
  weight = 2

[[menus.main]]
  name = "Tags"
  url = "/tags/"
  weight = 3

[sitemap]
  changefreq = "weekly"
  filename = "sitemap.xml"
  priority = 0.5
```

**Step 2: Remove old config directory**

```bash
rm -rf config/
```

**Step 3: Remove old config.yaml.backup if present**

```bash
rm -f config.yaml.backup
```

**Step 4: Verify hugo can parse the config**

```bash
hugo config | head -20
```

Expected: Should show config values without errors. If `hugo` is not installed in the worktree path, run from the worktree directory.

**Step 5: Commit**

```bash
git add -A
git commit -m "replace multi-file config with single hugo.toml for PaperMod"
```

---

### Task 4: Custom Home Page Template

**Files:**
- Create: `layouts/index.html`

PaperMod's `profileMode` does not show recent posts. We need a custom `layouts/index.html` that renders the profile section and then lists recent posts below it.

**Step 1: Create the layouts directory if it doesn't exist**

```bash
mkdir -p layouts
```

**Step 2: Create `layouts/index.html`**

```html
{{- define "main" }}

{{- if .Site.Params.profileMode.enabled }}
<div class="profile">
  {{- with .Site.Params.profileMode.imageUrl }}
  <div class="profile_inner">
    <img draggable="false" src="{{ . }}" alt="{{ $.Site.Params.profileMode.imageTitle | default "profile image" }}" />
  </div>
  {{- end }}
  <h1>{{ .Site.Params.profileMode.title | default .Site.Title }}</h1>
  <span>{{ .Site.Params.profileMode.subtitle }}</span>
  {{- with .Site.Params.profileMode.buttons }}
  <div class="buttons">
    {{- range . }}
    <a class="button" href="{{ .url }}" rel="noopener" title="{{ .name }}">
      <span class="button-inner">{{ .name }}</span>
    </a>
    {{- end }}
  </div>
  {{- end }}
</div>
{{- end }}

{{- if .Site.Params.socialIcons }}
<div class="social-icons">
  {{- range .Site.Params.socialIcons }}
  <a href="{{ .url }}" target="_blank" rel="noopener noreferrer me" title="{{ .name | title }}">
    {{ partial "svg.html" .name }}
  </a>
  {{- end }}
</div>
{{- end }}

<div class="recent-posts">
  <h2 class="recent-posts-title">Recent Posts</h2>
  {{- $pages := where .Site.RegularPages "Section" "in" .Site.Params.mainSections }}
  {{- $paginator := .Paginate $pages }}
  {{- range $paginator.Pages }}
  <article class="post-entry">
    <header class="entry-header">
      <h3>
        <a href="{{ .Permalink }}">{{ .Title }}</a>
      </h3>
    </header>
    <footer class="entry-footer">
      <span>{{ .Date.Format ($.Site.Params.dateFormat | default "2006-01-02") }}</span>
      {{- if $.Site.Params.ShowReadingTime }}&nbsp;·&nbsp;{{ .ReadingTime }} min{{ end }}
    </footer>
  </article>
  {{- end }}
  {{- if gt $paginator.TotalPages 1 }}
  {{- partial "pagination.html" . }}
  {{- end }}
</div>

{{- end }}{{/* end main */}}
```

**Step 3: Verify the site builds**

```bash
cd /Users/brockb/code/git/blog/.worktrees/papermod-migration
hugo --minify 2>&1 | tail -5
```

Expected: Build succeeds with no errors. Some warnings about missing images are OK.

**Step 4: Commit**

```bash
git add layouts/index.html
git commit -m "add custom home page with profile + recent posts"
```

---

### Task 5: Clean Up Content Files

**Files:**
- Modify: `content/_index.md`
- Remove: `content/search.md` (Blowfish-specific)

**Step 1: Simplify `content/_index.md`**

Replace contents with:

```markdown
---
title: "Brock's Blog"
---
```

The profile info is now in `hugo.toml`, so the content file just needs a title for SEO.

**Step 2: Remove Blowfish-specific search page**

```bash
rm content/search.md
```

PaperMod handles search differently. If search is desired later, a new `content/search.md` with `layout: "search"` can be added.

**Step 3: Verify build**

```bash
hugo --minify 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add -A
git commit -m "clean up content files for PaperMod"
```

---

### Task 6: Verify Everything Works

**Step 1: Full build check**

```bash
cd /Users/brockb/code/git/blog/.worktrees/papermod-migration
hugo --minify
```

Expected: Clean build, all pages generated, no errors.

**Step 2: Check page count**

```bash
find public/ -name "*.html" | wc -l
```

Expected: Should have pages for home, each post, tags, tag listings, pagination.

**Step 3: Spot-check post output**

```bash
# Verify a post with images rendered correctly
ls public/posts/2026/databricks-vector-search/
# Should include index.html and image files
```

**Step 4: Spot-check home page**

```bash
grep -c "post-entry" public/index.html
```

Expected: Should match number of recent posts shown (up to pagerSize of 10).

**Step 5: Local server test (manual)**

```bash
hugo server --buildDrafts
```

Open `http://localhost:1313/blog/` and verify:
- Profile section shows at top with name, subtitle, buttons
- Social icons (GitHub, RSS) appear
- Recent posts listed below with title and date
- Dark mode is default
- Theme toggle works
- Clicking a post navigates correctly
- Post pages show TOC, reading time, tags
- Nav has Home, Posts, Tags links

**Step 6: Commit docs plan**

```bash
git add docs/
git commit -m "add migration design and implementation plan docs"
```

---

## Summary of All Commits

1. `remove Blowfish theme submodule`
2. `add PaperMod theme as submodule`
3. `replace multi-file config with single hugo.toml for PaperMod`
4. `add custom home page with profile + recent posts`
5. `clean up content files for PaperMod`
6. `add migration design and implementation plan docs`
