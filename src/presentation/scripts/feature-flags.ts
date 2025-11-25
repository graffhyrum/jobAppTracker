// Feature Flags Manager - Bundled for browser
(() => {
	interface FeatureFlags {
		enableTestTools: boolean;
	}

	const STORAGE_KEY = "job-app-tracker-feature-flags";
	const DEFAULT_FLAGS: FeatureFlags = {
		enableTestTools: false,
	};

	let flags: FeatureFlags;

	const loadFlags = (): FeatureFlags => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				return { ...DEFAULT_FLAGS, ...parsed };
			}
		} catch {
			// Ignore parsing errors, use defaults
		}

		return DEFAULT_FLAGS;
	};

	const saveFlags = (): undefined => {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
		} catch {
			// Ignore storage errors
		}
	};

	const notifyChange = (): undefined => {
		// Dispatch custom event for UI components to listen to
		globalThis.dispatchEvent(
			new CustomEvent("featureFlagsChanged", {
				detail: { flags: { ...flags } },
			}),
		);
	};

	const exposeToConsole = (): undefined => {
		// Expose feature flag manager to console for debugging
		// biome-ignore lint/suspicious/noExplicitAny: Intentional global assignment
		(globalThis as any).featureFlags = {
			// Get current flag values
			getFlags: (): FeatureFlags => ({ ...flags }),

			// Enable a specific flag
			enable: (flag: string): undefined => {
				if (flag in flags) {
					flags[flag as keyof FeatureFlags] = true;
					saveFlags();
					notifyChange();
				}
			},

			// Disable a specific flag
			disable: (flag: string): undefined => {
				if (flag in flags) {
					flags[flag as keyof FeatureFlags] = false;
					saveFlags();
					notifyChange();
				}
			},

			// Toggle a specific flag
			toggle: (flag: string): undefined => {
				if (flag in flags) {
					const current = flags[flag as keyof FeatureFlags];
					flags[flag as keyof FeatureFlags] = !current;
					saveFlags();
					notifyChange();
				}
			},

			// Reset all flags to defaults
			reset: (): undefined => {
				flags = { ...DEFAULT_FLAGS };
				saveFlags();
				notifyChange();
			},

			// List all available flags
			list: (): string[] => Object.keys(flags),
		};

		// Add helpful console message
		console.log(
			"🚩 Feature Flags available! Use: featureFlags.list(), featureFlags.enable('enableTestTools'), featureFlags.disable('enableTestTools'), featureFlags.toggle('enableTestTools')",
		);
	};

	const initialize = (): void => {
		flags = loadFlags();
		exposeToConsole();
	};

	const isEnabled = (flag: keyof FeatureFlags): boolean => {
		return flags[flag];
	};

	const getFeatureFlags = (): FeatureFlags => {
		return { ...flags };
	};

	const getFeatureFlagManager = () => ({
		isEnabled,
		getFlags: getFeatureFlags,
	});

	// Convenience functions
	const isFeatureEnabled = (flag: string): boolean => {
		return isEnabled(flag as keyof FeatureFlags);
	};

	// Expose to global scope for use by other scripts
	// biome-ignore lint/suspicious/noExplicitAny: Intentional global assignment
	(globalThis as any).isFeatureEnabled = isFeatureEnabled;
	// biome-ignore lint/suspicious/noExplicitAny: Intentional global assignment
	(globalThis as any).getFeatureFlags = getFeatureFlags;
	// biome-ignore lint/suspicious/noExplicitAny: Intentional global assignment
	(globalThis as any).getFeatureFlagManager = getFeatureFlagManager;

	// Auto-initialize DB selector visibility
	const updateDbSelectorVisibility = () => {
		const dbSelector = document.querySelector('[data-testid="db-selector"]');
		if (dbSelector) {
			const shouldShow = isFeatureEnabled("enableTestTools");
			if (shouldShow) {
				dbSelector.classList.add("visible");
			} else {
				dbSelector.classList.remove("visible");
			}
		}
	};

	// Listen for feature flag changes
	globalThis.addEventListener(
		"featureFlagsChanged",
		updateDbSelectorVisibility,
	);

	// Update visibility on page load
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", updateDbSelectorVisibility);
	} else {
		updateDbSelectorVisibility();
	}

	// Initialize the module
	initialize();
})();
