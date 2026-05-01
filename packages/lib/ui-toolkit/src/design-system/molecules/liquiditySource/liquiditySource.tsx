import type { StyleProp, ViewStyle } from 'react-native';

import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Toggle } from '../../atoms';
import { Column } from '../../atoms/column/column';
import { Row } from '../../atoms/row/row';
import { Text } from '../../atoms/text/text';

import type { Theme } from '../../../design-tokens';
import type { ImageSource } from 'expo-image';

const AVATAR_SIZE = 48;

export interface LiquiditySourceBase {
  name: string;
  icon?: ImageSource;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export interface LiquiditySourceToggleProps extends LiquiditySourceBase {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
}

export interface LiquiditySourceQuoteProps extends LiquiditySourceBase {
  quote: string;
}

const LiquiditySourceRow = ({
  name,
  style,
  testID,
  children,
}: LiquiditySourceBase & { children: React.ReactNode }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getLiquiditySourceStyles(theme), [theme]);

  return (
    <Row style={[styles.container, style]} testID={testID}>
      <Column style={styles.labelContainer}>
        <Text.XS weight="medium" numberOfLines={1}>
          {name}
        </Text.XS>
      </Column>
      <Column style={styles.trailingContainer}>{children}</Column>
    </Row>
  );
};

export const LiquiditySourceToggle = ({
  value,
  onValueChange,
  disabled,
  ...baseProps
}: LiquiditySourceToggleProps) => (
  <LiquiditySourceRow {...baseProps}>
    <Toggle value={value} onValueChange={onValueChange} disabled={disabled} />
  </LiquiditySourceRow>
);

export const LiquiditySourceQuote = ({
  quote,
  ...baseProps
}: LiquiditySourceQuoteProps) => (
  <LiquiditySourceRow {...baseProps}>
    <Text.XS variant="secondary" weight="medium">
      {quote}
    </Text.XS>
  </LiquiditySourceRow>
);

export const getLiquiditySourceStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.background.primary,
      borderRadius: radius.M,
      borderColor: theme.border.middle,
      borderWidth: 1,
      padding: spacing.M,
      alignItems: 'center',
      gap: spacing.S,
      minHeight: 80,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      borderColor: theme.border.middle,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden',
    },
    avatarImage: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
    },
    labelContainer: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
      paddingRight: spacing.S,
    },
    trailingContainer: {
      marginLeft: 'auto',
      flexShrink: 0,
    },
  });
