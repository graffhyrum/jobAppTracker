# Theme System Guide

Complete guide for using the centralized color theme system in the Job Application Tracker.

## Overview

All colors are defined in `src/presentation/styles/themes.css` using CSS custom properties (variables). The system supports both light and dark modes with automatic theme switching.

## Theme Architecture

### File Structure

```
src/presentation/styles/
├── themes.css          # Theme variables (SINGLE SOURCE OF TRUTH)
├── utilities.css       # Utility classes for common patterns
├── base.css           # Base styles using theme variables
├── buttons.css        # Button components
├── badges.css         # Badge components
├── cards.css          # Card containers
├── tables.css         # Table layouts
├── navbar.css         # Navigation bar
├── forms.css          # Form elements
├── pages.css          # Page-specific layouts
├── pipeline.css       # Pipeline/kanban views
└── analytics.css      # Analytics dashboard
```

### CSS Loading Order (in layout.ts)

1. **themes.css** - Defines all CSS custom properties
2. **base.css** - Foundation styles
3. **utilities.css** - Utility classes
4. **Component stylesheets** - Specific components (buttons, badges, cards, etc.)

## Color Categories

### Background Colors

```css
--color-bg-body         /* Page background */
--color-bg-container    /* Card/container backgrounds */
--color-bg-secondary    /* Alternate backgrounds */
--color-bg-tertiary     /* Third-level backgrounds */
--color-bg-hover        /* Hover state backgrounds */
--color-bg-navbar       /* Navigation bar background */
--color-bg-editing      /* Edit mode highlight */
```

**Example Usage:**
```css
.my-card {
    background-color: var(--color-bg-container);
}
```

### Text Colors

```css
--color-text-primary    /* Primary text (highest contrast) */
--color-text-secondary  /* Secondary text (medium contrast) */
--color-text-tertiary   /* Tertiary text (lower contrast) */
--color-text-dark       /* Dark text variant */
--color-text-medium     /* Medium text variant */
--color-text-light      /* Light text variant */
--color-text-inverse    /* Inverse text (for dark backgrounds) */
```

**Example Usage:**
```css
.heading {
    color: var(--color-text-primary);
}

.subtitle {
    color: var(--color-text-secondary);
}
```

### Border Colors

```css
--color-border-primary    /* Primary borders */
--color-border-secondary  /* Secondary borders */
--color-border-tertiary   /* Tertiary borders */
--color-border-light      /* Light borders */
--color-border-medium     /* Medium borders */
--color-border-dark       /* Dark borders */
```

**Example Usage:**
```css
.input-field {
    border: 2px solid var(--color-border-primary);
}
```

### Accent Colors

#### Primary (Green)
```css
--color-accent-primary              /* Base green */
--color-accent-primary-hover        /* Hover state */
--color-accent-primary-dark         /* Dark variant */
--color-accent-primary-darker       /* Darker variant */
--color-accent-primary-light        /* Light background */
--color-accent-primary-lighter      /* Lighter background */
--color-accent-primary-text         /* Text on light backgrounds */
--color-accent-primary-text-dark    /* Darker text variant */
```

**Use Cases:** Primary buttons, success states, positive indicators

#### Blue
```css
--color-accent-blue              /* Base blue */
--color-accent-blue-hover        /* Hover state */
--color-accent-blue-light        /* Light variant */
--color-accent-blue-medium       /* Medium variant */
--color-accent-blue-dark         /* Dark variant */
--color-accent-blue-lighter      /* Light background */
--color-accent-blue-focus        /* Focus rings */
```

**Use Cases:** Links, information, secondary actions

#### Purple
```css
--color-accent-purple         /* Base purple */
--color-accent-purple-text    /* Purple text */
--color-accent-purple-dark    /* Dark variant */
--color-accent-purple-light   /* Light background */
```

**Use Cases:** Visited links, special states

#### Yellow/Gold
```css
--color-accent-yellow          /* Base yellow */
--color-accent-yellow-light    /* Light variant */
--color-accent-yellow-lighter  /* Lighter background */
--color-accent-yellow-text     /* Yellow text */
--color-accent-gold           /* Gold accent */
```

**Use Cases:** Warnings, highlights, ratings

### Status Colors

#### Error/Danger (Red)
```css
--color-status-error           /* Error state */
--color-status-error-hover     /* Error hover */
--color-status-error-dark      /* Dark error */
--color-status-error-darker    /* Darker error */
--color-status-error-light     /* Error background */
--color-status-error-lighter   /* Lighter error background */
--color-status-error-text      /* Error text */
--color-status-error-alt       /* Alternative error */
```

**Use Cases:** Error messages, delete buttons, rejections

#### Success (Green)
```css
--color-status-success         /* Success state */
--color-status-success-hover   /* Success hover */
```

**Use Cases:** Success messages, confirmations, offers

#### Overdue
```css
--color-status-overdue         /* Overdue indicator */
--color-status-overdue-bg      /* Overdue background */
--color-status-overdue-hover   /* Overdue hover */
```

**Use Cases:** Late tasks, missed deadlines

### Button Colors

```css
--color-btn-secondary-bg       /* Secondary button background */
--color-btn-secondary-hover    /* Secondary button hover */
--color-btn-secondary-text     /* Secondary button text */
--color-btn-secondary-border   /* Secondary button border */
--color-btn-gray              /* Gray button */
--color-btn-gray-hover        /* Gray button hover */
```

### Shadows

```css
--shadow-sm               /* Small shadow */
--shadow-md               /* Medium shadow */
--shadow-lg               /* Large shadow */
--shadow-xl               /* Extra large shadow */
--shadow-hover            /* Hover shadow (green tint) */
--shadow-hover-strong     /* Strong hover shadow */
--shadow-focus            /* Focus shadow */
--shadow-focus-blue       /* Blue focus shadow */
```

### Overlays

```css
--overlay-light           /* Light overlay */
--overlay-medium          /* Medium overlay */
--overlay-dark            /* Dark overlay */
--overlay-navbar-btn      /* Navbar button overlay */
```

## Utility Classes

The `utilities.css` file provides pre-built classes for common patterns:

### Text Colors

```html
<p class="text-primary">Primary text</p>
<p class="text-secondary">Secondary text</p>
<p class="text-error">Error text</p>
<p class="text-success">Success text</p>
```

### Alert Boxes

```html
<div class="error-alert">Error message</div>
<div class="success-alert">Success message</div>
<div class="warning-alert">Warning message</div>
<div class="info-alert">Info message</div>
```

### Cursors

```html
<button class="cursor-pointer">Clickable</button>
<div class="cursor-not-allowed">Disabled</div>
```

### Shadows

```html
<div class="shadow-sm">Small shadow</div>
<div class="shadow-md">Medium shadow</div>
<div class="shadow-lg">Large shadow</div>
```

### Visibility

```html
<div class="hidden">Not displayed</div>
<div class="hidden-mobile">Hidden on mobile</div>
<div class="visible-mobile">Only on mobile</div>
```

## Using Theme Colors in CSS

### Basic Usage

```css
.my-component {
    background-color: var(--color-bg-container);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-primary);
}
```

### Hover States

```css
.button {
    background-color: var(--color-accent-primary);
}

.button:hover {
    background-color: var(--color-accent-primary-hover);
}
```

### Focus States

```css
.input:focus-visible {
    outline: 2px solid var(--color-accent-blue-focus);
    outline-offset: 2px;
}
```

## Using Theme Colors in JavaScript

### Reading CSS Custom Properties

```javascript
const getThemeColor = (colorVar) => {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(colorVar)
        .trim();
};

// Usage
const primaryColor = getThemeColor('--color-accent-primary');
const errorColor = getThemeColor('--color-status-error');
```

### Example: Chart.js Integration

```javascript
// Read colors from theme
const themeColors = {
    primary: getThemeColor('--color-accent-primary'),
    error: getThemeColor('--color-status-error'),
    textPrimary: getThemeColor('--color-text-primary'),
};

// Use in chart configuration
new Chart(ctx, {
    type: 'bar',
    data: {
        datasets: [{
            backgroundColor: themeColors.primary,
            borderColor: themeColors.primary,
        }]
    },
    options: {
        scales: {
            y: {
                ticks: {
                    color: themeColors.textPrimary
                }
            }
        }
    }
});
```

See `src/presentation/scripts/analytics-charts.js` for complete implementation.

## Dark Mode Support

All color variables have both light and dark mode definitions. The theme switches automatically based on:

1. User preference (saved in localStorage)
2. System preference (`prefers-color-scheme`)

### How It Works

```css
/* Light mode (default) */
:root {
    --color-bg-body: #f5f5f5;
    --color-text-primary: #333;
}

/* Dark mode */
[data-theme="dark"] {
    --color-bg-body: #1a1a1a;
    --color-text-primary: #e0e0e0;
}
```

The `data-theme` attribute is set on the `<html>` element by JavaScript in `layout.ts` and `theme-client.js`.

### Testing Dark Mode

1. Click the theme toggle in the navigation bar
2. Or use browser DevTools: `document.documentElement.dataset.theme = 'dark'`

## Accessibility (WCAG 2.1 AA)

All theme colors meet WCAG 2.1 AA contrast requirements:

- **Normal text**: 4.5:1 contrast ratio minimum
- **Large text**: 3:1 contrast ratio minimum
- **Interactive elements**: Clear focus indicators

### Testing Contrast

Use browser DevTools or online tools to verify contrast ratios:

```css
/* Good - text-primary on bg-container has > 4.5:1 */
color: var(--color-text-primary);
background-color: var(--color-bg-container);

/* Good - large headings with text-primary */
font-size: 24px;
color: var(--color-text-primary);
```

## Best Practices

### DO ✅

- **Always use theme variables** for colors
- **Use utility classes** for common patterns
- **Test in both light and dark modes**
- **Use semantic variable names** (prefer `--color-status-error` over `--color-red`)
- **Read colors dynamically** in JavaScript for theme-aware components

### DON'T ❌

- **Never use hardcoded hex/rgb values** (except in themes.css)
- **Don't create inline styles** with color values
- **Don't assume light mode** when building components
- **Don't duplicate color definitions**

### Examples

**Bad:**
```html
<div style="color: red; background-color: #ffebee;">Error!</div>
```

**Good:**
```html
<div class="error-alert">Error!</div>
```

**Bad:**
```css
.my-button {
    background-color: #4caf50;
    color: white;
}
```

**Good:**
```css
.my-button {
    background-color: var(--color-accent-primary);
    color: var(--color-text-inverse);
}
```

## Adding New Colors

If you need a new color:

1. **Check if existing variables work** - Review themes.css first
2. **Add to themes.css** - Define for both light and dark modes
3. **Use semantic naming** - `--color-[category]-[variant]`
4. **Test accessibility** - Verify contrast ratios
5. **Document usage** - Update this guide

### Example

```css
/* In themes.css */

/* Light theme */
:root {
    --color-accent-teal: #14b8a6;
    --color-accent-teal-light: #ccfbf1;
}

/* Dark theme */
[data-theme="dark"] {
    --color-accent-teal: #2dd4bf;
    --color-accent-teal-light: #134e4a;
}
```

## Troubleshooting

### Colors Not Updating

1. **Check CSS load order** - themes.css must load first
2. **Verify variable name** - Typos in `var(--color-name)`
3. **Clear browser cache** - Hard refresh (Ctrl+Shift+R)

### Dark Mode Not Working

1. **Check data-theme attribute** - Should be on `<html>` element
2. **Verify variable definitions** - Both `:root` and `[data-theme="dark"]`
3. **Check JavaScript** - Theme script should run before body renders

### JavaScript Colors Wrong

1. **Read after DOM load** - Wait for stylesheets to load
2. **Use getComputedStyle** - Don't read from stylesheet directly
3. **Trim whitespace** - Use `.trim()` on values

## Resources

- **Theme Variables**: `src/presentation/styles/themes.css`
- **Utility Classes**: `src/presentation/styles/utilities.css`
- **Layout Component**: `src/presentation/components/layout.ts`
- **Theme Toggle**: `src/presentation/scripts/theme-client.js`
- **Chart Example**: `src/presentation/scripts/analytics-charts.js`
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/

## Quick Reference Card

| Category | Variable Pattern | Example |
|----------|-----------------|---------|
| Background | `--color-bg-*` | `--color-bg-container` |
| Text | `--color-text-*` | `--color-text-primary` |
| Border | `--color-border-*` | `--color-border-primary` |
| Accent | `--color-accent-*` | `--color-accent-blue` |
| Status | `--color-status-*` | `--color-status-error` |
| Button | `--color-btn-*` | `--color-btn-secondary-bg` |
| Shadow | `--shadow-*` | `--shadow-md` |
| Spacing | `--space-*` | `--space-lg` |
| Typography | `--font-size-*` | `--font-size-lg` |
| Radius | `--radius-*` | `--radius-md` |
