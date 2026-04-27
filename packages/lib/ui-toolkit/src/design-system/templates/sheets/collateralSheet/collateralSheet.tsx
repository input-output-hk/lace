import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import {
  Column,
  CustomTag,
  getLabelColor,
  Icon,
  Row,
  Text,
} from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { IconName } from '../../../atoms';
import type { ColorType } from '../../../util';

type InfoCardVariant = 'info' | 'success' | 'warning';

interface InfoCardConfig {
  variant: InfoCardVariant;
  text: string;
  iconName: IconName;
}

const getVariantColor = (variant: InfoCardVariant): ColorType => {
  switch (variant) {
    case 'success':
      return 'positive';
    case 'warning':
      return 'negative';
    case 'info':
    default:
      return 'neutral';
  }
};

interface CollateralSheetProps {
  headerTitle: string;
  description?: string;
  infoText?: string;
  /** When provided with body, rendered like StatusSheet (icon above body, centered) */
  icon?: {
    name: IconName;
    variant?: 'solid' | 'stroke';
    size?: number;
  };
  body?: string;
  infoCards?: InfoCardConfig[];
  estimatedFee?: {
    label: string;
    amount: string;
    fiat?: string;
  };
  footer: {
    closeButton?: {
      label: string;
      onPress: () => void;
      loading?: boolean;
    };
    primaryButton: {
      label: string;
      onPress: () => void;
      loading?: boolean;
    };
  };
  testID?: string;
}

export const CollateralTemplate = ({
  headerTitle,
  description,
  infoText,
  icon,
  body,
  infoCards = [],
  estimatedFee,
  footer,
  testID,
}: CollateralSheetProps) => {
  const { theme } = useTheme();
  const footerHeight = useFooterHeight();
  const styles = useMemo(() => getStyles(footerHeight), [footerHeight]);

  return (
    <>
      <SheetHeader title={headerTitle} />
      <Sheet.Scroll
        testID={testID}
        contentContainerStyle={styles.scrollContainer}>
        <Column style={styles.container}>
          {description && <Text.M>{description}</Text.M>}

          {infoText && (
            <CustomTag
              label={infoText}
              icon={
                <Icon
                  name="InformationCircle"
                  size={16}
                  color={theme.text.primary}
                />
              }
              backgroundType="transparent"
            />
          )}

          {!!icon && body && (
            <Column
              justifyContent="center"
              alignItems="center"
              gap={spacing.M}
              style={styles.centeredContent}>
              <Icon
                name={icon.name}
                size={icon.size ?? 48}
                variant={icon.variant ?? 'stroke'}
              />
              <Text.M>{body}</Text.M>
            </Column>
          )}

          <Column gap={spacing.L}>
            {infoCards.map((card, index) => {
              const color = getVariantColor(card.variant);
              const textColor = getLabelColor(theme, color, 'semiTransparent');
              return (
                <CustomTag
                  size="L"
                  key={index}
                  label={card.text}
                  icon={
                    <Icon name={card.iconName} size={20} color={textColor} />
                  }
                  color={color}
                  backgroundType="semiTransparent"
                  testID={`collateral-info-card-${index}`}
                />
              );
            })}
          </Column>

          {estimatedFee && (
            <Row justifyContent="space-between" alignItems="center">
              <Text.M variant="secondary">{estimatedFee.label}</Text.M>
              <Column alignItems="flex-end">
                <Text.M>{estimatedFee.amount}</Text.M>
                {estimatedFee.fiat && (
                  <Text.S variant="secondary">{estimatedFee.fiat}</Text.S>
                )}
              </Column>
            </Row>
          )}
        </Column>
      </Sheet.Scroll>

      <SheetFooter
        secondaryButton={
          footer.closeButton
            ? {
                label: footer.closeButton.label,
                onPress: footer.closeButton.onPress,
                disabled: footer.closeButton.loading,
                loading: footer.closeButton.loading,
              }
            : undefined
        }
        primaryButton={{
          label: footer.primaryButton.label,
          onPress: footer.primaryButton.onPress,
          disabled: footer.primaryButton.loading,
          loading: footer.primaryButton.loading,
        }}
      />
    </>
  );
};

const getStyles = (footerHeight: number) =>
  StyleSheet.create({
    scrollContainer: {
      paddingBottom: footerHeight,
    },
    container: {
      gap: spacing.L,
      paddingHorizontal: spacing.M,
      flex: 1,
    },
    centeredContent: {
      marginVertical: '30%',
    },
  });
