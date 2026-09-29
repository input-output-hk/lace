import {
  LOVELACE_TOKEN_ID,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { realfiDebugLog } from '@lace-contract/realfi-staking';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  Avatar,
  Column,
  CustomTag,
  Divider,
  footerHeight,
  Row,
  Sheet,
  Text,
  spacing,
} from '@lace-lib/ui-toolkit';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { CollapsibleSection } from '../components/CollapsibleSection';
import { ReviewRow } from '../components/ReviewRow';
import { formatCooldownRemaining } from '../cooldown-remaining';
import { useDispatchLaceAction, useLaceSelector } from '../hooks';
import { useActiveRealFiConfig } from '../use-realfi-config';
import { useReviewFeePricing } from '../use-review-fee-pricing';

import type { SheetScreenProps } from '@lace-lib/navigation';

// Stable selector param (avoids a fresh object identity every render).
const CARDANO_BLOCKCHAIN_PARAM = { blockchainName: 'Cardano' } as const;

// All preview stake assets (USDr / sUSDr / stablecoins) use 6 decimals.
const TOKEN_DECIMALS = 6;
const EMPTY = '—';

/** Sum two fiat legs only when both carry a fresh rate; otherwise no total. */
const sumFiat = (
  a: number | undefined,
  b: number | undefined,
): number | undefined =>
  a === undefined || b === undefined ? undefined : a + b;

/**
 * Review TX sheet (M3/M6, LW-14681): Overview + Advanced details + Total
 * Breakdown, each a collapsible section styled like the dapp confirm-transaction
 * sheet, split by dividers. Confirm → signingRequested, which drives the build
 * side-effect that raises the password prompt; once the flow reaches Queued the
 * sheet advances to the "all done" confirmation.
 */
export const RealFiReviewTransaction = (
  props: SheetScreenProps<SheetRoutes.RealFiReviewTransaction>,
) => {
  const { navigation } = props;
  const { t } = useTranslation();
  const flowState = useLaceSelector('realfiFlow.selectFlowState');
  const signingRequested = useDispatchLaceAction('realfiFlow.signingRequested');

  const status = flowState.status;
  const isReviewing = status === 'ReviewingTransaction';
  const isSubmitting =
    status === 'SigningTransaction' || status === 'SubmittingTransaction';

  // Account name resolved from the wallet store (store-wired, like the swap and
  // manage-stake sheets); the accountId is carried on the active flow state.
  const accountId = 'accountId' in flowState ? flowState.accountId : undefined;
  const accountsResult = useLaceSelector(
    'wallets.selectActiveNetworkAccountsByBlockchainName',
    CARDANO_BLOCKCHAIN_PARAM,
  );
  const accountMetadata = useMemo(() => {
    const accounts = Array.isArray(accountsResult) ? accountsResult : [];
    return accounts.find(account => account.accountId === accountId)?.metadata;
  }, [accountsResult, accountId]);
  const accountName = accountMetadata?.name ?? '';

  // --- Real review data carried on the flow state (set by the Manage Stake quote) ---
  // Each field narrows independently: different flow states carry different
  // subsets, so none may gate another's read.
  const { review, kind, inputTokenId, outputTokenId } = useMemo(
    () => ({
      review: 'review' in flowState ? flowState.review : undefined,
      kind: 'kind' in flowState ? flowState.kind : ('stake' as const),
      inputTokenId:
        'inputTokenId' in flowState ? flowState.inputTokenId : undefined,
      outputTokenId:
        'outputTokenId' in flowState ? flowState.outputTokenId : undefined,
    }),
    [flowState],
  );
  const quote = review?.quote;

  // Ticker resolution: ADA / USDr / sUSDr are known (USDr/sUSDr by the active
  // network's token ids); stablecoins come from the wallet token store (same
  // source Manage Stake uses).
  const realfiConfig = useActiveRealFiConfig();
  const accountFungibleTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensByAccountId',
    accountId ?? '',
  );
  // Follows the active network, so a testnet sheet reads tADA like the rest of
  // the app. Taken from the network rather than the token store's metadata,
  // whose lovelace ticker is corrected asynchronously after a network switch
  // (cardano-context's syncLovelaceTokenTickerWithChain).
  const networkType = useLaceSelector('network.selectNetworkType');
  const adaTicker = getAdaTokenTickerByNetwork(networkType);
  const tickerFor = useCallback(
    (tokenId: string | undefined): string => {
      if (!tokenId) return '';
      if (tokenId === LOVELACE_TOKEN_ID) return adaTicker;
      if (tokenId === realfiConfig?.usdrTokenId) return 'USDrf';
      if (tokenId === realfiConfig?.susdrTokenId) return 'sUSDrf';
      const token = (accountFungibleTokens ?? []).find(
        item => item.tokenId === tokenId,
      );
      return token?.displayShortName ?? token?.metadata?.ticker ?? '';
    },
    [accountFungibleTokens, adaTicker, realfiConfig],
  );

  // ADA fiat price for the fee lines (same wiring as Manage Stake), priced
  // like the send flow's fee rows so every breakdown row carries its fiat
  // line whenever the app has an ADA price at all (LW-14681).
  const currency = useLaceSelector('tokenPricing.selectCurrencyPreference');

  // The service fee is charged in the swap-input token (stake) or USDr
  // (unstake); useReviewFeePricing (shared with the Manage sheet) supplies its
  // charged-denomination units plus fiat legs priced live.
  const { networkFee, processingFee, serviceFee } = useReviewFeePricing({
    review,
    accountFungibleTokens,
    usdrTokenId: realfiConfig?.usdrTokenId,
  });

  // Crypto lines render each fee in its charged denomination — no rate needed,
  // so a missing price can never dash or mislabel a known amount; only the
  // fiat lines convert.
  const isServiceFeeAda = review?.serviceFeeTokenId === LOVELACE_TOKEN_ID;
  const serviceFeeTicker = isServiceFeeAda
    ? adaTicker
    : tickerFor(review?.serviceFeeTokenId);
  const networkFeeLine = `-${networkFee.units.toFixed(2)} ${adaTicker}`;
  const processingFeeLine = `-${processingFee.units.toFixed(2)} ${adaTicker}`;
  const adaFeeUnits = networkFee.units + processingFee.units;
  const serviceFeeLine = `-${serviceFee.units.toFixed(
    2,
  )} ${serviceFeeTicker}`.trim();
  // Total: one summed figure when both fees share a denomination, otherwise
  // both amounts side by side — a cross-asset sum has no single honest number.
  const totalFeeLine = isServiceFeeAda
    ? `-${(adaFeeUnits + serviceFee.units).toFixed(2)} ${adaTicker}`
    : `-${adaFeeUnits.toFixed(2)} ${adaTicker}, ${serviceFeeLine}`;
  const totalFee = {
    fiat: sumFiat(
      sumFiat(networkFee.fiat, processingFee.fiat),
      serviceFee.fiat,
    ),
  };
  // A fee leg with no fresh rate renders no fiat line (prices are
  // mainnet-only) — a 0.00 stand-in would claim a conversion we don't have.
  const fiatLine = (fee: { fiat: number | undefined }): string | undefined =>
    fee.fiat === undefined
      ? undefined
      : `-${fee.fiat.toFixed(2)} ${currency.ticker}`;

  // Overview "amount" = the spent input; "receiving asset" = the estimated receive.
  const amountDisplay = quote
    ? `${formatAmountToLocale(quote.inputAmount, TOKEN_DECIMALS)} ${tickerFor(
        inputTokenId,
      )}`.trim()
    : EMPTY;
  const receiveTicker =
    kind === 'unstake' ? tickerFor(outputTokenId) : 'sUSDrf';
  const amountStakedDisplay = quote
    ? `${formatAmountToLocale(
        quote.estimatedOutput,
        TOKEN_DECIMALS,
      )} ${receiveTicker}`.trim()
    : EMPTY;
  // Route as a ticker chain ("ADA → USDr → sUSDr"): adjacent duplicates are
  // collapsed so each leg's toTokenId doubling as the next leg's fromTokenId
  // reads once through.
  const routeDisplay = useMemo(() => {
    const tickers: string[] = [];
    for (const leg of review?.route ?? []) {
      for (const tokenId of [leg.fromTokenId, leg.toTokenId]) {
        const ticker = tickerFor(tokenId);
        if (ticker && ticker !== tickers.at(-1)) tickers.push(ticker);
      }
    }
    return tickers.join(' → ');
  }, [review, tickerFor]);
  const priceImpactDisplay = review
    ? `${(review.priceImpact * 100).toFixed(2)}%`
    : EMPTY;
  const rateUnitTokenId = kind === 'unstake' ? outputTokenId : inputTokenId;
  const exchangeRateDisplay = quote
    ? t('realfi.manage.exchange-rate-value', {
        rate: quote.exchangeRate.toFixed(4),
        unit: tickerFor(rateUnitTokenId),
      })
    : EMPTY;

  // Same live boundary the Manage sheet's Cooldown Period row counts down
  // (fetched on its open). A boundary already passed is stale (its successor
  // wasn't fetched yet) → the static nominal copy, never a false "soon".
  const cooldownUnlockAtMsByNetwork = useLaceSelector(
    'realfiPosition.selectCooldownUnlockAtMsByNetwork',
  );
  const cooldownUnlockAtMs = realfiConfig
    ? cooldownUnlockAtMsByNetwork[realfiConfig.realfiNetwork]
    : undefined;
  const cooldownDisplay =
    cooldownUnlockAtMs !== undefined && cooldownUnlockAtMs > Date.now()
      ? formatCooldownRemaining(cooldownUnlockAtMs - Date.now(), t)
      : t('realfi.manage.cooldown-value');

  // Diagnostics (LW-14681): trace the flow status the sheet renders from —
  // the build/sign side-effects log elsewhere (SW on ext).
  useEffect(() => {
    realfiDebugLog('review sheet: rendering flow status', {
      status,
      hasReview: 'review' in flowState,
      ...('errorMessage' in flowState && {
        errorMessage: flowState.errorMessage,
      }),
      ...('previousStatus' in flowState && {
        previousStatus: flowState.previousStatus,
      }),
    });
  }, [status, flowState]);

  const resetFlow = useDispatchLaceAction('realfiFlow.reset', true);
  const prepare = useDispatchLaceAction('realfiFlow.prepareRequested');
  const onConfirm = useCallback(() => {
    realfiDebugLog('review sheet: confirm pressed', { status });
    // A quote past its TTL must never be signed — its floors and fees no
    // longer reflect the market. Re-quote the same request instead: the flow
    // re-enters Preparing (Confirm disables via !isReviewing) and this sheet
    // re-populates from the fresh review for a second Confirm.
    if (
      flowState.status === 'ReviewingTransaction' &&
      flowState.review.quoteExpiresAt < Date.now()
    ) {
      realfiDebugLog('review sheet: quote expired — re-quoting', {
        quoteExpiresAt: flowState.review.quoteExpiresAt,
      });
      const { kind, accountId, inputAmount, inputTokenId, outputTokenId } =
        flowState;
      resetFlow();
      prepare({ kind, accountId, inputAmount, inputTokenId, outputTokenId });
      return;
    }
    signingRequested();
  }, [signingRequested, status, flowState, resetFlow, prepare]);

  // Advance to the "all done" sheet once the flow has been queued, and route
  // post-confirm failures (build/sign/submit) to the error sheet — a failure
  // after Confirm must never leave this sheet rendering blank (F5/LW-14681).
  // Preparing-stage errors are excluded: the quote toast in ManageStake owns
  // those, and this sheet isn't the active surface when they occur.
  const errorSource =
    'previousStatus' in flowState ? flowState.previousStatus : undefined;
  useEffect(() => {
    if (status === 'Queued') {
      NavigationControls.navigate(SheetRoutes.RealFiAddedToQueue);
      return;
    }
    if (
      status === 'Error' &&
      (errorSource === 'SigningTransaction' ||
        errorSource === 'SubmittingTransaction')
    ) {
      NavigationControls.navigate(SheetRoutes.RealFiTransactionError);
    }
  }, [status, errorSource]);

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('realfi.review.title')}
          leftIconOnPress={navigation.goBack}
          testID="realfi-review-header"
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: t('realfi.review.confirm'),
            onPress: onConfirm,
            disabled: !isReviewing,
            loading: isSubmitting,
            testID: 'realfi-review-confirm-button',
          }}
        />
      ),
    });
  }, [navigation, t, onConfirm, isReviewing, isSubmitting]);

  return (
    <Sheet.Scroll contentContainerStyle={styles.scrollContent}>
      <Column style={styles.content} gap={spacing.L}>
        {/* 1. Overview */}
        <CollapsibleSection
          title={t('realfi.review.overview')}
          testID="realfi-review-overview">
          {/* Name + avatar tag, the dapp sign-tx account-row pattern
              (avatarUri when set, two-letter initials fallback). */}
          <Row
            justifyContent="space-between"
            alignItems="center"
            testID="realfi-review-account-row">
            <Text.XS variant="secondary">{t('realfi.review.account')}</Text.XS>
            <CustomTag
              size="M"
              label={accountName}
              testID="realfi-review-account-name"
              icon={
                <Avatar
                  size={24}
                  shape="rounded"
                  content={
                    accountMetadata?.avatarUri
                      ? {
                          img: { uri: accountMetadata.avatarUri },
                          fallback: accountName.substring(0, 2).toUpperCase(),
                        }
                      : {
                          fallback: accountName.substring(0, 2).toUpperCase(),
                        }
                  }
                />
              }
              color="white"
            />
          </Row>
          <ReviewRow
            label={t(
              kind === 'unstake'
                ? 'realfi.manage.unstake-amount'
                : 'realfi.manage.stake-amount',
            )}
            value={amountDisplay}
            testID="realfi-review-ada-amount-row"
          />
          {kind === 'unstake' && (
            <ReviewRow
              label={t('realfi.manage.cooldown-period')}
              value={cooldownDisplay}
              testID="realfi-review-cooldown-row"
            />
          )}
        </CollapsibleSection>

        <Divider />

        {/* 2. Advanced details */}
        <CollapsibleSection
          title={t('realfi.review.advanced-details')}
          testID="realfi-review-advanced-details">
          <ReviewRow
            label={t('realfi.review.receiving-asset')}
            value={amountStakedDisplay}
            testID="realfi-review-amount-staked-row"
          />
          <ReviewRow
            label={t('realfi.review.exchange-rate')}
            value={exchangeRateDisplay}
            testID="realfi-review-exchange-rate-row"
          />
          {routeDisplay !== '' && (
            <ReviewRow
              label={t('realfi.review.route')}
              value={routeDisplay}
              testID="realfi-review-route-row"
            />
          )}
          <ReviewRow
            label={t('realfi.review.price-impact')}
            value={priceImpactDisplay}
            testID="realfi-review-price-impact-row"
          />
        </CollapsibleSection>

        <Divider />

        {/* 3. Total Breakdown */}
        <CollapsibleSection
          title={t('realfi.review.total-breakdown')}
          testID="realfi-review-total-breakdown">
          <ReviewRow
            label={t('realfi.review.network-fee')}
            value={networkFeeLine}
            fiat={fiatLine(networkFee)}
            testID="realfi-review-network-fee-row"
          />
          {processingFee.units > 0 && (
            <ReviewRow
              label={t('realfi.review.processing-fee')}
              value={processingFeeLine}
              fiat={fiatLine(processingFee)}
              testID="realfi-review-processing-fee-row"
            />
          )}
          <ReviewRow
            label={t('realfi.review.service-fee')}
            value={serviceFeeLine}
            fiat={fiatLine(serviceFee)}
            testID="realfi-review-service-fee-row"
          />
          <ReviewRow
            label={t('realfi.review.total-fees')}
            value={totalFeeLine}
            fiat={fiatLine(totalFee)}
            testID="realfi-review-total-fees-row"
          />
        </CollapsibleSection>
      </Column>
    </Sheet.Scroll>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.M,
  },
  // The sheet's action footer is pinned over the scroll body — reserve its
  // height so the last Total-Breakdown rows clear it instead of being hidden
  // behind the Confirm button when the sections overflow the window.
  scrollContent: {
    paddingBottom: footerHeight.horizontal,
  },
});
