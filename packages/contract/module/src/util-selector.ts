/**
 * The property `markParameterizedSelector` sets on a selector to mark it as
 * taking arguments.
 */
export const IS_PARAMETERIZED = Symbol.for('lace.isParameterized');

/**
 * Marks a selector that takes arguments, so the wallet's `stateObservables`
 * expose it as an observable of a function of those arguments rather than of
 * a value.
 *
 * @param selector - The selector, which takes the state and then its arguments.
 * @returns The same selector, marked.
 *
 * @example
 * ```ts
 * const selectById = markParameterizedSelector(
 *   (state, id) => state.items[id]
 * );
 * ```
 */
export const markParameterizedSelector = <S extends Function>(
  selector: S,
): S => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (selector as any)[IS_PARAMETERIZED] = true;
  return selector;
};
