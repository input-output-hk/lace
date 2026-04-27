import type { ModalProps as RNModalProps } from 'react-native';

import React, { useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Modal as RNModal } from 'react-native';

import { radius, spacing, useTheme } from '../../../design-tokens';
import { Icon, Text, Button, Row, Column } from '../../atoms';
import { getOverlayColor } from '../../util';

import type { LayoutSize, Theme } from '../../../design-tokens';
import type { IconName } from '../../atoms';
import type { RequireAtLeastOne } from 'type-fest';

type RequiredFunctions = {
  onClose?: () => void;
  onConfirm?: () => void;
};

type ModalProps = RequireAtLeastOne<RequiredFunctions> &
  RNModalProps & {
    description: React.ReactNode | string;
    title?: string;
    titleIcon?: IconName;
    heading?: string;
    icon?: IconName;
    iconSize?: number;
    confirmText?: string;
    cancelText?: string;
    onCancel?: () => void;
    testIdPrefix?: string;
  };

export const Modal = ({
  title,
  titleIcon,
  heading,
  description,
  icon,
  iconSize = 64,
  confirmText = 'Done',
  cancelText = 'Cancel',
  onClose,
  onConfirm,
  onCancel,
  testIdPrefix,
  ...restProps
}: ModalProps) => {
  const { theme, layoutSize } = useTheme();
  const styles = useMemo(
    () => getStyles(theme, layoutSize),
    [theme, layoutSize],
  );
  const sizedIcon = icon ? <Icon name={icon} size={iconSize} /> : null;
  const shouldShowHeader = Boolean(title || titleIcon || onClose);
  const descriptionTestId = testIdPrefix
    ? `${testIdPrefix}-description`
    : 'modal-description';

  return (
    <View>
      <RNModal {...restProps} onRequestClose={onClose} transparent>
        <View style={styles.overlay}>
          <View
            style={styles.modal}
            testID={
              testIdPrefix ? `${testIdPrefix}-component` : 'modal-component'
            }>
            {shouldShowHeader && (
              <Row
                justifyContent="space-between"
                alignItems="center"
                style={styles.windowTitle}>
                <Row
                  justifyContent="center"
                  alignItems="center"
                  gap={spacing.XS}
                  style={styles.titleContainer}>
                  {!!titleIcon && (
                    <Icon
                      name={titleIcon}
                      size={16}
                      testID={
                        testIdPrefix
                          ? `${testIdPrefix}-title-icon`
                          : 'modal-title-icon'
                      }
                    />
                  )}
                  {!!title && (
                    <Text.M
                      align="center"
                      testID={
                        testIdPrefix
                          ? `${testIdPrefix}-title-text`
                          : 'modal-title-text'
                      }>
                      {title}
                    </Text.M>
                  )}
                </Row>
                {!!onClose && (
                  <TouchableOpacity onPress={onClose}>
                    <Icon
                      name="Cancel"
                      testID={
                        testIdPrefix
                          ? `${testIdPrefix}-close-button`
                          : 'modal-close-button'
                      }
                    />
                  </TouchableOpacity>
                )}
              </Row>
            )}

            <Column alignItems="center" gap={spacing.L}>
              {!!sizedIcon && (
                <View
                  testID={
                    testIdPrefix
                      ? `${testIdPrefix}-sized-icon`
                      : 'modal-sized-icon'
                  }>
                  {sizedIcon}
                </View>
              )}
              {!!heading && (
                <Text.L
                  align="center"
                  testID={
                    testIdPrefix ? `${testIdPrefix}-heading` : 'modal-heading'
                  }>
                  {heading}
                </Text.L>
              )}
              {typeof description === 'string' ? (
                <Text.M align="center" testID={descriptionTestId}>
                  {description}
                </Text.M>
              ) : React.isValidElement(description) ? (
                <Text.M align="center" testID={descriptionTestId}>
                  {description}
                </Text.M>
              ) : (
                <View testID={descriptionTestId}>{description}</View>
              )}
            </Column>

            {!!onConfirm && (
              <Row gap={spacing.S} style={styles.footer}>
                {!!onCancel && (
                  <Button.Secondary
                    flex={1}
                    label={cancelText}
                    onPress={onCancel}
                    testID={
                      testIdPrefix
                        ? `${testIdPrefix}-cancel-button`
                        : 'modal-cancel-button'
                    }
                  />
                )}
                <Button.Primary
                  flex={1}
                  label={confirmText}
                  onPress={onConfirm}
                  testID={
                    testIdPrefix
                      ? `${testIdPrefix}-confirm-button`
                      : 'modal-confirm-button'
                  }
                />
              </Row>
            )}
          </View>
        </View>
      </RNModal>
    </View>
  );
};

const getModalMaxWidth = (layoutSize: LayoutSize) => {
  if (layoutSize === 'compact') return '80%';
  if (layoutSize === 'medium') return '50%';
  return '33%';
};

const getStyles = (theme: Theme, layoutSize: LayoutSize) => {
  const overlayColor = getOverlayColor(theme);
  return StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: overlayColor,
    },
    modal: {
      maxWidth: getModalMaxWidth(layoutSize),
      padding: spacing.M,
      borderRadius: radius.M,
      position: 'relative',
      alignItems: 'center',
      overflow: 'hidden',
      backgroundColor: theme.background.page,
      gap: spacing.M,
    },
    windowTitle: {
      width: '100%',
      marginBottom: spacing.M,
    },
    titleContainer: {
      flex: 1,
      display: 'flex',
    },
    footer: {
      width: '100%',
    },
  });
};
