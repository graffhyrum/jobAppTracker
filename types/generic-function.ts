/* oxlint-disable no-explicit-any */

/*
 * Generic function type, consolidated here to minimize oxlint escape hatches
 */
export type Fn<
	returns = unknown,
	args extends readonly any[] = readonly any[],
> = (...args: args) => returns;
