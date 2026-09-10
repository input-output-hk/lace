import { BlurView, Icon, useTheme } from '@lace-lib/ui-toolkit';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useInteractionState } from './use-interaction-state';

import type { IconName } from '@lace-lib/ui-toolkit';

const DIAMETER = 40;
const ICON_SIZE = 18;
/** Grows the touch target to the 44px minimum without growing the circle. */
const HIT_SLOP = (44 - DIAMETER) / 2;

export interface GlassNavButtonProps {
  iconName: IconName;
  /** Names the control for assistive tech; there is no visible label. */
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
}

/**
 * A circular translucent control for the wizard's header corners.
 *
 * Back and Cancel used to be full labelled buttons — a pill in the header and a
 * second row under the primary action. Between them they cost a whole row of
 * vertical space on every step to say two words the icons already say.
 *
 * `BlurView` degrades on its own: a real blur on iOS, `backdrop-filter` on web,
 * and a plain translucent `View` on Android, so no platform gets a broken
 * control.
 */
export const GlassNavButton = ({
  iconName,
  accessibilityLabel,
  onPress,
  disabled = false,
  testID,
}: GlassNavButtonProps) => {
  const { theme } = useTheme();
  const { isHovered, isFocused, handlers } = useInteractionState(disabled);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={HIT_SLOP}
      {...handlers}
      testID={testID}
      style={({ pressed }) => [
        styles.pressable,
        (pressed || isHovered) && styles.raised,
        disabled && styles.disabled,
      ]}>
      <BlurView intensity={40} style={styles.blur}>
        <View
          style={[
            styles.face,
            {
              borderColor: isFocused ? theme.border.focused : theme.border.top,
            },
            // Focus has to read at a glance for a keyboard user, so it thickens
            // the ring rather than only recolouring it.
            isFocused && styles.focused,
          ]}>
          <Icon name={iconName} size={ICON_SIZE} color={theme.text.primary} />
        </View>
      </BlurView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    width: DIAMETER,
    height: DIAMETER,
    borderRadius: DIAMETER / 2,
    // Clips the blur to the circle; without it iOS renders a blurred square.
    overflow: 'hidden',
  },
  raised: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.35,
  },
  blur: {
    flex: 1,
  },
  face: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DIAMETER / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  focused: {
    borderWidth: 2,
  },
});
