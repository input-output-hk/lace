import { useTranslation } from '@lace-contract/i18n';
import { Column, Icon, Row, Text, Divider, Badge } from '@lace-lib/ui-toolkit';
import { spacing, useTheme } from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import type { SwapQuote } from '@lace-contract/swap-provider';
import type { Theme } from '@lace-lib/ui-toolkit';

interface QuoteInfoProps {
  quote: SwapQuote;
  slippage: number;
  sellTokenName: string;
  buyTokenName: string;
  onSlippagePress: () => void;
}

const useCountdown = (expiresAt: number): string => {
  const [remainingMs, setRemainingMs] = useState(
    Math.max(0, expiresAt - Date.now()),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [expiresAt]);

  const seconds = Math.floor(remainingMs / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const QuoteInfo = ({
  quote,
  slippage,
  sellTokenName,
  buyTokenName,
  onSlippagePress,
}: QuoteInfoProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const countdown = useCountdown(quote.quoteExpiresAt);

  const bestOfferText = `${quote.priceDisplay} ${sellTokenName} per ${buyTokenName}`;

  return (
    <Column gap={spacing.L} style={styles.container}>
      <Divider />
      <Row justifyContent="space-between" alignItems="center">
        <Text.XS variant="secondary" weight="medium">
          {t('v2.swap.quote.best-offer')}
        </Text.XS>
        <Text.XS weight="medium">{bestOfferText}</Text.XS>
      </Row>
      <Divider />
      <Row justifyContent="space-between" alignItems="center">
        <Text.XS variant="secondary" weight="medium">
          {t('v2.swap.quote.offer-duration')}
        </Text.XS>
        <Badge
          label={countdown}
          color={/0:0[0-5]/.test(countdown) ? 'neutral' : 'positive'}
        />
      </Row>
      <Divider />
      <Pressable onPress={onSlippagePress}>
        <Row justifyContent="space-between" alignItems="center">
          <Text.XS variant="secondary" weight="medium">
            {t('v2.swap.quote.slippage-tolerance')}
          </Text.XS>
          <Row alignItems="center" gap={spacing.XS}>
            <Text.XS weight="medium">{slippage}%</Text.XS>
            <Icon name="CaretRight" size={12} color={theme.text.secondary} />
          </Row>
        </Row>
      </Pressable>
      <Divider />
      <Row justifyContent="space-between" alignItems="center">
        <Text.XS variant="secondary" weight="medium">
          {t('v2.swap.quote.estimated-fee')}
        </Text.XS>
        <Column alignItems="flex-end">
          <Text.XS weight="medium">{quote.totalFeeDisplay}</Text.XS>
          {/* TODO: add fiat equivalent for estimated fee using user's selected currency */}
        </Column>
      </Row>
    </Column>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingVertical: spacing.S,
    },
    activeBadge: {
      color: theme.data.positive,
    },
    expiredBadge: {
      color: theme.background.negative,
    },
  });
