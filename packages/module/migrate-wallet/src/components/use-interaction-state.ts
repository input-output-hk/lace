import { useMemo, useState } from 'react';

/**
 * Hover and focus state for a bare `Pressable`. The wizard's two custom
 * controls are Pressables, and without this they are the flow's only controls
 * giving a pointer no feedback and a keyboard no visible focus.
 *
 * Both states are reported as false while disabled, and derived at read time
 * rather than guarded on entry. react-native-web reimplements most of what
 * `<button disabled>` guarantees — press inert, out of tab order,
 * aria-disabled — but never focus: its focus handler has no `disabled` check.
 * Guarding `onFocus` alone would not be enough either, because `isFocused` is
 * already true when `disabled` flips mid-interaction, which is exactly the
 * case that matters: submitting the phrase freezes Back and Cancel, and a
 * click on the frozen control would otherwise light its focus ring — the
 * loudest "act now" signal these components have — as the sole response to an
 * interaction refused on purpose.
 */
export const useInteractionState = (disabled = false) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handlers = useMemo(
    () => ({
      onHoverIn: () => {
        if (!disabled) setIsHovered(true);
      },
      onHoverOut: () => {
        setIsHovered(false);
      },
      onFocus: () => {
        if (!disabled) setIsFocused(true);
      },
      onBlur: () => {
        setIsFocused(false);
      },
    }),
    [disabled],
  );

  return {
    isHovered: isHovered && !disabled,
    isFocused: isFocused && !disabled,
    handlers,
  };
};
