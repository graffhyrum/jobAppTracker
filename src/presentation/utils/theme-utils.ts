/**
 * Shared theme utilities and constants
 * Single source of truth for theme management
 */

export const THEME_STORAGE_KEY = "job-app-tracker-theme";
export const DARK_THEME = "dark" as const;
export const LIGHT_THEME = "light" as const;

export type Theme = typeof DARK_THEME | typeof LIGHT_THEME;

/**
 * Get the current theme from localStorage or system preference
 */
export function getInitialTheme(): Theme {
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
export function applyTheme(theme: Theme): void {
	const root = document.documentElement;
	root.dataset.theme = theme;
}

/**
 * Get the icon for a given theme
 */
export function getThemeIcon(theme: Theme): string {
	return theme === DARK_THEME ? "☀️" : "🌙";
}

/**
 * Get the aria-label for the theme toggle button based on current theme
 */
export function getThemeToggleLabel(currentTheme: Theme): string {
	return currentTheme === DARK_THEME
		? "Switch to light mode"
		: "Switch to dark mode";
}

/**
 * Toggle between light and dark themes and return the new theme
 */
export function toggleTheme(currentTheme: Theme): Theme {
	const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;

	applyTheme(newTheme);
	localStorage.setItem(THEME_STORAGE_KEY, newTheme);

	return newTheme;
}

/**
 * Initialize theme system with optional callback for theme changes
 */
export function initThemeSystem(onThemeChange?: (theme: Theme) => void): Theme {
	const theme = getInitialTheme();
	applyTheme(theme);

	// Set up system theme change listener
	if (globalThis.matchMedia) {
		const mediaQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");
		mediaQuery.addEventListener("change", (e) => {
			// Only auto-switch if user hasn't manually set a preference
			if (!localStorage.getItem(THEME_STORAGE_KEY)) {
				const newTheme = e.matches ? DARK_THEME : LIGHT_THEME;
				applyTheme(newTheme);
				onThemeChange?.(newTheme);
			}
		});
	}

	return theme;
}
