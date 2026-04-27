import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  Column,
  Divider,
  Row,
  Sheet,
  SheetFooter,
  SheetHeader,
  Text,
  useFooterHeight,
} from '@lace-lib/ui-toolkit';
import { spacing } from '@lace-lib/ui-toolkit';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { SheetScreenProps } from '@lace-lib/navigation';

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
    alignItems="center"
    style={styles.reviewRow}
    testID={testID}>
    <Text.XS variant="secondary" weight="medium">
      {label}
    </Text.XS>
    <Column alignItems="flex-end">
      <Text.XS weight="medium">{value}</Text.XS>
      {subtitle ? <Text.XS variant="secondary">{subtitle}</Text.XS> : null}
    </Column>
  </Row>
);

export const SwapReview = (
  _props: SheetScreenProps<SheetRoutes.SwapReview>,
) => {
  const { t } = useTranslation();
  const swapFlowState = useLaceSelector('swapFlow.selectSwapFlowState');
  const slippage = useLaceSelector('swapConfig.selectSlippage');
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
      NavigationControls.sheets.navigate(SheetRoutes.SwapResult);
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

  const sellTokenData = useLaceSelector(
    'tokens.selectTokenById',
    sellTokenId ?? '',
  );
  const buyTokenData = useLaceSelector(
    'tokens.selectTokenById',
    buyTokenId ?? '',
  );

  const sellDisplayName = sellTokenData?.displayShortName ?? sellTokenId ?? '';
  const buyDisplayName = buyTokenData?.displayShortName ?? buyTokenId ?? '';

  const formattedSellAmount =
    sellAmount && sellTokenData
      ? `${formatAmountToLocale(
          String(Math.round(Number(sellAmount) * 10 ** sellTokenData.decimals)),
          sellTokenData.decimals,
        )} ${sellDisplayName}`
      : '';
  const formattedBuyAmount =
    selectedQuote && buyTokenData
      ? `${formatAmountToLocale(
          selectedQuote.expectedBuyAmount,
          buyTokenData.decimals,
        )} ${buyDisplayName}`
      : '';

  const routeDisplay = selectedQuote
    ? selectedQuote.route.map(leg => leg.dexName).join(' via ')
    : '';

  const handleNext = useCallback(() => {
    trackEvent('swaps | review tx');
    dispatchConfirmRequested();
  }, [dispatchConfirmRequested, trackEvent]);

  const handleClose = useCallback(() => {
    // Closing via the back arrow should restore the Quoted state if we're
    // still pre-sign; the unmount effect above handles other dismissal paths.
    if (statusRef.current === 'Building' || statusRef.current === 'Reviewing') {
      dispatchBackToQuote();
    }
    NavigationControls.sheets.close();
  }, [dispatchBackToQuote]);

  const footerHeight = useFooterHeight();
  const scrollContainerStyle = useMemo(
    () => ({ paddingBottom: footerHeight }),
    [footerHeight],
  );

  return (
    <>
      <SheetHeader
        title={t('v2.swap.review.title')}
        leftIcon="ArrowLeft"
        leftIconOnPress={handleClose}
        testID="swap-review-header"
      />
      <Sheet.Scroll contentContainerStyle={scrollContainerStyle}>
        <Column style={styles.content} gap={spacing.XS}>
          {!selectedQuote ? (
            <Text.XS variant="secondary" align="center">
              {isBuilding
                ? t('v2.swap.review.building')
                : t('v2.swap.review.no-quote')}
            </Text.XS>
          ) : (
            <>
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
                  selectedQuote.priceDisplay
                    ? `1 ${sellDisplayName} = ${selectedQuote.priceDisplay} ${buyDisplayName}`
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

              {selectedQuote.fees.map((fee, index) => (
                <ReviewRow
                  key={index}
                  label={fee.label}
                  value={`-${fee.displayAmount} ${fee.displayCurrency}`}
                />
              ))}

              <ReviewRow
                label={t('v2.swap.review.total-fees')}
                value={`-${selectedQuote.totalFeeDisplay}`}
                testID="swap-review-total-fees-row"
              />
            </>
          )}
        </Column>
      </Sheet.Scroll>
      <SheetFooter
        primaryButton={{
          label: t('v2.swap.review.next'),
          onPress: handleNext,
          disabled: !isReviewing,
          loading: isBuilding || isAwaitingConfirmation || isProcessing,
          testID: 'swap-review-next-button',
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.M,
  },
  reviewRow: {
    paddingVertical: spacing.XS,
  },
});
