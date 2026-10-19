# Distill/Tufte-style Components

This layout provides a reading experience inspired by [Distill.pub](https://distill.pub) and [Edward Tufte's designs](https://edwardtufte.github.io/tufte-css/), with sidenotes and flexible figure widths.

## Components

### `<Sidenote>`

Numbered notes that appear in the right margin on desktop, or toggle inline on mobile.

```mdx
import Sidenote from '../../components/distill/Sidenote.tsx';

Some text<Sidenote id="unique-id" client:visible>
  This appears in the margin on desktop, numbered automatically.
</Sidenote> continues here.
```

**Props:**
- `id` (required): Unique identifier for this sidenote
- `client:visible`: Required for React hydration

### `<MarginNote>`

Unnumbered notes in the margin (for asides that don't need numbering).

```mdx
import MarginNote from '../../components/distill/MarginNote.tsx';

Some text<MarginNote id="unique-id" client:visible>
  An aside that appears in the margin.
</MarginNote> continues here.
```

**Props:**
- `id` (required): Unique identifier for this margin note
- `client:visible`: Required for React hydration

### `<Figure>`

Figures with three width options:

```mdx
import Figure from '../../components/distill/Figure.tsx';

{/* Normal width (within text column) */}
<Figure caption="A normal-width figure" client:visible>
  <img src="/path/to/image.png" alt="Description" />
</Figure>

{/* Wide (extends into margin) */}
<Figure width="wide" caption="A wide figure" client:visible>
  <img src="/path/to/image.png" alt="Description" />
</Figure>

{/* Full bleed (full viewport width) */}
<Figure width="full" caption="A full-bleed figure" client:visible>
  <img src="/path/to/image.png" alt="Description" />
</Figure>
```

**Props:**
- `width`: `"normal"` (default), `"wide"`, or `"full"`
- `caption` (optional): Caption text below the figure
- `client:visible`: Required for React hydration

## CSS Classes (for plain Markdown)

You can also use CSS classes directly:

```html
<figure class="distill-figure figure-wide">
  <img src="/path/to/image.png" alt="Description" />
  <figcaption class="figure-caption">Caption text</figcaption>
</figure>
```

## Layout

- **Desktop (>1200px)**: 650px content column + 220px margin column for sidenotes
- **Mobile (≤1200px)**: Full-width content, sidenotes toggle inline when tapped

## Navigation

The sidebar has been replaced with a hamburger menu overlay to preserve the margin space for sidenotes.
