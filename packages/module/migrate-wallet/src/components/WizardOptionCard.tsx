import type { ViewStyle } from 'react-native';

import {
  Column,
  Icon,
  radius,
  Row,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useInteractionState } from './use-interaction-state';

import type { IconName } from '@lace-lib/ui-toolkit';

/** Matches the onboarding option cards, so the two screens read as one system. */
const ICON_SIZE = 24;

/**
 * Gap between stacked option cards. Same 12px the onboarding option cards use,
 * so a list of these reads at the same rhythm on either screen.
 */
export const OPTION_CARD_GAP = spacing.S + spacing.XS;

/**
 * Top margin for a card list that sits directly under the frame's title with
 * no body copy between them. Lands the cards a full spacing.L below it once
 * the frame's own title margin is counted, matching the text-to-cards rhythm
 * on the steps that do have body copy.
 */
export const optionGroupStyle: ViewStyle = { marginTop: spacing.M };

export interface WizardOptionCardProps {
  /**
   * Headline. Omit when `leading` is a brand wordmark that already names the
   * option, so the card does not print the same word twice.
   */
  title?: string;
  description?: string;
  /** Brand mark rendered ahead of the text, taking precedence over `icon`. */
  leading?: React.ReactNode;
  /**
   * Leading glyph, for options with no brand mark of their own. Matches the
   * onboarding option cards, whose layout these mirror.
   */
  icon?: IconName;
  /** Names the card for assistive tech when `title` is omitted. */
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  testID: string;
}

/**
 * The wizard's one selectable-option affordance — destinations, devices,
 * blockchains and wallets are all "pick one from this list". `minHeight`
 * matters as much as the border: the `<Text onPress>` rows this replaces were
 * ~20px, under the 44px minimum target. Hover and focus match the `Button`
 * atom; without them these cards were the flow's only control giving a pointer
 * no feedback and a keyboard no visible focus.
 */
export const WizardOptionCard = ({
  title,
  description,
  leading,
  icon,
  accessibilityLabel,
  onPress,
  disabled = false,
  testID,
}: WizardOptionCardProps) => {
  const { theme } = useTheme();
  const { isHovered, isFocused, handlers } = useInteractionState(disabled);

  // A brand mark wins over an icon name: hardware and blockchain options are
  // identified by their own logo, and only the generic options fall back to a
  // wordless glyph.
  const leadingNode =
    leading ??
    (icon === undefined ? undefined : (
      <Icon name={icon} size={ICON_SIZE} color={theme.text.primary} />
    ));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      {...handlers}
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor:
            pressed || isFocused || isHovered
              ? theme.border.focused
              : theme.border.top,
          // `primary` is the onboarding option cards' own fill — white in light
          // theme, near-black in dark — so the two screens read as one system.
          // `secondary` is the tinted overlay, which is why these came out grey.
          backgroundColor:
            pressed || isHovered
              ? theme.background.secondary
              : theme.background.primary,
        },
        // Focus needs to read at a glance for a keyboard user, so it thickens
        // the border rather than only recolouring it.
        isFocused && styles.focused,
        disabled && styles.disabled,
      ]}>
      <Row gap={spacing.M} alignItems="center">
        {leadingNode !== undefined && <View>{leadingNode}</View>}
        <Column gap={spacing.XS} style={styles.text}>
          {title !== undefined && <Text.M>{title}</Text.M>}
          {!!description && <Text.S variant="tertiary">{description}</Text.S>}
        </Column>
        {/* Quiet by design: the caret marks the row as selectable without
            competing with the option's own name. */}
        <Icon name="CaretRight" size={16} color={theme.text.tertiary} />
      </Row>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 64,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.M,
    paddingHorizontal: spacing.M,
    paddingVertical: spacing.M,
  },
  text: {
    flex: 1,
  },
  focused: {
    borderWidth: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
