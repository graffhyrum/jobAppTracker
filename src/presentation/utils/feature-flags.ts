interface FeatureFlags {
	enableTestTools: boolean;
}

const STORAGE_KEY = "job-app-tracker-feature-flags";
const DEFAULT_FLAGS: FeatureFlags = {
	enableTestTools: false,
};

// Private state
let flags: FeatureFlags = loadFlags();

const getWindow = () => {
	if (globalThis.window === undefined) {
		return null;
	}
	return globalThis.window;
};

function loadFlags(): FeatureFlags {
	const window = getWindow();
	if (!window) {
		return DEFAULT_FLAGS;
	}

	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return { ...DEFAULT_FLAGS, ...parsed };
		}
	} catch {
		// Ignore parsing errors, use defaults
	}

	return DEFAULT_FLAGS;
}

function saveFlags(): void {
	const window = getWindow();
	if (!window) {
		return;
	}

	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
	} catch {
		// Ignore storage errors
	}
}

function notifyChange(): void {
	const window = getWindow();
	if (!window) {
		return;
	}

	// Dispatch custom event for UI components to listen to
	window.dispatchEvent(
		new CustomEvent("featureFlagsChanged", {
			detail: { flags: { ...flags } },
		}),
	);
}

function exposeToConsole(): void {
	const window = getWindow();
	if (!window) {
		return;
	}

	// Expose feature flag manager to console for debugging
	// biome-ignore lint/suspicious/noExplicitAny: Intentional global window assignment
	const windowAny = window as any;
	windowAny.featureFlags = {
		// Get current flag values
		getFlags: (): FeatureFlags => ({ ...flags }),

		// Enable a specific flag
		enable: (flag: keyof FeatureFlags): void => {
			flags[flag] = true;
			saveFlags();
			notifyChange();
		},

		// Disable a specific flag
		disable: (flag: keyof FeatureFlags): void => {
			flags[flag] = false;
			saveFlags();
			notifyChange();
		},

		// Toggle a specific flag
		toggle: (flag: keyof FeatureFlags): void => {
			flags[flag] = !flags[flag];
			saveFlags();
			notifyChange();
		},

		// Reset all flags to defaults
		reset: (): void => {
			flags = { ...DEFAULT_FLAGS };
			saveFlags();
			notifyChange();
		},

		// List all available flags
		list: (): string[] => Object.keys(flags),
	};

	// Add a helpful console message
	const availableFlags = Object.keys(flags);
	const exampleFlag = availableFlags[0];
	const methods = Object.keys(windowAny.featureFlags)
		.filter((method) => typeof windowAny.featureFlags[method] === "function")
		.filter((method) => !["getFlags", "list"].includes(method));

	const examples = methods
		.map((method) => `featureFlags.${method}('${exampleFlag}')`)
		.join(", ");
	console.log(
		`🚩 Feature Flags available! Methods: featureFlags.list(), featureFlags.getFlags(), ${examples}`,
	);
}

// Initialize console exposure
exposeToConsole();

// Public API
const FeatureFlagManager = {
	isEnabled: (flag: keyof FeatureFlags): boolean => flags[flag],
	getFlags: (): FeatureFlags => ({ ...flags }),
};

export const getFeatureFlagManager = (): typeof FeatureFlagManager =>
	FeatureFlagManager;

// Convenience functions
export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
	return FeatureFlagManager.isEnabled(flag);
};

export const getFeatureFlags = (): FeatureFlags => {
	return FeatureFlagManager.getFlags();
};
