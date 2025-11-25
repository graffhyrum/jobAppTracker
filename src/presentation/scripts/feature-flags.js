(() => {
	class j {
		static STORAGE_KEY = "job-app-tracker-feature-flags";
		static DEFAULT_FLAGS = { enableTestTools: !1 };
		flags;
		constructor() {
			(this.flags = this.loadFlags()), this.exposeToConsole();
		}
		loadFlags() {
			try {
				const h = localStorage.getItem(j.STORAGE_KEY);
				if (h) {
					const x = JSON.parse(h);
					return { ...j.DEFAULT_FLAGS, ...x };
				}
			} catch {}
			return j.DEFAULT_FLAGS;
		}
		saveFlags() {
			try {
				localStorage.setItem(j.STORAGE_KEY, JSON.stringify(this.flags));
			} catch {}
		}
		exposeToConsole() {
			(window.featureFlags = {
				getFlags: () => ({ ...this.flags }),
				enable: (h) => {
					if (h in this.flags)
						(this.flags[h] = !0), this.saveFlags(), this.notifyChange();
				},
				disable: (h) => {
					if (h in this.flags)
						(this.flags[h] = !1), this.saveFlags(), this.notifyChange();
				},
				toggle: (h) => {
					if (h in this.flags)
						(this.flags[h] = !this.flags[h]),
							this.saveFlags(),
							this.notifyChange();
				},
				reset: () => {
					(this.flags = { ...j.DEFAULT_FLAGS }),
						this.saveFlags(),
						this.notifyChange();
				},
				list: () => Object.keys(this.flags),
			}),
				console.log(
					"\uD83D\uDEA9 Feature Flags available! Use: featureFlags.list(), featureFlags.enable('enableTestTools'), featureFlags.disable('enableTestTools'), featureFlags.toggle('enableTestTools')",
				);
		}
		notifyChange() {
			window.dispatchEvent(
				new CustomEvent("featureFlagsChanged", {
					detail: { flags: { ...this.flags } },
				}),
			);
		}
		isEnabled(h) {
			return this.flags[h];
		}
		getFlags() {
			return { ...this.flags };
		}
	}
	let k = null,
		m = () => {
			if (!k) k = new j();
			return k;
		},
		w = (h) => {
			return m().isEnabled(h);
		},
		z = () => {
			return m().getFlags();
		};
	(window.isFeatureEnabled = w),
		(window.getFeatureFlags = z),
		(window.getFeatureFlagManager = m);
	function q() {
		const h = document.querySelector('[data-testid="db-selector"]');
		if (h)
			if (w("enableTestTools")) h.classList.add("visible");
			else h.classList.remove("visible");
	}
	if (
		(window.addEventListener("featureFlagsChanged", q),
		document.readyState === "loading")
	)
		document.addEventListener("DOMContentLoaded", q);
	else q();
})();
