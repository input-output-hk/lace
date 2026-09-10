import { Icon, useTheme } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { IconName } from '@lace-lib/ui-toolkit';

const BADGE_SIZE = 32;
/**
 * A glyph on a plate needs room around it: much under this and a stroke glyph
 * stops being identifiable at row size.
 */
const GLYPH_RATIO = 0.55;
/**
 * A coin face is not a glyph on a plate — it is the mark itself, so it takes
 * most of its circle the way a token logo does. Short of the edge, though: the
 * Cardano mark's outer dots need a margin or the coin reads as cropped.
 */
const COIN_GLYPH_RATIO = 0.7;

export interface IconBadgeProps {
  name: IconName;
  /** Outer plate, not the glyph: the glyph scales with it. */
  size?: number;
  /**
   * `cardano` is the ADA coin — the chain's own blue, with the mark filling it.
   * `negative` is the one hazard. Everything else is a fact, and facts share
   * the muted plate: a column of coloured badges makes none of them the thing
   * to look at.
   */
  tone?: 'cardano' | 'muted' | 'negative';
  testID?: string;
}

/**
 * A glyph on a tinted plate, marking what a row is about before the row is
 * read. The plate is what makes a column of these scannable: bare glyphs at
 * this size disappear into the text they sit beside.
 */
export const IconBadge = ({
  name,
  size = BADGE_SIZE,
  tone = 'muted',
  testID,
}: IconBadgeProps) => {
  const { theme } = useTheme();
  // `getBlockchainColor('Cardano')` is the same value; read from the token
  // directly because that helper calls `useTheme` internally.
  const plate = {
    cardano: theme.extra.chathamsBlue,
    muted: theme.background.tertiary,
    negative: theme.background.negative,
  }[tone];
  const glyph = tone === 'muted' ? theme.text.secondary : theme.brand.white;

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: plate,
        },
      ]}
      testID={testID}>
      <Icon
        name={name}
        size={Math.round(
          size * (tone === 'cardano' ? COIN_GLYPH_RATIO : GLYPH_RATIO),
        )}
        color={glyph}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
