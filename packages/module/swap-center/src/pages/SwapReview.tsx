import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { getQuoteAnalyticsContext } from '@lace-contract/swap-context';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  Column,
  Divider,
  Row,
  Sheet,
  Text,
  footerHeight,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';
import { effectiveSellPerBuy, formatSellPerBuy } from '../quote-math';

import type { SwapQuote } from '@lace-contract/swap-provider';
import type { SheetScreenProps } from '@lace-lib/navigation';

type TokenDisplayData = { decimals: number } | undefined;

const formatSellRow = (
  sellAmount: string | undefined,
  sellTokenData: TokenDisplayData,
  displayName: string,
): string =>
  sellAmount && sellTokenData
    ? `${formatAmountToLocale(
        String(Math.round(Number(sellAmount) * 10 ** sellTokenData.decimals)),
        sellTokenData.decimals,
      )} ${displayName}`
    : '';

const formatBuyRow = (
  quote: SwapQuote | undefined,
  buyDecimals: number | undefined,
  displayName: string,
): string =>
  quote && buyDecimals !== undefined
    ? `${formatAmountToLocale(
        quote.expectedBuyAmount,
        buyDecimals,
      )} ${displayName}`
    : '';

const formatRoute = (quote: SwapQuote | undefined): string =>
  quote ? quote.route.map(leg => leg.dexName).join(' via ') : '';

// Sold token per unit bought, fees included — the provider's `price` counts
// only the batcher fee and ignores the two sides' decimals.
const computeQuoteRatio = (
  quote: SwapQuote | undefined,
  sellDecimals: number | undefined,
  buyDecimals: number | undefined,
): string | undefined =>
  quote
    ? formatSellPerBuy(
        effectiveSellPerBuy({ buyDecimals, quote, sellDecimals }),
      )
    : undefined;

const truncateAddress = (address: string): string =>
  address.length > 24
    ? `${address.slice(0, 12)}…${address.slice(-8)}`
    : address;

/**
 * Name and scale a decoded movement. Only the two tokens in the swap have
 * metadata to hand, so anything else — a token the build moved that the swap
 * never mentioned — shows its raw amount and a truncated id rather than a
 * plausible-looking but wrong figure.
 */
const describeMovement = ({
  tokenId,
  amount,
  adaSymbol,
  sell,
  buy,
}: {
  tokenId: string;
  amount: string;
  adaSymbol: string;
  sell: { id?: string; decimals?: number; name: string };
  buy: { id?: string; decimals?: number; name: string };
}): string => {
  if (tokenId === 'lovelace')
    return `${formatAmountToLocale(amount, LOVELACE_DECIMALS)} ${adaSymbol}`;
  if (tokenId === sell.id && sell.decimals !== undefined)
    return `${formatAmountToLocale(amount, sell.decimals)} ${sell.name}`;
  if (tokenId === buy.id && buy.decimals !== undefined)
    return `${formatAmountToLocale(amount, buy.decimals)} ${buy.name}`;
  return `${amount} ${truncateAddress(tokenId)}`;
};

const LOVELACE_DECIMALS = 6;

const ReviewRow = ({
  label,
  value,
  subtitle,
  testID,
}: {
  label: string;
  value: string;
  subtitle?: string;
  testID?: string;
}) => (
  <Row
    justifyContent="space-between"
    alignItems="flex-start"
    style={styles.reviewRow}
    testID={testID}>
    <Text.XS variant="secondary" weight="medium">
      {label}
    </Text.XS>
    <Column alignItems="flex-end" style={styles.rowValue}>
      <Text.XS weight="medium">{value}</Text.XS>
      {subtitle ? (
        <Text.XS variant="secondary" align="right">
          {subtitle}
        </Text.XS>
      ) : null}
    </Column>
  </Row>
);

const InspectionNotice = ({
  tone,
  title,
  subtitle,
  testID,
}: {
  tone: 'blocked' | 'info' | 'warning';
  title: string;
  subtitle?: string;
  testID?: string;
}) => {
  // The border carries the tone: this screen shows several at once, and a
  // refusal to sign must not look like a heads-up, nor a plain fact like either.
  const { theme } = useTheme();
  const borderLeftColor = {
    blocked: theme.data.negative,
    info: theme.text.tertiary,
    warning: theme.brand.orange,
  }[tone];
  return (
    <Column
      gap={spacing.XS}
      style={[styles.notice, { borderLeftColor }]}
      testID={testID}>
      <Text.XS weight="medium">{title}</Text.XS>
      {subtitle ? <Text.XS variant="secondary">{subtitle}</Text.XS> : null}
    </Column>
  );
};

export const SwapReview = (props: SheetScreenProps<SheetRoutes.SwapReview>) => {
  const { t } = useTranslation();
  const swapFlowState = useLaceSelector('swapFlow.selectSwapFlowState');
  const slippage = useLaceSelector('swapConfig.selectSlippage');
  const swapSessionId = useLaceSelector('swapAnalytics.selectSwapSessionId');
  const dispatchConfirmRequested = useDispatchLaceAction(
    'swapFlow.confirmRequested',
    true,
  );
  const dispatchReviewRequested = useDispatchLaceAction(
    'swapFlow.reviewRequested',
    true,
  );
  const dispatchBackToQuote = useDispatchLaceAction(
    'swapFlow.backToQuote',
    true,
  );
  const { trackEvent } = useAnalytics();

  const isReviewing = swapFlowState.status === 'Reviewing';
  const isBuilding = swapFlowState.status === 'Building';
  const isAwaitingConfirmation =
    swapFlowState.status === 'AwaitingConfirmation';
  const isProcessing = swapFlowState.status === 'Processing';
  const isSuccess = swapFlowState.status === 'Success';
  const isError = swapFlowState.status === 'Error';

  // Kick off the build when the sheet opens on a Quoted state. Dispatching
  // from here (instead of the Swap button handler) keeps the first press of
  // Swap focused on navigation — the button tap simply opens the sheet, and
  // the sheet owns the state transition into Building.
  const hasRequestedReviewRef = useRef(false);
  useEffect(() => {
    if (!hasRequestedReviewRef.current && swapFlowState.status === 'Quoted') {
      hasRequestedReviewRef.current = true;
      dispatchReviewRequested();
    }
  }, [swapFlowState.status, dispatchReviewRequested]);

  // Navigate to result sheet when swap completes or fails
  useEffect(() => {
    if (isSuccess || isError) {
      NavigationControls.navigate(SheetRoutes.SwapResult);
    }
  }, [isSuccess, isError]);

  // If the user dismisses the sheet while still at Building/Reviewing (e.g.
  // swipes down or taps the backdrop), restore Quoted so the SwapCenter still
  // shows the quote and pressing Swap starts a fresh build.
  const statusRef = useRef(swapFlowState.status);
  statusRef.current = swapFlowState.status;
  useEffect(
    () => () => {
      if (
        statusRef.current === 'Building' ||
        statusRef.current === 'Reviewing'
      ) {
        dispatchBackToQuote();
      }
    },
    [dispatchBackToQuote],
  );

  const selectedQuote =
    'selectedQuote' in swapFlowState ? swapFlowState.selectedQuote : undefined;
  const sellTokenId =
    'sellTokenId' in swapFlowState ? swapFlowState.sellTokenId : undefined;
  const buyTokenId =
    'buyTokenId' in swapFlowState ? swapFlowState.buyTokenId : undefined;
  const sellAmount =
    'sellAmount' in swapFlowState ? swapFlowState.sellAmount : undefined;
  // Present from Reviewing onwards: what the built bytes actually do.
  const inspection =
    'inspection' in swapFlowState ? swapFlowState.inspection : undefined;
  const isBlocked = inspection?.verdict === 'blocked';

  const sellTokenData = useLaceSelector(
    'tokens.selectTokenById',
    sellTokenId ?? '',
  );
  const buyTokenData = useLaceSelector(
    'tokens.selectTokenById',
    buyTokenId ?? '',
  );

  const sellDisplayName = sellTokenData?.displayShortName ?? sellTokenId ?? '';

  // The buy token is usually one the wallet does not hold, so `selectTokenById`
  // returns nothing and with it the decimals every figure on this screen needs.
  // The provider's own token list is the fallback, exactly as SwapCenter does it
  // — without this the received amount and the quote ratio both render as '-'.
  const providerTokens = useLaceSelector('swapConfig.selectProviderTokens');
  const buyProviderToken = useMemo(
    () =>
      buyTokenId && !buyTokenData && providerTokens
        ? providerTokens.find(pt => pt.id === buyTokenId)
        : undefined,
    [buyTokenId, buyTokenData, providerTokens],
  );

  const buyDisplayName =
    buyTokenData?.displayShortName ??
    buyProviderToken?.ticker ??
    buyProviderToken?.name ??
    buyTokenId ??
    '';
  const buyDecimals = buyTokenData?.decimals ?? buyProviderToken?.decimals;

  // The provider's own ADA label, so testnet reads tADA exactly as its fee
  // rows already do.
  const adaSymbol =
    selectedQuote?.fees.find(fee => fee.tokenId === 'lovelace')
      ?.displayCurrency ?? 'ADA';
  const sellTokenDescriptor = {
    decimals: sellTokenData?.decimals,
    id: sellTokenId,
    name: sellDisplayName,
  };
  const buyTokenDescriptor = {
    decimals: buyDecimals,
    id: buyTokenId,
    name: buyDisplayName,
  };

  const formattedSellAmount = formatSellRow(
    sellAmount,
    sellTokenData,
    sellDisplayName,
  );
  const formattedBuyAmount = formatBuyRow(
    selectedQuote,
    buyDecimals,
    buyDisplayName,
  );
  const routeDisplay = formatRoute(selectedQuote);
  const quoteRatio = computeQuoteRatio(
    selectedQuote,
    sellTokenData?.decimals,
    buyDecimals,
  );

  const handleNext = useCallback(() => {
    trackEvent('swaps | review tx', {
      ...(sellTokenId && { tokenIn: sellTokenId }),
      ...(buyTokenId && { tokenOut: buyTokenId }),
      ...(selectedQuote && {
        quantity: selectedQuote.sellAmount,
        expectedBuyAmount: selectedQuote.expectedBuyAmount,
        ...getQuoteAnalyticsContext(selectedQuote),
      }),
      targetSlippage: slippage.toString(),
      ...(swapSessionId && { swapSessionId }),
    });
    dispatchConfirmRequested();
  }, [
    dispatchConfirmRequested,
    trackEvent,
    sellTokenId,
    buyTokenId,
    sellAmount,
    selectedQuote,
    slippage,
    swapSessionId,
  ]);

  const handleClose = useCallback(() => {
    // Closing via the back arrow should restore the Quoted state if we're
    // still pre-sign; the unmount effect above handles other dismissal paths.
    if (statusRef.current === 'Building' || statusRef.current === 'Reviewing') {
      dispatchBackToQuote();
    }
    NavigationControls.closeSheet();
  }, [dispatchBackToQuote]);

  useEffect(() => {
    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('v2.swap.review.title')}
          leftIcon="ArrowLeft"
          leftIconOnPress={handleClose}
          testID="swap-review-header"
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: t('v2.swap.review.next'),
            onPress: handleNext,
            disabled: !isReviewing || isBlocked,
            loading: isBuilding || isAwaitingConfirmation || isProcessing,
            testID: 'swap-review-next-button',
          }}
        />
      ),
    });
  }, [
    props.navigation,
    t,
    handleClose,
    handleNext,
    isReviewing,
    isBlocked,
    isBuilding,
    isAwaitingConfirmation,
    isProcessing,
  ]);

  return (
    <Sheet.Scroll contentContainerStyle={styles.scrollContainer}>
      <Column style={styles.content} gap={spacing.XS}>
        {!selectedQuote ? (
          <Text.XS variant="secondary" align="center">
            {isBuilding
              ? t('v2.swap.review.building')
              : t('v2.swap.review.no-quote')}
          </Text.XS>
        ) : (
          <>
            {isBlocked ? (
              <InspectionNotice
                tone="blocked"
                title={t('v2.swap.review.blocked-title')}
                subtitle={t('v2.swap.review.blocked-subtitle')}
                testID="swap-review-blocked-notice"
              />
            ) : null}

            {inspection ? (
              <>
                <Text.XS
                  weight="medium"
                  align="center"
                  testID="swap-review-verified-title">
                  {t('v2.swap.review.verified-title')}
                </Text.XS>

                {inspection.outflows.map(movement => (
                  <ReviewRow
                    key={`out-${movement.tokenId}`}
                    label={t('v2.swap.review.leaving-wallet')}
                    value={describeMovement({
                      adaSymbol,
                      amount: movement.amount,
                      buy: buyTokenDescriptor,
                      sell: sellTokenDescriptor,
                      tokenId: movement.tokenId,
                    })}
                    testID={`swap-review-outflow-${movement.tokenId}`}
                  />
                ))}

                {inspection.receivedAmount === undefined ? null : (
                  <ReviewRow
                    label={t('v2.swap.review.received-decoded')}
                    value={describeMovement({
                      adaSymbol,
                      amount: inspection.receivedAmount,
                      buy: buyTokenDescriptor,
                      sell: sellTokenDescriptor,
                      tokenId: selectedQuote.buyTokenId,
                    })}
                    testID="swap-review-received-decoded-row"
                  />
                )}

                <ReviewRow
                  label={t('v2.swap.review.network-fee')}
                  value={`-${formatAmountToLocale(
                    inspection.feeLovelace,
                    LOVELACE_DECIMALS,
                  )} ${adaSymbol}`}
                  testID="swap-review-decoded-fee-row"
                />

                {inspection.destinations.map((destination, index) => (
                  <ReviewRow
                    // Position too: a multi-hop route pays two orders at one
                    // script address, so the address alone is not unique.
                    key={`dest-${index}-${destination.address}`}
                    label={t('v2.swap.review.order-destination')}
                    value={truncateAddress(destination.address)}
                    // Without the amount, a destination taking
                    // most of the sale reads like the order.
                    subtitle={`${formatAmountToLocale(
                      destination.coin,
                      LOVELACE_DECIMALS,
                    )} ${adaSymbol} · ${t(
                      destination.isScript
                        ? 'v2.swap.review.order-destination-script'
                        : 'v2.swap.review.order-destination-address',
                    )}`}
                    testID="swap-review-destination-row"
                  />
                ))}

                {inspection.collateralLovelace === '0' ? null : (
                  <ReviewRow
                    label={t('v2.swap.review.collateral')}
                    value={`${formatAmountToLocale(
                      inspection.collateralLovelace,
                      LOVELACE_DECIMALS,
                    )} ${adaSymbol}`}
                    testID="swap-review-collateral-row"
                  />
                )}

                {inspection.ttl === undefined ? null : (
                  <ReviewRow
                    label={t('v2.swap.review.expires')}
                    value={String(inspection.ttl)}
                    testID="swap-review-ttl-row"
                  />
                )}

                {inspection.warnings.map(warning => (
                  <InspectionNotice
                    key={warning}
                    tone="warning"
                    title={t(
                      warning === 'beneficiaryUnverified'
                        ? 'v2.swap.review.warning-beneficiary'
                        : 'v2.swap.review.warning-non-script',
                    )}
                    testID={`swap-review-warning-${warning}`}
                  />
                ))}

                <Divider />

                <Text.XS
                  weight="medium"
                  align="center"
                  testID="swap-review-quoted-title">
                  {t('v2.swap.review.quoted-title')}
                </Text.XS>
              </>
            ) : null}

            <ReviewRow
              label={t('v2.swap.review.selling')}
              value={formattedSellAmount}
              testID="swap-review-sell-row"
            />
            <ReviewRow
              label={t('v2.swap.review.received')}
              value={formattedBuyAmount}
              testID="swap-review-buy-row"
            />
            {inspection && inspection.receivedAmount === undefined ? (
              <InspectionNotice
                tone="info"
                title={t('v2.swap.review.received-later')}
                testID="swap-review-received-later-notice"
              />
            ) : null}
            {inspection ? (
              <ReviewRow
                label={t('v2.swap.review.minimum-received')}
                value={describeMovement({
                  adaSymbol,
                  amount: inspection.minimumReceived,
                  buy: buyTokenDescriptor,
                  sell: sellTokenDescriptor,
                  tokenId: selectedQuote.buyTokenId,
                })}
                testID="swap-review-min-received-row"
              />
            ) : null}
            <ReviewRow
              label={t('v2.swap.review.slippage-tolerance')}
              value={`${slippage}%`}
              testID="swap-review-slippage-row"
            />
            <ReviewRow
              label={t('v2.swap.review.swap-route')}
              value={routeDisplay || '-'}
              testID="swap-review-route-row"
            />
            <ReviewRow
              label={t('v2.swap.review.quote-ratio')}
              value={
                quoteRatio
                  ? `1 ${buyDisplayName} = ${quoteRatio} ${sellDisplayName}`
                  : '-'
              }
              testID="swap-review-quote-ratio-row"
            />

            <Divider />

            <Text.XS
              weight="medium"
              align="center"
              testID="swap-review-transaction-cost">
              {t('v2.swap.review.transaction-cost')}
            </Text.XS>

            {selectedQuote.fees.map(fee => (
              <ReviewRow
                key={fee.label}
                label={t(fee.label)}
                value={`-${fee.displayAmount} ${fee.displayCurrency}`}
              />
            ))}

            <ReviewRow
              label={t('v2.swap.review.total-fees')}
              value={`-${selectedQuote.totalFeeDisplay}`}
              testID="swap-review-total-fees-row"
            />

            {selectedQuote.deposit ? (
              <ReviewRow
                label={t('v2.swap.review.deposit')}
                value={`${selectedQuote.deposit.displayAmount} ${selectedQuote.deposit.displayCurrency}`}
                testID="swap-review-deposit-row"
              />
            ) : null}
          </>
        )}
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.M,
  },
  scrollContainer: {
    paddingBottom: footerHeight.horizontal,
  },
  notice: {
    borderLeftWidth: 3,
    paddingHorizontal: spacing.S,
    paddingVertical: spacing.XS,
  },
  reviewRow: {
    paddingVertical: spacing.XS,
  },
  rowValue: {
    flexShrink: 1,
    paddingLeft: spacing.S,
  },
});
