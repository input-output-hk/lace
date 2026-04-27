import { useTranslation } from '@lace-contract/i18n';
import React, { useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import { radius, spacing } from '../../../design-tokens';
import { BlurView, Column, Divider } from '../../atoms';
import { TokenItem } from '../tokenItem/tokenItem';

import type { TokenItemProps } from '../../molecules';

export type TokenGroupItem = Omit<TokenItemProps, 'balancePendingText'>;

export type TokenGroupAsset = TokenGroupItem & {
  tokens: TokenGroupItem[];
};

type TokenGroupProps = {
  asset: TokenGroupAsset;
  onPressItem?: () => void;
};

export const TokenGroup = ({ asset, onPressItem }: TokenGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { t } = useTranslation();

  const handleToggle = () => {
    setIsExpanded(previous => !previous);
  };

  const groupLabel: string = isExpanded
    ? t('v2.generic.btn.tokens')
    : t('v2.generic.btn.networks');

  const tokenBalance = useMemo(
    () =>
      asset.tokens
        .reduce(
          (accumulator, token) => accumulator + parseFloat(token.balance),
          0,
        )
        .toString(),
    [asset.tokens],
  );

  const conversionBalance = useMemo(
    () =>
      asset.tokens
        .reduce(
          (accumulator, token) =>
            accumulator + parseFloat(token.conversion || '0'),
          0,
        )
        .toString(),
    [asset.tokens],
  );
  const hasConversionBalance = useMemo(
    () => asset.tokens.some(token => token.conversion),
    [asset.tokens],
  );

  const tokenItemElement = (
    <TokenItem
      logo={asset.logo}
      name={asset.name}
      balance={tokenBalance}
      currency={asset.currency}
      rate={`${asset.tokens.length} ${groupLabel}`}
      conversion={hasConversionBalance ? conversionBalance : undefined}
      shielded={asset.shielded}
      onPress={handleToggle}
      isExpanded={isExpanded}
      rateLabelOverride={asset.rate}
      showCaretIcon
    />
  );

  if (isExpanded) {
    return (
      <BlurView style={styles.expandedContainer}>
        {tokenItemElement}
        {asset.tokens.map(token => (
          <Column>
            <View style={styles.dividerWrapper}>
              <Divider />
            </View>
            <TokenItem
              {...token}
              onPress={
                onPressItem
                  ? () => {
                      onPressItem();
                    }
                  : undefined
              }
              isExpanded
            />
          </Column>
        ))}
      </BlurView>
    );
  }

  return tokenItemElement;
};

const styles = StyleSheet.create({
  expandedContainer: {
    borderRadius: radius.S,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  dividerWrapper: {
    position: 'absolute',
    left: spacing.M,
    right: spacing.M,
    bottom: spacing.S,
    top: spacing.S,
  },
});
