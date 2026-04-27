/**
 * Symbol to mark parameterized selectors for StateObservables detection
 */
export const IS_PARAMETERIZED = Symbol.for('lace.isParameterized');

/**
 * Marks a selector as parameterized so StateObservables emits it as a function
 *
 * @param selector - The selector function that takes (state, ...params)
 * @returns The same selector with IS_PARAMETERIZED marker attached (runtime only)
 *
 * @example
 * const selectById = markParameterizedSelector(
 *   (state, id) => state.items[id]
 * );
 */
export const markParameterizedSelector = <S extends Function>(
  selector: S,
): S => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (selector as any)[IS_PARAMETERIZED] = true;
  return selector;
};
