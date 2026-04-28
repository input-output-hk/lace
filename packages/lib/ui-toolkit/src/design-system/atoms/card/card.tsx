import type { StyleProp, ViewProps, ViewStyle } from 'react-native';

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { BlurView } from '..';
import { useTheme } from '../../../design-tokens';
import { radius, spacing } from '../../../design-tokens';

import type { Theme } from '../../../design-tokens';

export type CardProps = ViewProps & {
  cardStyle?: StyleProp<ViewStyle>;
  blur?: boolean;
};

export const Card = ({
  cardStyle,
  children,
  blur,
  ...restProps
}: CardProps) => {
  const { theme } = useTheme();
  const defaultCardStyle = styles(theme);
  const ViewComponent = blur ? BlurView : View;

  const style = useMemo(
    () => [defaultCardStyle.default, cardStyle].filter(Boolean),
    [defaultCardStyle.default, cardStyle],
  );

  return (
    <ViewComponent style={style} {...restProps}>
      {children}
    </ViewComponent>
  );
};

const styles = (theme: Theme) =>
  StyleSheet.create({
    default: {
      backgroundColor: theme.background.secondary,
      borderRadius: radius.S,
      borderColor: theme.border.middle,
      borderWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border.top,
      borderBottomColor: theme.border.bottom,
      padding: spacing.M,
      flexDirection: 'column',
      gap: spacing.S,
      overflow: 'hidden',
    },
  });
