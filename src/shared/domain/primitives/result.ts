/**
 * Result pattern implementation for explicit error handling without exceptions in domain logic.
 * Inspired by: https://medium.com/@vlad.st星之星/demystifying-the-result-pattern-in-typescript-a-beginners-guide-92916f8a2f02
 */

export type Result<T, E extends Error = Error> =
  | { isOk: true; value: T }
  | { isOk: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({
  isOk: true,
  value,
});

export const Err = <E extends Error = Error>(error: E): Result<never, E> => ({
  isOk: false,
  error,
});

export const isOk = <T, E extends Error>(
  result: Result<T, E>,
): result is { isOk: true; value: T } => result.isOk;

export const isErr = <T, E extends Error>(
  result: Result<T, E>,
): result is { isOk: false; error: E } => !result.isOk;

export const map = <T, U, E extends Error>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> => (result.isOk ? Ok(fn(result.value)) : result);

export const flatMap = <T, U, E extends Error>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> => (result.isOk ? fn(result.value) : result);

export const mapErr = <T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> => (result.isOk ? result : Err(fn(result.error)));

export const unwrap = <T, E extends Error>(result: Result<T, E>, defaultValue?: T): T =>
  result.isOk ? result.value : (defaultValue as T);

export const unwrapOrElse = <T, E extends Error>(result: Result<T, E>, fn: (error: E) => T): T =>
  result.isOk ? result.value : fn(result.error);
