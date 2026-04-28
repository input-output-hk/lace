import type { ViewStyle } from 'react-native';

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { spacing, useTheme, radius } from '../../../design-tokens';
import { Card, Column, Divider, Row, Text, Button, Icon } from '../../atoms';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms';

interface PopUpWindowProps {
  bodyContent: string;
  bodyTitle?: string;
  icon?: IconName;
  iconSize?: number;
  title?: string;
  titleIcon?: IconName;
  onClose?: () => void;
  primaryButtonLabel?: string;
  onPrimaryButtonPress?: () => void;
  secondaryButtonLabel?: string;
  onSecondaryButtonPress?: () => void;
  cardStyle?: ViewStyle;
}

export const PopUpWindow = ({
  bodyContent,
  bodyTitle,
  icon,
  iconSize = 64,
  title,
  titleIcon,
  onClose,
  primaryButtonLabel,
  onPrimaryButtonPress,
  secondaryButtonLabel,
  onSecondaryButtonPress,
  cardStyle,
}: PopUpWindowProps) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  const shouldShowTitleBar = !!title || !!titleIcon || !!onClose;

  const renderTitleBar = useCallback(() => {
    if (!shouldShowTitleBar) return null;

    return (
      <Column gap={spacing.S}>
        <Row justifyContent="space-between" alignItems="center">
          <Row alignItems="center" gap={spacing.XS}>
            {!!titleIcon && <Icon name={titleIcon} size={16} />}
            {!!title && <Text.M>{title}</Text.M>}
          </Row>
          {!!onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="Cancel" />
            </TouchableOpacity>
          )}
        </Row>
        <Divider />
      </Column>
    );
  }, [shouldShowTitleBar, title, titleIcon, onClose, styles.closeButton]);

  const renderBodyIcon = useCallback(() => {
    if (!icon) return null;

    return (
      <Column alignItems="center">
        <Icon name={icon} size={iconSize} variant="solid" />
      </Column>
    );
  }, [icon, iconSize]);

  const renderButtons = useCallback(() => {
    const hasButtons = Boolean(
      (primaryButtonLabel && onPrimaryButtonPress) ||
        (secondaryButtonLabel && onSecondaryButtonPress),
    );

    if (!hasButtons) return null;

    return (
      <Column gap={spacing.S}>
        <Divider />
        <Row gap={spacing.S}>
          {!!secondaryButtonLabel && !!onSecondaryButtonPress && (
            <Button.Secondary
              flex={1}
              label={secondaryButtonLabel}
              onPress={onSecondaryButtonPress}
            />
          )}
          {!!primaryButtonLabel && !!onPrimaryButtonPress && (
            <Button.Primary
              flex={1}
              label={primaryButtonLabel}
              onPress={onPrimaryButtonPress}
            />
          )}
        </Row>
      </Column>
    );
  }, [
    primaryButtonLabel,
    secondaryButtonLabel,
    onPrimaryButtonPress,
    onSecondaryButtonPress,
  ]);

  return (
    <Card blur cardStyle={{ ...styles.card, ...cardStyle }}>
      <Column gap={spacing.M}>
        {renderTitleBar()}

        <Column alignItems="center" gap={spacing.S} style={styles.container}>
          {renderBodyIcon()}
          {!!bodyTitle && <Text.L>{bodyTitle}</Text.L>}
          <Text.M>{bodyContent}</Text.M>
        </Column>

        {renderButtons()}
      </Column>
    </Card>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.M,
      backgroundColor: theme.background.primary,
      minWidth: 300,
    },
    closeButton: {
      padding: spacing.XS,
    },
    container: {
      marginVertical: spacing.XXL,
    },
  });
