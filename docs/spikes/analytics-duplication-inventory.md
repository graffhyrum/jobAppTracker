# Analytics Duplication Inventory

**Spike:** jobapptracker-rkw
**Date:** 2026-03-26
**Timebox:** 2 hours
**Scope:** `src/domain/use-cases/analytics*.ts`, `src/presentation/pages/analytics.ts`, `src/application/server/plugins/analytics.plugin.ts`

---

## Summary

The analytics module cluster spans four domain files (`analytics.ts`, `analytics-aggregator.ts`, `analytics-contacts.ts`, `analytics-interviews.ts`) plus one plugin and one presentation page. The investigation found **five categories of structural duplication**, two of which are high-refactor priority.

---

## Findings

### 1. Duplicated `computeMedian` Logic (HIGH)

The median computation algorithm is copy-pasted verbatim in two separate files with identical logic and identical safe-access guard patterns:

**`src/domain/use-cases/analytics-interviews.ts` lines 179–195:**

```ts
function computeMedian(numbers: number[]): number {
	if (numbers.length === 0) return 0;
	const sorted = [...numbers].sort((a, b) => a - b);
	if (sorted.length % 2 === 0) {
		const mid1 = sorted[sorted.length / 2 - 1];
		const mid2 = sorted[sorted.length / 2];
		if (mid1 !== undefined && mid2 !== undefined) {
			return (mid1 + mid2) / 2;
		}
	} else {
		const mid = sorted[Math.floor(sorted.length / 2)];
		if (mid !== undefined) return mid;
	}
	return 0;
}
```

**`src/domain/use-cases/analytics.ts` lines 340–354 (inside `computeTimeInStatus`):**

```ts
let median = 0;
if (sorted.length > 0) {
	if (sorted.length % 2 === 0) {
		const mid1 = sorted[sorted.length / 2 - 1];
		const mid2 = sorted[sorted.length / 2];
		if (mid1 !== undefined && mid2 !== undefined) {
			median = (mid1 + mid2) / 2;
		}
	} else {
		const mid = sorted[Math.floor(sorted.length / 2)];
		if (mid !== undefined) {
			median = mid;
		}
	}
}
```

`analytics-interviews.ts` extracted `computeMedian` and `computeAverage` as private helpers. `analytics.ts` inlines the same median algorithm directly inside `computeTimeInStatus` rather than calling a shared utility.

**Also duplicated:** `computeAverageDaysToResponse` and `computeMedianDaysToResponse` in `analytics-contacts.ts` (lines 98–148) each independently iterate contacts, compute days, then run the same even/odd median branch. These two functions share the data-collection loop body and both inline the median logic instead of calling a shared helper.

**Extraction target:** A shared `src/domain/use-cases/analytics-math.ts` (or `src/helpers/stats.ts`) exporting `computeMedian(numbers: number[]): number` and `computeAverage(numbers: number[]): number` would eliminate all three sites.

---

### 2. Duplicated `successRate` Calculation (HIGH)

The formula `offers / (offers + rejected)` guarded by `> 0` appears in three functions across two files:

| File                      | Function                            | Lines   |
| ------------------------- | ----------------------------------- | ------- |
| `analytics.ts`            | `computeSourceEffectiveness`        | 296–303 |
| `analytics.ts`            | `computeInterestRatingStats`        | 404–411 |
| `analytics-interviews.ts` | `computeInterviewTypeEffectiveness` | 262–271 |
| `analytics-interviews.ts` | `computeRoundAnalysis`              | 327–339 |

All four sites use the identical expression:

```ts
successRate: data.offers + data.rejected > 0
  ? data.offers / (data.offers + data.rejected)
  : 0,
```

**Extraction target:** A named helper `computeSuccessRate(offers: number, rejected: number): number` would centralize this guard and make the intent explicit.

---

### 3. Duplicated "filter by app IDs" Pattern (MEDIUM)

The pattern of building a `Set<string>` from filtered application IDs and then filtering a related collection appears three times:

**`analytics-aggregator.ts` lines 70–75 (for both contacts and interviews):**

```ts
const appIds = new Set(filteredApplications.map((app) => app.id));
const filteredContacts = allContacts.filter((contact) =>
	appIds.has(contact.jobApplicationId),
);
const filteredInterviews = allInterviews.filter((interview) =>
	appIds.has(interview.jobApplicationId),
);
```

**`analytics-aggregator.ts` lines 130–133 (`computeContactAnalyticsOnly`):**

```ts
const appIds = new Set(applications.map((app) => app.id));
const filteredContacts = allContacts.filter((contact) =>
	appIds.has(contact.jobApplicationId),
);
```

**`analytics-aggregator.ts` lines 145–148 (`computeInterviewAnalyticsOnly`):**

```ts
const appIds = new Set(applications.map((app) => app.id));
const filteredInterviews = allInterviews.filter((interview) =>
	appIds.has(interview.jobApplicationId),
);
```

**Extraction target:** A helper `filterByAppIds<T extends { jobApplicationId: string }>(items: T[], applications: JobApplication[]): T[]` would collapse all three sites.

---

### 4. Duplicated `effectiveDateRange` Resolution (MEDIUM)

The logic for resolving `effectiveDateRange` (use provided range if non-empty, else compute default) appears twice in `analytics-aggregator.ts` with identical code:

**`computeAllAnalytics` (lines 55–58) and `computeApplicationAnalytics` (lines 104–108):**

```ts
const effectiveDateRange =
	dateRange && (dateRange.startDate || dateRange.endDate)
		? dateRange
		: computeDefaultDateRange(applications);
```

**Extraction target:** A helper `resolveEffectiveDateRange(applications: JobApplication[], requested?: DateRange): DateRange` would name this intent and remove the duplication.

---

### 5. Duplicated `getCurrentStatus` + `Either.isRight` Status-Dispatch Loop (MEDIUM)

Every function in `analytics.ts` and `analytics-contacts.ts` that inspects application outcomes performs the same two-step pattern:

```ts
const statusResult = getCurrentStatus(app);
if (Either.isRight(statusResult)) {
  const status = statusResult.right;
  if (status.category === "active") { ... }
  else if (status.label === "rejected") { ... }
}
```

This appears in:

- `computeSummary` (analytics.ts:181)
- `computeStatusDistribution` (analytics.ts:222)
- `computeSourceEffectiveness` (analytics.ts:280)
- `computeInterestRatingStats` (analytics.ts:387)
- `computeResponseRate` (analytics.ts:422)
- `computeContactCountCorrelation` (analytics-contacts.ts:258)
- `computeRoundsToOffer` (analytics-interviews.ts:164)
- `computeInterviewConversionRate` (analytics-interviews.ts:206)
- `computeInterviewTypeEffectiveness` (analytics-interviews.ts:252)
- `computeRoundAnalysis` (analytics-interviews.ts:314)
- `computeFinalRoundSuccess` (analytics-interviews.ts:355)

Each call site re-unwraps `Either.isRight` and repeats the status dispatch. This is hard to extract cleanly without changing the computation shape, but a helper `getResolvedStatus(app: JobApplication): ApplicationStatus | null` that unwraps the Either would reduce the boilerplate from 3 lines to 1 at each of the 11 sites.

---

### 6. Duplicated Test Fixture Builders (LOW — Tests Only)

The `createMockApplication` and `createMockApplicationWithStatus` factory functions are copy-pasted across four test files:

| File                        | Functions present                                                                 |
| --------------------------- | --------------------------------------------------------------------------------- |
| `analytics.test.ts`         | `createMockApplication`, `createMockApplicationWithStatus`                        |
| `analytics-summary.test.ts` | `_createMockApplication` (prefixed underscore), `createMockApplicationWithStatus` |
| `analytics-status.test.ts`  | `createMockApplicationWithStatus`                                                 |
| `analytics-date.test.ts`    | `createMockApplication`, `createMockApplicationWithStatus`                        |

The function bodies are identical across all files. Minor variation: `analytics-summary.test.ts` names the no-status builder `_createMockApplication` (unused, suppressed by underscore prefix).

**Extraction target:** A shared test helper in `tests/helpers/analytics-fixtures.ts` would be imported by all four suites. The `mockUuidGenerator` seed helper is also repeated in all four files.

---

## Priority Ranking for Refactor Beads

| Priority | Pattern                                 | Files affected                                               | Lines saved (est.) |
| -------- | --------------------------------------- | ------------------------------------------------------------ | ------------------ |
| 1        | `computeMedian` duplication             | analytics.ts, analytics-contacts.ts, analytics-interviews.ts | ~40                |
| 2        | `computeSuccessRate` duplication        | analytics.ts, analytics-interviews.ts                        | ~20                |
| 3        | `filterByAppIds` duplication            | analytics-aggregator.ts                                      | ~12                |
| 4        | `resolveEffectiveDateRange` duplication | analytics-aggregator.ts                                      | ~8                 |
| 5        | `getResolvedStatus` unwrap pattern      | analytics.ts, analytics-contacts.ts, analytics-interviews.ts | ~22                |
| 6        | Test fixture builders                   | 4 test files                                                 | ~60                |

---

## Extraction Candidates

Three new files would absorb items 1–5:

- **`src/domain/use-cases/analytics-math.ts`** — `computeMedian`, `computeAverage`, `computeSuccessRate`
- **`src/domain/use-cases/analytics-utils.ts`** — `filterByAppIds`, `resolveEffectiveDateRange`, `getResolvedStatus`
- **`tests/helpers/analytics-fixtures.ts`** — shared test builders (items 6)

All three are pure functions with no side effects; extraction is mechanical and low-risk. The `analytics-math.ts` split is highest-value because `computeMedian` already has full test coverage via the `timeInStatus` and `medianDaysToOffer` test suites — the extracted version gets those tests for free.
