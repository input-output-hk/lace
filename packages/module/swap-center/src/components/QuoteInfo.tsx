import { useTranslation } from '@lace-contract/i18n';
import {
  Badge,
  Column,
  Divider,
  Icon,
  Row,
  Text,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { effectiveSellPerBuy, formatSellPerBuy } from '../quote-math';

import type { SwapQuote } from '@lace-contract/swap-provider';
import type { Theme } from '@lace-lib/ui-toolkit';

interface QuoteInfoProps {
  quote: SwapQuote;
  slippage: number;
  sellTokenName: string;
  sellTokenDecimals: number | undefined;
  buyTokenName: string;
  buyTokenDecimals: number | undefined;
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
  sellTokenDecimals,
  buyTokenName,
  buyTokenDecimals,
  onSlippagePress,
}: QuoteInfoProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const countdown = useCountdown(quote.quoteExpiresAt);

  const rate = formatSellPerBuy(
    effectiveSellPerBuy({
      buyDecimals: buyTokenDecimals,
      quote,
      sellDecimals: sellTokenDecimals,
    }),
  );
  const bestOfferText = rate
    ? `${rate} ${sellTokenName} per ${buyTokenName}`
    : '-';

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
        <Text.XS weight="medium">{quote.totalFeeDisplay}</Text.XS>
      </Row>
      {/* Refundable, so NOT folded into the fee above — but the account has to
          hold it, and it can exceed the fees (WingRiders asks 3.15 ADA against
          1.85 in fees), so hiding it made the funds error look wrong. */}
      {quote.deposit ? (
        <>
          <Divider />
          <Row justifyContent="space-between" alignItems="center">
            <Text.XS variant="secondary" weight="medium">
              {t('v2.swap.review.deposit')}
            </Text.XS>
            <Text.XS weight="medium" testID="swap-quote-deposit">
              {`${quote.deposit.displayAmount} ${quote.deposit.displayCurrency}`}
            </Text.XS>
          </Row>
        </>
      ) : null}
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
