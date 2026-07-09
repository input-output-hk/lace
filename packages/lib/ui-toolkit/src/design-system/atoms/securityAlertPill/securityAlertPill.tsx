import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Icon } from '../icons/Icon';
import { Text } from '../text/text';

export interface SecurityAlertPillProps {
  /** Pill label — the pill's own border + icon supply the visual
   *  encapsulation, so pass the raw label ("At risk"), not a bracketed
   *  string. */
  label: string;
  /** When set, the pill becomes a Pressable and the expander chevron
   *  renders. Callers wire their own semantic (inline expand, navigate
   *  to detail view, etc.). */
  onPress?: () => void;
  /** Flips the chevron and the a11y `expanded` state. Ignored when
   *  `onPress` is not provided. */
  expanded?: boolean;
  testID?: string;
}

/**
 * Compact red-bordered pill used to flag an account (or similar entity)
 * that has been detected as compromised. Purely presentational — the
 * decision of *when* to render the pill lives with the caller.
 *
 * Shared between `AccountSecurityAlertChip` in `@lace-module/app-mobile`
 * and `WalletHierarchy` in ui-toolkit so the visual can be iterated in a
 * single place.
 */
export const SecurityAlertPill = ({
  label,
  onPress,
  expanded = false,
  testID,
}: SecurityAlertPillProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const isPressable = typeof onPress === 'function';

  return (
    <Pressable
      accessibilityRole={isPressable ? 'button' : undefined}
      accessibilityState={isPressable ? { expanded } : undefined}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!isPressable}
      style={styles.container}
      testID={testID ?? 'security-alert-pill'}>
      <Icon name="AlertTriangle" size={12} color={theme.background.negative} />
      <Text.XS style={styles.label}>{label}</Text.XS>
      {isPressable ? (
        <Icon
          name={expanded ? 'ArrowUp' : 'ArrowDown'}
          size={12}
          color={theme.background.negative}
        />
      ) : null}
    </Pressable>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.XS,
      paddingHorizontal: spacing.S,
      paddingVertical: spacing.XS,
      borderRadius: radius.M,
      borderWidth: 1,
      borderColor: theme.background.negative,
      backgroundColor: theme.background.secondary,
    },
    label: {
      color: theme.background.negative,
    },
  });
