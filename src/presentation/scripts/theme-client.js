/**
 * Theme management client script
 * Handles dark/light theme toggle with localStorage persistence
 * and system preference detection
 */

const THEME_STORAGE_KEY = "job-app-tracker-theme";
const DARK_THEME = "dark";
const LIGHT_THEME = "light";

/**
 * Get the current theme from localStorage or system preference
 */
function getInitialTheme() {
	// Check localStorage first
	const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
	if (storedTheme === DARK_THEME || storedTheme === LIGHT_THEME) {
		return storedTheme;
	}

	// Check system preference
	if (globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches) {
		return DARK_THEME;
	}

	return LIGHT_THEME;
}

/**
 * Apply the theme to the document
 */
function applyTheme(theme) {
	const root = document.documentElement;
	root.dataset.theme = theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
}

/**
 * Update the theme toggle button icon
 */
function updateThemeToggleIcon(theme) {
	const toggleButton = document.getElementById("theme-toggle");
	if (!toggleButton) return;

	const icon = toggleButton.querySelector(".theme-icon");
	if (!icon) return;

	icon.textContent = theme === DARK_THEME ? "☀️" : "🌙";
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
	const currentTheme = document.documentElement.dataset.theme;
	const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;

	applyTheme(newTheme);
	localStorage.setItem(THEME_STORAGE_KEY, newTheme);
	updateThemeToggleIcon(newTheme);
}

/**
 * Initialize theme on page load
 * This should be called as early as possible to prevent flash of wrong theme
 */
function initTheme() {
	const theme = getInitialTheme();
	applyTheme(theme);
	updateThemeToggleIcon(theme);

	// Set up toggle button listener
	const toggleButton = document.getElementById("theme-toggle");
	if (toggleButton) {
		toggleButton.addEventListener("click", toggleTheme);
	}

	// Listen for system theme changes
	if (globalThis.matchMedia) {
		const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");
		mediaQuery.addEventListener("change", (e) => {
			// Only auto-switch if user hasn't manually set a preference
			if (!localStorage.getItem(THEME_STORAGE_KEY)) {
				const newTheme = e.matches ? DARK_THEME : LIGHT_THEME;
				applyTheme(newTheme);
				updateThemeToggleIcon(newTheme);
			}
		});
	}
}

// Auto-initialize if script is loaded in browser
// Wait for DOM to be ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initTheme);
} else {
	initTheme();
}
