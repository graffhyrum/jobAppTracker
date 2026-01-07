// src/presentation/scripts/feature-flags.ts
(() => {
  const STORAGE_KEY = "job-app-tracker-feature-flags";
  const DEFAULT_FLAGS = {
    enableTestTools: false
  };
  let flags;
  const loadFlags = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_FLAGS, ...parsed };
      }
    } catch {}
    return DEFAULT_FLAGS;
  };
  const saveFlags = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch {}
  };
  const notifyChange = () => {
    globalThis.dispatchEvent(new CustomEvent("featureFlagsChanged", {
      detail: { flags: { ...flags } }
    }));
  };
  const exposeToConsole = () => {
    globalThis.featureFlags = {
      getFlags: () => ({ ...flags }),
      enable: (flag) => {
        if (flag in flags) {
          flags[flag] = true;
          saveFlags();
          notifyChange();
        }
      },
      disable: (flag) => {
        if (flag in flags) {
          flags[flag] = false;
          saveFlags();
          notifyChange();
        }
      },
      toggle: (flag) => {
        if (flag in flags) {
          const current = flags[flag];
          flags[flag] = !current;
          saveFlags();
          notifyChange();
        }
      },
      reset: () => {
        flags = { ...DEFAULT_FLAGS };
        saveFlags();
        notifyChange();
      },
      list: () => Object.keys(flags)
    };
    console.log("\uD83D\uDEA9 Feature Flags available! Use: featureFlags.list(), featureFlags.enable('enableTestTools'), featureFlags.disable('enableTestTools'), featureFlags.toggle('enableTestTools')");
  };
  const initialize = () => {
    flags = loadFlags();
    exposeToConsole();
  };
  const isEnabled = (flag) => {
    return flags[flag];
  };
  const getFeatureFlags = () => {
    return { ...flags };
  };
  const getFeatureFlagManager = () => ({
    isEnabled,
    getFlags: getFeatureFlags
  });
  const isFeatureEnabled = (flag) => {
    return isEnabled(flag);
  };
  globalThis.isFeatureEnabled = isFeatureEnabled;
  globalThis.getFeatureFlags = getFeatureFlags;
  globalThis.getFeatureFlagManager = getFeatureFlagManager;
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
  globalThis.addEventListener("featureFlagsChanged", updateDbSelectorVisibility);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateDbSelectorVisibility);
  } else {
    updateDbSelectorVisibility();
  }
  initialize();
})();
