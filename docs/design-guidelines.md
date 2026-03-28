# Design Guidelines

UI and CSS design system reference for the Job Application Tracker.

## CSS Architecture

The presentation layer uses 12 modular CSS files loaded in a specific order from `src/presentation/styles/`. The theme file must load first because all other files depend on its custom properties.

### File Structure and Loading Order

| Order | File            | Purpose                                  |
| ----- | --------------- | ---------------------------------------- |
| 1     | `themes.css`    | Design tokens (CSS custom properties)    |
| 2     | `base.css`      | Reset, layout, form controls, headings   |
| 3     | `utilities.css` | Utility classes (text, bg, border, etc.) |
| 4+    | `buttons.css`   | Button component system                  |
| 4+    | `badges.css`    | Badge and label components               |
| 4+    | `cards.css`     | Card and container components            |
| 4+    | `tables.css`    | Table component system                   |
| 4+    | `forms.css`     | Form-specific styles                     |
| 4+    | `navbar.css`    | Navigation bar                           |
| 4+    | `pipeline.css`  | Pipeline/kanban view                     |
| 4+    | `pages.css`     | Page-specific layouts                    |
| 4+    | `analytics.css` | Analytics dashboard                      |

Component stylesheets (order 4+) are independent of each other and can load in any order after the foundation files.

### Design Tokens

All visual values are defined as CSS custom properties in `themes.css`. No hardcoded color, spacing, or typography values should appear in component stylesheets.

---

## Theme System

The app supports light and dark modes via a `data-theme` attribute on the `<html>` element. Light mode is the default (`:root`), dark mode activates with `[data-theme="dark"]`.

### How Switching Works

1. JavaScript in `layout.ts` and `theme-client.js` manages the `data-theme` attribute
2. User preference is persisted in `localStorage`
3. Falls back to the system `prefers-color-scheme` media query
4. A theme toggle button in the navbar lets users switch manually

### Authoring Theme-Aware Styles

Always use `var(--token-name)` instead of raw color values:

```css
/* Correct */
.my-component {
	background-color: var(--color-bg-container);
	color: var(--color-text-primary);
}

/* Incorrect - breaks in dark mode */
.my-component {
	background-color: #ffffff;
	color: #333;
}
```

For full theme variable reference, see [THEME_GUIDE.md](./THEME_GUIDE.md).

---

## Color Categories

### Background (`--color-bg-*`)

| Token                  | Light     | Dark      | Usage                   |
| ---------------------- | --------- | --------- | ----------------------- |
| `--color-bg-body`      | `#f5f5f5` | `#1a1a1a` | Page background         |
| `--color-bg-primary`   | `#ffffff` | `#2d2d2d` | Primary surfaces        |
| `--color-bg-container` | `#ffffff` | `#2d2d2d` | Cards, containers       |
| `--color-bg-secondary` | `#f8f9fa` | `#242424` | Alternate backgrounds   |
| `--color-bg-tertiary`  | `#fafbfc` | `#2a2a2a` | Third-level backgrounds |
| `--color-bg-hover`     | `#f8f9fa` | `#353535` | Hover states            |
| `--color-bg-navbar`    | `#343a40` | `#0d0d0d` | Navigation bar          |
| `--color-bg-editing`   | `#fff3cd` | `#4a4420` | Edit mode highlight     |

### Text (`--color-text-*`)

| Token                    | Usage                                |
| ------------------------ | ------------------------------------ |
| `--color-text-primary`   | Primary body text (highest contrast) |
| `--color-text-secondary` | Secondary/supporting text            |
| `--color-text-tertiary`  | De-emphasized text                   |
| `--color-text-dark`      | Dark headings                        |
| `--color-text-medium`    | Medium emphasis                      |
| `--color-text-light`     | Light text variant                   |
| `--color-text-inverse`   | Text on dark backgrounds             |

### Border (`--color-border-*`)

Six levels from `primary` through `dark`, providing a range from subtle dividers to strong outlines.

### Accent Colors

- **Primary (Green)**: `--color-accent-primary-*` -- primary actions, success indicators
- **Blue**: `--color-accent-blue-*` -- links, information, secondary actions, focus rings
- **Purple**: `--color-accent-purple-*` -- visited links, special states
- **Yellow/Gold**: `--color-accent-yellow-*` -- warnings, highlights, star ratings

### Status Colors

- **Error/Danger**: `--color-status-error-*` -- error messages, delete actions, rejections
- **Success**: `--color-status-success-*` -- success messages, confirmations
- **Overdue**: `--color-status-overdue-*` -- late tasks, missed deadlines

### Button Colors (`--color-btn-*`)

Secondary button background, hover, text, and border tokens. Gray button variants for neutral actions.

### Shadows (`--shadow-*`)

Four elevation levels (`sm`, `md`, `lg`, `xl`) plus interaction-specific shadows (`hover`, `hover-strong`, `focus`, `focus-blue`). Dark mode uses higher opacity for visibility.

---

## Typography Scale

Defined in `themes.css` as `--font-size-*` tokens:

| Token             | Value      | Pixels |
| ----------------- | ---------- | ------ |
| `--font-size-xs`  | `0.75rem`  | 12px   |
| `--font-size-sm`  | `0.875rem` | 14px   |
| `--font-size-md`  | `1rem`     | 16px   |
| `--font-size-lg`  | `1.125rem` | 18px   |
| `--font-size-xl`  | `1.25rem`  | 20px   |
| `--font-size-2xl` | `1.5rem`   | 24px   |

Base font family: `Arial, sans-serif` (set in `base.css`).

---

## Spacing Scale

Defined in `themes.css` as `--space-*` tokens:

| Token         | Value |
| ------------- | ----- |
| `--space-xs`  | 4px   |
| `--space-sm`  | 8px   |
| `--space-md`  | 12px  |
| `--space-lg`  | 16px  |
| `--space-xl`  | 24px  |
| `--space-2xl` | 32px  |
| `--space-3xl` | 48px  |

### Border Radius

| Token           | Value  |
| --------------- | ------ |
| `--radius-sm`   | 4px    |
| `--radius-md`   | 6px    |
| `--radius-lg`   | 8px    |
| `--radius-full` | 9999px |

### Transition Durations

| Token               | Value |
| ------------------- | ----- |
| `--duration-fast`   | 0.1s  |
| `--duration-normal` | 0.2s  |
| `--duration-slow`   | 0.3s  |

---

## Component Patterns

### Buttons

Defined in `buttons.css`. All buttons extend the `.btn` base class.

**Variants:**

| Class            | Color | Usage                        |
| ---------------- | ----- | ---------------------------- |
| `.btn-primary`   | Green | Primary actions (save, add)  |
| `.btn-secondary` | Gray  | Secondary actions (cancel)   |
| `.btn-success`   | Green | Confirmations                |
| `.btn-danger`    | Red   | Destructive actions (delete) |
| `.btn-info`      | Blue  | Informational actions        |
| `.btn-gray`      | Gray  | Neutral actions              |

**Sizes:** `.btn-sm` (compact), default, `.btn-lg` (large).

**Special variants:** `.btn-icon` (icon-only), `.btn-back` (navigation), `.btn-add` (call-to-action with shadow), `.btn-pagination` (page navigation).

**States:** `:hover` adds `translateY(-1px)` lift and shadow. `:disabled` reduces opacity to 0.6 and removes transforms. `:focus-visible` shows a 2px outline offset by 2px.

### Forms

Base form controls are in `base.css` (`.form-control`, `.form-group`, `.form-actions`). Page-specific form styles are in `forms.css`.

- `.form-control` provides consistent padding, border, and focus styling
- Required fields use `label.required::after` or `label[aria-required="true"]::after` to show a red asterisk
- Focus state: green border + `--shadow-focus` box-shadow
- Grid layout: `.grid-form` provides a two-column form layout that collapses on mobile

### Badges

Defined in `badges.css`. Base class `.badge` with semantic variants:

| Class             | Color  | Usage                              |
| ----------------- | ------ | ---------------------------------- |
| `.badge-active`   | Green  | Active status (prepends checkmark) |
| `.badge-inactive` | Red    | Inactive status (prepends X)       |
| `.badge-info`     | Blue   | Informational                      |
| `.badge-warning`  | Yellow | Warnings                           |
| `.badge-purple`   | Purple | Special categories                 |
| `.badge-neutral`  | Gray   | Neutral labels                     |

**Specialized badges:** `.badge-round` (interview round), `.badge-final-round` (final round indicator), `.badge-role` (contact role), `.badge-channel` (contact channel), `.badge-received` / `.badge-no-response` (response status).

**Layout:** `.badge-group` wraps multiple badges with `flex-wrap` and `gap: 8px`.

**Stats:** `.stat`, `.stat-active`, `.stat-inactive`, `.stat-total` provide rounded pill-style summary counters.

### Cards

Defined in `cards.css`. Multiple elevation levels:

| Class            | Shadow      | Usage                          |
| ---------------- | ----------- | ------------------------------ |
| `.container`     | `shadow-sm` | Base container                 |
| `.card`          | `shadow-md` | Standard card with border      |
| `.card-elevated` | `shadow-lg` | Emphasized card                |
| `.card-compact`  | `shadow-md` | Tighter padding (20px vs 24px) |
| `.section`       | `shadow-md` | Tertiary background section    |

**Patterns:** `.card-header` (flex header with bottom border), `.card-list` (vertical card stack), `.empty-state` (centered italic placeholder), `.field-group` + `.field-value` (label/value pairs).

**Grids:** `.grid-2col` (two-column layout, 32px gap) and `.grid-form` (two-column form, 16px gap). Both collapse to single column at 768px.

### Tables

Defined in `tables.css`. Wrap tables in `.table-container` for horizontal scroll.

- `.table` provides base styling with `border-collapse: collapse`
- Sticky headers with `position: sticky; top: 0`
- Sortable columns: `.sortable` class enables pointer cursor and hover background
- Overdue row highlighting: `.table-row.overdue` uses `--color-status-overdue-bg`
- Editable cells: `.cell-editable` shows a pencil icon on hover, `.cell-editing` highlights with `--color-bg-editing`
- Filter controls: `.table-controls` + `.table-filters` provide a flex layout above the table
- Pagination: `.pagination-nav` + `.btn-pagination` for page navigation

**Responsive:** At 768px, table controls stack vertically. At 480px, less important columns (updated date, interest) are hidden.

---

## HTMX Interaction Patterns

The app uses HTMX for server-driven partial page updates. HTML templates are server-rendered TypeScript functions returning strings.

### Swap Strategies

| Strategy     | Usage                                                             |
| ------------ | ----------------------------------------------------------------- |
| `innerHTML`  | Replace container contents (forms, pipeline view)                 |
| `outerHTML`  | Replace the element itself (edit/view mode toggles, row deletion) |
| `afterbegin` | Prepend new items (add contact to list)                           |

### Common Patterns

**Form submission with partial update:**

```html
<form
	hx-post="/applications"
	hx-trigger="submit"
	hx-target="#form-and-pipeline-container"
	hx-swap="innerHTML"
></form>
```

**Inline editing (click to edit, save replaces element):**

```html
<div
	id="contact-123"
	hx-get="/contacts/123/edit"
	hx-target="#contact-123"
	hx-swap="outerHTML"
></div>
```

**Delete with row removal:**

```html
<button
	hx-delete="/contacts/123"
	hx-target="#contact-123"
	hx-swap="outerHTML"
></button>
```

The server returns empty HTML so the target element is removed from the DOM.

**Full vs. partial responses:** The server checks for the `HX-Request` header. HTMX requests receive HTML fragments; normal requests receive full pages wrapped in the layout.

### Loading and Error Display

- Errors are collected in a navbar dropdown (`.error-notifications`) that shows a count badge and expandable error list
- Individual errors show timestamp and message, with a dismiss button
- Form validation errors appear as `.error-alert` boxes above the form
- Success feedback uses `.success-alert`

---

## Accessibility

### WCAG 2.1 AA Compliance

The design system includes several accessibility features:

**Color contrast:** Theme colors are chosen to meet minimum contrast ratios (4.5:1 for normal text, 3:1 for large text) in both light and dark modes.

**Focus indicators:** All interactive elements (links, buttons, `[role="button"]`) get a visible `focus-visible` outline via `base.css`:

```css
:where(a, button, [role="button"], .nav-link):focus-visible {
	outline: 2px solid var(--color-accent-blue-focus);
	outline-offset: 2px;
}
```

**Reduced motion:** Transitions are disabled when the user has `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
	.btn,
	.form-control {
		transition: none;
	}
}
```

**Screen reader support:** `.sr-only` class hides content visually while keeping it accessible to screen readers.

**Color scheme declaration:** `color-scheme: light dark` is set on `:root` and `[data-theme="dark"]` to ensure native form controls respect the active theme.

**Semantic HTML:** Forms use `label[for]` associations, `aria-required` attributes, and `<details>`/`<summary>` for progressive disclosure.

### Responsive Design

All components include mobile breakpoints:

- **768px:** Grid layouts collapse to single column, navbar compacts, table controls stack vertically
- **480px:** Less important table columns are hidden, further simplification

---

## Quick Reference

### Adding a New Color

1. Check `themes.css` for an existing token that fits
2. If none exists, add to both `:root` (light) and `[data-theme="dark"]` blocks
3. Follow the naming pattern: `--color-[category]-[variant]`
4. Verify contrast ratios in both themes
5. Document in [THEME_GUIDE.md](./THEME_GUIDE.md)

### Adding a New Component

1. Create styles in the appropriate existing file, or add a new file if the component is complex enough
2. Use only theme tokens for colors, spacing, typography, and shadows
3. Include `:hover`, `:focus-visible`, and `:disabled` states
4. Add `@media (prefers-reduced-motion: reduce)` to disable transitions
5. Add responsive breakpoints at 768px and 480px as needed
6. Test in both light and dark modes

---

## Related Documents

- [THEME_GUIDE.md](./THEME_GUIDE.md) -- complete theme variable reference with examples
- [PRD.md](./PRD.md) -- product requirements and feature specifications
