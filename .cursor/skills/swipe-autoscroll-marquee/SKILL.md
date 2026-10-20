---
name: swipe-autoscroll-marquee
description: Use when adding a horizontal product strip, featured carousel, or infinite marquee that should autoplay and support finger or mouse swipe with native flick momentum; also when a CSS-animated marquee feels stuck, laggy, or hard to scrub.
---

# Swipe + autoscroll marquee

## Overview

Build an infinite horizontal strip that **cruises on its own**, tracks the finger **1:1 while dragging**, then **coasts with flick momentum** before returning to cruise — like native page scroll, not a CSS `animation-play-state` pause toy.

Reference implementation: `reference.js` + `reference.css` in this skill folder. Proven in 0101 Barbershop / Scarleth-style product rows.

## When to use

- Product / featured item marquees on marketing sites
- “Autoscroll with swipe” requests
- Fixing marquees that freeze after touch, move only a tiny bit on swipe, or show a blank/black half after looping

## When not to use

- Paginated carousels with dots/arrows (use a real slider)
- Vertical feeds
- `prefers-reduced-motion`: fall back to a plain horizontal scroller (no autoplay)

## Core rules

1. **JS transform loop, not CSS keyframes** — CSS `animation-play-state: paused` gets stuck when `pointerup` fires off-element.
2. **Duplicate the item set once** — autoplay uses `offset %= halfWidth` (`translate3d(-offset,0,0)`).
3. **Eager-load images in both halves** — `loading="lazy"` on the duplicate set causes a black/empty half when the loop wraps.
4. **No hover freeze, no post-drag resume delay** — those feel like lag.
5. **1:1 drag + sample-based flick velocity** — average recent pointer deltas (~120ms); don’t trust only the last frame (finger often stops before lift).
6. **Coast with friction, then resume cruise** — never snap velocity straight to crawl speed after a flick.
7. **Axis lock** — `touch-action: pan-y` on the root; once horizontal wins, `touch-action: none` + `setPointerCapture`; vertical intent releases so the page can scroll.
8. **Don’t put `data-reveal` transforms/filters on the marquee root** — wrap it; parent `filter`/`transform` fights the track motion.

## HTML skeleton

```html
<div class="products-marquee" id="products-marquee">
  <div class="products-marquee-track" data-marquee-track></div>
</div>
```

Render cards into the track twice (unless reduced motion). Init with `initSwipeMarquee(root)`.

## Tuneables

| Constant | Role | Good default |
|---|---|---|
| `autoplaySpeed` | Cruise (px/ms) | `0.048` (~48px/s) |
| `friction` | Coast decay | `0.00135` (~500ms half-life) |
| `maxFlick` | Cap (px/ms) | `3.5` |

## Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Freeze after touch | CSS pause / missing pointerup | JS loop + capture + cancel/lostcapture handlers |
| Swipe moves tiny amount | Velocity blended to crawl immediately | Coast with friction first |
| Blank/black half | Lazy images on duplicate set | `loading="eager"` for marquee cards |
| Lag then crawl | Hover pause or ~900ms resume timer | Remove both |
| Can’t scroll page | Always capturing touch | Axis lock; only capture on horizontal |

## Verify

- Hover does **not** stop motion
- Drag across the strip moves ~1:1 with the pointer
- Fast flick coasts multiple cards, then eases into cruise
- Vertical drag on the strip still scrolls the page
- Reduced-motion: no autoplay; native overflow-x scroller
