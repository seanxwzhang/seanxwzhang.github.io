# Rabbit Holes

Personal blog at [seanzhang.me](https://seanzhang.me) - Learning, thinking, and writing.

## Tech Stack

- **Framework**: [Astro](https://astro.build) with MDX + React
- **Styling**: Tailwind CSS with custom warm theme
- **Interactive Content**: Quarto for Python/Observable posts
- **Comments**: Utterances (GitHub Issues)
- **Deployment**: Vercel

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Writing Posts

### Regular Markdown Posts

Create a new file in `src/content/posts/`:

```markdown
---
title: "My New Post"
date: 2025-01-14
description: "A brief description"
tags: [tag1, tag2]
---

Your content in Markdown...
```

### Interactive Posts with Quarto

For posts with executable Python code, interactive visualizations, or Observable JS:

#### 1. Install Quarto

```bash
# macOS
brew install quarto

# Or download from https://quarto.org/docs/get-started/
```

#### 2. Create a Quarto document

Create a `.qmd` file in `src/content/posts/`:

```markdown
---
title: "Data Analysis Post"
date: 2025-01-14
description: "Interactive data visualization"
tags: [python, data]
format:
  html:
    self-contained: true
---

## Python Example

```{python}
import plotly.express as px
df = px.data.iris()
fig = px.scatter(df, x="sepal_width", y="sepal_length", color="species")
fig.show()
```

## Observable JS Example

```{ojs}
viewof n = Inputs.range([1, 100], {value: 50, step: 1, label: "Count"})
Plot.rectY({length: n}, Plot.binX({y: "count"}, {x: Math.random})).plot()
```
```

#### 3. Render the Quarto document

```bash
# Render a single post
quarto render src/content/posts/my-data-post.qmd

# This creates my-data-post.html in the same directory
```

#### 4. Create corresponding Astro page (for custom routing)

For Quarto posts, you have two options:

**Option A**: Embed the rendered HTML in an MDX file:
```mdx
---
title: "Data Analysis Post"
date: 2025-01-14
tags: [python, data]
---

import QuartoContent from './my-data-post.html?raw';

<div set:html={QuartoContent} />
```

**Option B**: Place rendered HTML in `public/` and link to it:
```bash
quarto render src/content/posts/analysis.qmd -o public/posts/analysis.html
```

Then link from your blog: `[View interactive post](/posts/analysis.html)`

#### Quarto Tips

- Use `format: html` with `self-contained: true` to bundle all assets
- For Python, ensure you have the required packages (`pip install plotly pandas`)
- Observable JS works out of the box - great for D3 visualizations
- You can mix Python, R, and Observable in the same document

## Migration from Notion

To migrate existing posts from Notion:

1. Create a [Notion integration](https://www.notion.so/my-integrations)

2. Share your database with the integration:
   - Open your Notion database
   - Click Share → Invite
   - Search for your integration and add it

3. Update `.env.local`:
   ```bash
   export NOTION_PAGE_ID=your_database_id
   export NOTION_ACCESS_TOKEN=your_token
   ```

4. Run the migration:
   ```bash
   source .env.local && npm run migrate
   ```

## Comments Setup

Using Utterances (GitHub Issues-based):

1. Install [utterances app](https://github.com/apps/utterances) on your repo
2. Comments are already configured in `src/layouts/PostLayout.astro`

To switch to Giscus (GitHub Discussions-based):

1. Enable Discussions in repo Settings → Features
2. Install [giscus app](https://github.com/apps/giscus)
3. Get config from [giscus.app](https://giscus.app)
4. Update the script in `PostLayout.astro`

## RSS Feed

Subscribe at `/rss.xml` - compatible with Substack import.

To cross-post to Substack:
1. Go to Substack Settings → Importing
2. Add your RSS feed URL: `https://seanzhang.me/rss.xml`
