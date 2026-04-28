import type { ViewStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Icon, Button, Card, Column, Divider, Row, Text } from '../../atoms';
import { ProgressBar } from '../progressBar/progressBar';

import type { Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms/icons/Icon';

interface InlineWindowProps {
  title?: string;
  description?: React.ReactNode | string;
  action: () => void;
  buttonLabel?: string;
  progressBar?: boolean;
  leftIcon?: IconName;
  leftIconColor?: string;
  buttonPreIcon?: IconName;
  buttonPostIcon?: IconName;
  disabled?: boolean;
  progressValue: number;
  progressLabel?: string;
  onClose?: () => void;
  showWindowTitle?: boolean;
  loading?: boolean;
  cardStyle?: ViewStyle;
}

export const InlineWindow = React.memo(
  ({
    title,
    description,
    action,
    buttonLabel,
    progressBar = false,
    leftIcon,
    leftIconColor,
    buttonPreIcon,
    buttonPostIcon,
    disabled = false,
    progressValue,
    progressLabel,
    onClose,
    showWindowTitle = false,
    loading = false,
    cardStyle,
  }: InlineWindowProps) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);
    const { t } = useTranslation();

    const renderIcon = useCallback(() => {
      if (!leftIcon) return null;

      return (
        <Row alignItems="center" justifyContent="center">
          <Icon name={leftIcon} color={leftIconColor} />
        </Row>
      );
    }, [leftIcon, leftIconColor]);

    const renderCloseButton = useCallback(() => {
      if (!onClose) return null;

      return (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Icon name="Cancel" />
        </TouchableOpacity>
      );
    }, [onClose, styles.closeButton]);

    const renderProgressBar = useCallback(() => {
      if (!progressBar) return null;

      return (
        <View style={styles.progressContainer}>
          <ProgressBar
            progress={progressValue}
            color="primary"
            placeholder={progressLabel}
            showPercentage={true}
            isBackTransparent={true}
          />
        </View>
      );
    }, [progressBar, progressValue, progressLabel, styles.progressContainer]);

    const ButtonComponent = useMemo(() => {
      let buttonVariant: 'critical' | 'primary' | 'secondary' = 'primary';

      if (buttonLabel === t('v2.action-prompt-card.confirmPassphrase')) {
        buttonVariant = 'critical';
      }

      return buttonVariant === 'critical' ? Button.Critical : Button.Primary;
    }, [buttonLabel, t]);

    const renderButton = useCallback(() => {
      if (!buttonLabel) return null;

      return (
        <ButtonComponent
          label={buttonLabel}
          onPress={action}
          disabled={disabled}
          fullWidth={true}
          preIconName={buttonPreIcon}
          postIconName={buttonPostIcon}
          loading={loading}
        />
      );
    }, [
      ButtonComponent,
      buttonLabel,
      action,
      disabled,
      buttonPreIcon,
      buttonPostIcon,
      loading,
    ]);

    const renderWindowlessTemplate = useCallback(() => {
      return (
        <Row style={styles.iconTextRow} alignItems="center">
          {renderIcon()}
          <Column style={styles.textContainer} alignItems="flex-start">
            {!!title && <Text.L>{title}</Text.L>}
            {!!description &&
              (typeof description === 'string' ? (
                <Text.S variant="secondary" style={styles.description}>
                  {description}
                </Text.S>
              ) : (
                <View style={styles.description}>{description}</View>
              ))}
          </Column>
          {renderCloseButton()}
        </Row>
      );
    }, [
      renderCloseButton,
      renderIcon,
      title,
      description,
      styles.iconTextRow,
      styles.textContainer,
      styles.description,
    ]);

    return (
      <Card blur cardStyle={{ ...styles.card, ...cardStyle }}>
        {showWindowTitle && (
          <Row justifyContent="space-between" alignItems="center">
            <Row
              alignItems="center"
              justifyContent="space-between"
              style={styles.windowTitleRow}>
              <Text.M>{title}</Text.M>
              {renderCloseButton()}
            </Row>
          </Row>
        )}

        <View>
          {showWindowTitle ? (
            <Column style={styles.dividerContainer}>
              {!buttonLabel && <Divider />}
              {typeof description === 'string' ? (
                <Text.S style={styles.description}>{description}</Text.S>
              ) : (
                <View style={styles.description}>{description}</View>
              )}
            </Column>
          ) : (
            renderWindowlessTemplate()
          )}

          {renderProgressBar()}
        </View>

        {!!buttonLabel && renderButton()}
      </Card>
    );
  },
);

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      boxShadow: `0 0 10px 0 ${theme.extra.shadowDrop}`,
      shadowRadius: 3,
      elevation: 5,
      backgroundColor: theme.background.primary,
    },
    windowTitleRow: {
      width: '100%',
    },
    closeButton: {
      padding: spacing.XS,
    },
    iconTextRow: {
      gap: spacing.M,
    },
    textContainer: {
      gap: spacing.S,
      flex: 1,
    },
    description: {
      flexWrap: 'wrap',
    },
    progressContainer: {
      marginTop: spacing.M,
    },
    dividerContainer: {
      gap: spacing.M,
    },
  });
