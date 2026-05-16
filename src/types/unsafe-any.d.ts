/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Transitional compatibility type for legacy dynamic data paths.
 *
 * Replace usages of UnsafeAny with domain-specific interfaces as each module is
 * refactored. Keeping the escape hatch centralized prevents hundreds of
 * scattered explicit `any` annotations while preserving current behavior.
 */
declare global {
  type UnsafeAny = any;
}

export {};
