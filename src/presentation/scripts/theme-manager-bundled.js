/**
 * Centralized theme state manager
 * Provides single source of truth for theme state and UI updates
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
	root.dataset.theme = theme;
}

/**
 * Get the icon for a given theme
 */
function getThemeIcon(theme) {
	return theme === DARK_THEME ? "☀️" : "🌙";
}

/**
 * Get the aria-label for the theme toggle button based on current theme
 */
function getThemeToggleLabel(currentTheme) {
	return currentTheme === DARK_THEME
		? "Switch to light mode"
		: "Switch to dark mode";
}

/**
 * Toggle between light and dark themes and return the new theme
 */
function toggleThemeStandalone(currentTheme) {
	const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;

	applyTheme(newTheme);
	localStorage.setItem(THEME_STORAGE_KEY, newTheme);

	return newTheme;
}

/**
 * Initialize theme system with optional callback for theme changes
 */
function initThemeSystem(onThemeChange) {
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

class ThemeManager {
	currentTheme = null;
	listeners = [];
	isInitialized = false;

	/**
	 * Initialize the theme manager
	 */
	init() {
		if (this.isInitialized) return this.currentTheme;

		this.currentTheme = initThemeSystem((newTheme) => {
			this.notifyListeners(newTheme);
		});

		this.isInitialized = true;
		return this.currentTheme;
	}

	/**
	 * Auto-initialize theme on page load
	 */
	autoInit() {
		// Set up theme change listener to update UI
		this.addListener((_theme) => {
			this.updateThemeButton("theme-toggle");
		});

		// Set up toggle button listener
		const toggleButton = document.getElementById("theme-toggle");
		if (toggleButton) {
			toggleButton.addEventListener("click", () => this.toggleTheme());
		}

		// Initialize the theme system
		this.init();

		// Update button UI with current theme
		this.updateThemeButton("theme-toggle");
	}

	/**
	 * Get the current theme
	 */
	getCurrentTheme() {
		return this.currentTheme || getInitialTheme();
	}

	/**
	 * Toggle theme and update all UI components
	 */
	toggleTheme() {
		const currentTheme = this.getCurrentTheme();
		const newTheme = toggleThemeStandalone(currentTheme);
		this.currentTheme = newTheme;
		this.notifyListeners(newTheme);
		return newTheme;
	}

	/**
	 * Add a listener for theme changes
	 * Listener function receives (theme: string) as argument
	 */
	addListener(listener) {
		this.listeners.push(listener);

		// Immediately call listener with current theme if already initialized
		if (this.isInitialized) {
			listener(this.currentTheme);
		}

		// Return unsubscribe function
		return () => {
			const index = this.listeners.indexOf(listener);
			if (index > -1) {
				this.listeners.splice(index, 1);
			}
		};
	}

	/**
	 * Remove a listener
	 */
	removeListener(listener) {
		const index = this.listeners.indexOf(listener);
		if (index > -1) {
			this.listeners.splice(index, 1);
		}
	}

	/**
	 * Notify all listeners of theme change
	 */
	notifyListeners(theme) {
		for (const listener of this.listeners) {
			try {
				listener(theme);
			} catch (error) {
				console.error("Error in theme listener:", error);
			}
		}
	}

	/**
	 * Update theme toggle button UI
	 */
	updateThemeButton(buttonId = "theme-toggle") {
		const button = document.getElementById(buttonId);
		if (!button) return;

		const theme = this.getCurrentTheme();
		const icon = button.querySelector(".theme-icon");
		if (icon) {
			icon.textContent = getThemeIcon(theme);
		}

		button.setAttribute("aria-label", getThemeToggleLabel(theme));
	}

	/**
	 * Get theme icon for current theme
	 */
	getCurrentIcon() {
		return getThemeIcon(this.getCurrentTheme());
	}

	/**
	 * Get theme toggle label for current theme
	 */
	getCurrentLabel() {
		return getThemeToggleLabel(this.getCurrentTheme());
	}
}

// Create singleton instance
const themeManager = new ThemeManager();

// Auto-initialize if script is loaded in browser
// Wait for DOM to be ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => themeManager.autoInit());
} else {
	themeManager.autoInit();
}

// Export convenience functions for backward compatibility
globalThis.getCurrentTheme = () => themeManager.getCurrentTheme();
globalThis.toggleTheme = () => themeManager.toggleTheme();
globalThis.addThemeListener = (listener) => themeManager.addListener(listener);
globalThis.removeThemeListener = (listener) =>
	themeManager.removeListener(listener);
globalThis.updateThemeButton = (buttonId) =>
	themeManager.updateThemeButton(buttonId);
