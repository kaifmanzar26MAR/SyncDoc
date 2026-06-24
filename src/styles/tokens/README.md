# SyncDoc Design Tokens

Token layers (load order in `globals.css`):

```
base.css          → Primitives (palette, spacing, typography, shadows)
presets.light.css → Light theme derived tokens (--preset-*)
presets.dark.css  → Dark theme derived tokens (--preset-*)
semantic.css      → Component tokens (--btn-*, --input-*, --sidebar-*, …)
```

## Theme switching

Set `data-theme="light"` or `data-theme="dark"` on `<html>`.  
`ThemeProvider` syncs Zustand state, localStorage, and Ant Design `ConfigProvider`.

## Base tokens (primitives)

| Category | Examples |
|---|---|
| Brand | `--color-brand-50` … `--color-brand-950` |
| Neutral | `--color-neutral-0` … `--color-neutral-950` |
| Status | `--color-success-*`, `--color-warning-*`, `--color-error-*`, `--color-info-*` |
| Spacing | `--space-1` … `--space-16` |
| Typography | `--font-size-*`, `--font-weight-*`, `--line-height-*` |
| Radius | `--radius-sm`, `--radius-md`, `--radius-lg` |
| Shadow | `--shadow-xs` … `--shadow-lg` |
| Motion | `--duration-fast`, `--duration-normal`, `--ease-default` |

## Preset tokens (theme-aware)

| Token | Purpose |
|---|---|
| `--preset-bg-base` | Page background |
| `--preset-bg-elevated` | Cards, inputs, panels |
| `--preset-text-primary` | Body text |
| `--preset-primary` | Brand accent |
| `--preset-border-default` | Default borders |
| `--preset-sidebar-bg` | Sidebar surface |

## Semantic tokens (components)

### Buttons
`--btn-primary-bg`, `--btn-primary-bg-hover`, `--btn-primary-bg-active`  
`--btn-default-*`, `--btn-ghost-*`, `--btn-danger-*`, `--btn-disabled-*`

### Inputs
`--input-bg`, `--input-border`, `--input-border-hover`, `--input-border-focus`  
`--input-text`, `--input-text-placeholder`, `--input-bg-disabled`, `--input-shadow-focus`

### Layout
`--sidebar-*`, `--header-*`, `--card-*`, `--editor-*`, `--drawer-*`

## Ant Design integration

`@shared/theme/antd-theme.js` maps semantic CSS variables to Ant Design `token` and `components` config.  
`ConfigProvider` uses `cssVar: { key: 'syncdoc' }` so Ant components follow the active theme.
