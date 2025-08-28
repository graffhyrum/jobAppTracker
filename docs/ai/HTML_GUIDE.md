# Modern HTML Implementation Guide

A guide for implementing clean, semantic, and performant HTML following modern web standards.

## Core Principles

### 1. Semantic HTML First
Use HTML elements for their intended semantic meaning, not their visual appearance.

```html
<!-- Good: Semantic structure -->
<article>
  <header>
    <h1>Article Title</h1>
    <time datetime="2024-01-15">January 15, 2024</time>
  </header>
  <p>Article content...</p>
  <footer>
    <address>Author info</address>
  </footer>
</article>

<!-- Bad: Non-semantic divs -->
<div class="article">
  <div class="title">Article Title</div>
  <div class="date">January 15, 2024</div>
  <div class="content">Article content...</div>
</div>
```

### 2. Use Native HTML Features
Leverage built-in HTML functionality before reaching for JavaScript solutions.

```html
<!-- Native expandable content -->
<details>
  <summary>Click to expand</summary>
  <p>Hidden content that doesn't require JavaScript</p>
</details>

<!-- Native modal dialog -->
<dialog id="my-dialog">
  <form method="dialog">
    <p>Dialog content</p>
    <button value="cancel">Cancel</button>
    <button value="confirm">Confirm</button>
  </form>
</dialog>

<!-- Native form validation -->
<form>
  <label for="email">Email Address</label>
  <input type="email" id="email" required 
         pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$">
  
  <label for="phone">Phone Number</label>
  <input type="tel" id="phone" required pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}">
  
  <button type="submit">Submit</button>
</form>
```

### 3. Proper Document Structure
Maintain logical document hierarchy and accessibility.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Descriptive Page Title</title>
</head>
<body>
  <header>
    <nav aria-label="Main navigation">
      <!-- Navigation items -->
    </nav>
  </header>
  
  <main>
    <h1>Main Page Heading</h1>
    <!-- Primary content -->
  </main>
  
  <aside>
    <!-- Sidebar content -->
  </aside>
  
  <footer>
    <!-- Footer content -->
  </footer>
</body>
</html>
```

## HTML5 Input Types

Use modern input types for better user experience and validation:

```html
<input type="email" placeholder="user@example.com">
<input type="tel" placeholder="(555) 123-4567">
<input type="url" placeholder="https://example.com">
<input type="date">
<input type="time">
<input type="number" min="0" max="100" step="5">
<input type="range" min="0" max="100" value="50">
<input type="color">
<input type="search" placeholder="Search...">
```

## Accessibility Best Practices

### Labels and Form Controls
```html
<!-- Always associate labels with form controls -->
<label for="username">Username</label>
<input type="text" id="username" name="username" required>

<!-- Use fieldset for grouped controls -->
<fieldset>
  <legend>Preferred Contact Method</legend>
  <input type="radio" id="email-contact" name="contact" value="email">
  <label for="email-contact">Email</label>
  
  <input type="radio" id="phone-contact" name="contact" value="phone">
  <label for="phone-contact">Phone</label>
</fieldset>
```

### ARIA Attributes
```html
<!-- Use ARIA to enhance semantic meaning -->
<button aria-expanded="false" aria-controls="menu">Menu</button>
<ul id="menu" aria-hidden="true">
  <li><a href="/home">Home</a></li>
  <li><a href="/about">About</a></li>
</ul>

<!-- Provide context for screen readers -->
<img src="chart.png" alt="Sales increased 25% from Q1 to Q2">
<button aria-label="Close dialog">×</button>
```

## Performance Optimizations

### Resource Loading
```html
<!-- Optimize resource loading -->
<link rel="preload" href="critical.css" as="style">
<link rel="prefetch" href="next-page.html">

<!-- Responsive images -->
<img src="small.jpg" 
     srcset="small.jpg 480w, medium.jpg 768w, large.jpg 1200w"
     sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw"
     alt="Description">

<!-- Lazy loading -->
<img src="image.jpg" loading="lazy" alt="Description">
```

### Script Loading
```html
<!-- Defer non-critical JavaScript -->
<script src="analytics.js" defer></script>

<!-- Async for independent scripts -->
<script src="widget.js" async></script>
```

## Common Anti-Patterns to Avoid

### Don't Recreate Native Functionality
```html
<!-- Bad: Custom dropdown -->
<div class="dropdown" onclick="toggleDropdown()">
  <div class="dropdown-content">...</div>
</div>

<!-- Good: Native select -->
<select name="options">
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

### Don't Use Divs for Everything

```html
<!-- Bad: Generic containers -->
<div class="header">
  <div class="nav">
    <div class="nav-item">Home</div>
  </div>
</div>

<!-- Good: Semantic elements -->
<header>
  <nav>
    <a href="/">Home</a>
  </nav>
</header>
```

## Modern HTML Features

### Web Components
```html
<!-- Custom elements with native browser support -->
<script>
class SimpleCard extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="card">
        <slot name="title"></slot>
        <slot name="content"></slot>
      </div>
    `;
  }
}
customElements.define('simple-card', SimpleCard);
</script>

<simple-card>
  <h2 slot="title">Card Title</h2>
  <p slot="content">Card content</p>
</simple-card>
```

### CSS Grid and Flexbox in HTML
```html
<!-- Use CSS Grid attributes for layout hints -->
<div style="display: grid; grid-template-columns: 1fr 3fr; gap: 1rem;">
  <aside>Sidebar</aside>
  <main>Main content</main>
</div>

<!-- Flexbox for simple layouts -->
<div style="display: flex; justify-content: space-between; align-items: center;">
  <h1>Title</h1>
  <button>Action</button>
</div>
```

## Implementation Guidelines

1. **Start with HTML structure** before adding CSS or JavaScript
2. **Validate markup** using W3C validator
3. **Test with keyboard navigation** to ensure accessibility
4. **Use progressive enhancement** - ensure functionality works without JavaScript
5. **Minimize dependencies** - prefer native solutions over libraries
6. **Test across devices** and browsers for compatibility

## Testing HTML

```html
<!-- Include test identifiers when needed -->
<button data-testid="submit-button">Submit</button>
<form data-testid="contact-form">...</form>

<!-- Use meaningful IDs for automation -->
<input type="text" id="user-email" name="email">
```

## Quick Reference

### Essential Elements
- `<main>` - Primary content area
- `<article>` - Self-contained content
- `<section>` - Thematic grouping
- `<aside>` - Tangential content
- `<nav>` - Navigation links
- `<header>` / `<footer>` - Page/section headers and footers

### Interactive Elements
- `<button>` - Clickable actions
- `<details>` / `<summary>` - Expandable content
- `<dialog>` - Modal content
- `<select>` / `<option>` - Dropdown selections
- `<input>` with various types for user input

Remember: HTML is powerful on its own. Use it fully before adding complexity.
