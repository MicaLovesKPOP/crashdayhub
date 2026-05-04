# CrashdayHub themes

This folder is the home for theme-specific data.

## Current theme values

`theme.css` contains CSS custom properties for:

- Context/help bar color
- General accent color placeholders
- Highlight color placeholders

## Planned theme assets

When theme-specific images are added, keep them in per-theme subfolders:

```txt
redline-red/
classic-blue/
ai-green/
mica-yellow/
```

Suggested future assets:

```txt
loading-screen.webp
background-fallback.jpg
ui-option-box.webp
ui-slider-start.webp
ui-slider-middle.webp
ui-slider-end.webp
ui-arrow-left.webp
ui-arrow-right.webp
cursor.webp
```

The site should reference these through theme-aware CSS variables where possible, so adding a new theme does not require editing unrelated menu code.
