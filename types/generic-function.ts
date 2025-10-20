/** biome-ignore-all lint/suspicious/noExplicitAny: any is required here */

/*
 * Generic function type, consolidated here to minimize biome escape hatches
 */
export type Fn<
	returns = unknown,
	args extends readonly any[] = readonly any[],
> = (...args: args) => returns;
