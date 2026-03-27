/**
 * Shared math utilities for analytics computations.
 * Pure functions with no domain dependencies.
 */

export function computeMedian(numbers: number[]): number {
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

export function computeAverage(numbers: number[]): number {
	if (numbers.length === 0) return 0;
	const sum = numbers.reduce((acc, val) => acc + val, 0);
	return sum / numbers.length;
}

export function computeSuccessRate(offers: number, rejected: number): number {
	return offers + rejected > 0 ? offers / (offers + rejected) : 0;
}
