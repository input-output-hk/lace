import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '../../../design-tokens';
import { Button, Column, Divider, Row } from '../../atoms';
import { isWeb } from '../../util';

import type { SheetFooterProps } from './sheetFooter.types';
import type { Theme } from '../../../design-tokens';
import type { EdgeInsets } from 'react-native-safe-area-context';

const FOOTER_HEIGHT = isWeb ? 70 : 120;
const FOOTER_HEIGHT_VERTICAL = isWeb ? 115 : 200;

export const useFooterHeight = (vertical?: boolean) => {
  const insets = useSafeAreaInsets();
  return (
    insets.bottom +
    (vertical ? FOOTER_HEIGHT_VERTICAL : FOOTER_HEIGHT) +
    spacing.S
  );
};

export const SheetFooter = memo(
  ({
    primaryButton,
    secondaryButton,
    primaryVariant = 'primary',
    showDivider = true,
    vertical = false,
    titleRow,
    testID = 'sheet-footer',
  }: SheetFooterProps) => {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const styles = getStyles({ insets, theme, vertical });

    const PrimaryButtonComponent =
      primaryVariant === 'critical' ? Button.Critical : Button.Primary;
    const SecondaryButtonComponent = Button.Secondary;

    const ButtonsContainer = vertical ? Column : Row;

    return (
      <Column style={styles.footer} gap={spacing.S} testID={testID}>
        {showDivider && <Divider />}
        {titleRow}
        <ButtonsContainer
          alignItems={vertical ? 'stretch' : 'center'}
          gap={spacing.S}>
          {!vertical && secondaryButton && (
            <SecondaryButtonComponent
              flex={1}
              label={secondaryButton.label}
              onPress={secondaryButton.onPress}
              loading={secondaryButton.loading}
              disabled={secondaryButton.disabled}
              preIconName={secondaryButton.preIconName}
              iconColor={secondaryButton.iconColor}
              testID={secondaryButton.testID}
            />
          )}
          {primaryButton && (
            <PrimaryButtonComponent
              flex={vertical ? undefined : 1}
              label={primaryButton.label}
              onPress={primaryButton.onPress}
              loading={primaryButton.loading}
              disabled={primaryButton.disabled}
              preIconName={primaryButton.preIconName}
              iconColor={primaryButton.iconColor}
              testID={primaryButton.testID}
            />
          )}
          {vertical && secondaryButton && (
            <SecondaryButtonComponent
              label={secondaryButton.label}
              onPress={secondaryButton.onPress}
              loading={secondaryButton.loading}
              disabled={secondaryButton.disabled}
              preIconName={secondaryButton.preIconName}
              iconColor={secondaryButton.iconColor}
              testID={secondaryButton.testID}
            />
          )}
        </ButtonsContainer>
      </Column>
    );
  },
);

const getStyles = ({
  insets,
  theme,
  vertical,
}: {
  insets: EdgeInsets;
  theme: Theme;
  vertical: boolean;
}) =>
  StyleSheet.create({
    footer: {
      backgroundColor: theme.background.page,
      height: vertical ? FOOTER_HEIGHT_VERTICAL : FOOTER_HEIGHT,
      position: 'absolute',
      bottom: insets.bottom,
      width: '100%',
    },
  });
