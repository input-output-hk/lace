import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Icon } from '../../atoms/icons/Icon';
import { Text } from '../../atoms/text/text';
import { getIsDark, getIsWideLayout } from '../../util';

import type { Theme } from '../../../design-tokens';

export type WarningAlertProps = {
  title: string;
  body: string;
  testID?: string;
};

/**
 * Amber advisory block — alert icon beside a heading and a body line.
 *
 * Offers no press handler and no dismiss control, so a caller cannot turn a
 * standing warning into something the user taps away.
 */
export const WarningAlert = ({
  title,
  body,
  testID = 'warning-alert',
}: WarningAlertProps) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // The heading drops to body size on mobile, where 16px crowds the block.
  const isWideLayout = getIsWideLayout(width);
  const Title = isWideLayout ? Text.M : Text.S;

  // Amber reads at 4.4:1 on the dark badge but only 1.3:1 on the light one,
  // where nothing in the amber range clears 3:1 against so pale a tint.
  const iconColor = getIsDark(theme) ? theme.brand.yellow : theme.text.primary;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.iconBase}>
        <View style={styles.iconTint}>
          <Icon
            name="AlertTriangle"
            size={16}
            color={iconColor}
            testID={`${testID}-icon`}
          />
        </View>
      </View>
      <View style={styles.copy}>
        <Title weight={isWideLayout ? '400' : '500'} testID={`${testID}-title`}>
          {title}
        </Title>
        <Text.S weight="300" testID={`${testID}-body`}>
          {body}
        </Text.S>
      </View>
    </View>
  );
};

/** Diameter that makes the badge's 14px corner radius a full circle. */
const ICON_BADGE_SIZE = 28;

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.S,
      padding: spacing.M,
      borderRadius: radius.S,
      borderWidth: 1,
      borderColor: theme.brand.yellow,
      // Amber at 10%, so the page shows through and the copy keeps the theme's
      // own text colour in both light and dark.
      backgroundColor: `${theme.brand.yellow}1A`,
    },
    // Two layers because RN takes a single backgroundColor per view, and the
    // amber sits over a theme-aware tertiary that inverts between light and dark.
    iconBase: {
      backgroundColor: theme.background.tertiary,
      borderRadius: ICON_BADGE_SIZE / 2,
    },
    iconTint: {
      width: ICON_BADGE_SIZE,
      height: ICON_BADGE_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: ICON_BADGE_SIZE / 2,
      backgroundColor: `${theme.brand.yellowSecondary}33`,
    },
    copy: {
      flex: 1,
      gap: spacing.XS,
    },
  });
