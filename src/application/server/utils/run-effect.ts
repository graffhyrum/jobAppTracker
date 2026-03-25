import { Effect, Either } from "effect";

/**
 * Run an Effect and return an Either — typed success or typed failure.
 *
 * Defects (unexpected throws) propagate as uncaught exceptions to
 * Elysia's global onError handler. Only typed failures are captured
 * in the Either.Left channel.
 *
 * Usage in route handlers:
 * ```ts
 * const result = await runEffect(manager.getJobApplication(id))
 * if (Either.isLeft(result)) {
 *   set.status = 500
 *   return `Error: ${result.left.detail}`
 * }
 * return renderRow(result.right)
 * ```
 */
export async function runEffect<T, E>(
	effect: Effect.Effect<T, E>,
): Promise<Either.Either<T, E>> {
	return Effect.runPromise(Effect.either(effect));
}
