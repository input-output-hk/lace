import {
  ADA_DECIMALS,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import {
  Avatar,
  Column,
  CustomTag,
  Divider,
  DropdownMenu,
  Icon,
  Row,
  Sheet,
  Text,
  spacing,
} from '@lace-lib/ui-toolkit';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import { CollapsibleSection } from '../components/CollapsibleSection';
import { ReviewRow } from '../components/ReviewRow';
import { adaPriceInCurrencyFrom } from '../fee-display';
import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { AccountId } from '@lace-contract/wallet-repo';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

// Stable selector param (avoids a fresh object identity every render).
const CARDANO_BLOCKCHAIN_PARAM = { blockchainName: 'Cardano' } as const;

// USDr uses 6 decimals.
const USDR_DECIMALS = 6;

/**
 * Ready-to-withdraw review sheet. Reached from the USDr staking detail's
 * withdraw banner and styled like {@link RealFiReviewTransaction} (Overview +
 * Total Breakdown collapsible sections). Withdrawables are wallet-wide but each
 * account's matured timelocks are claimed by that account's own key, so the
 * sheet is scoped to a single account: when more than one account has
 * withdrawables a send-flow-style account dropdown selects which one; with a
 * single account the dropdown is omitted and its Account row shown instead.
 * "Withdraw all" claims the selected account's timelocks in one signed tx
 * (`withdrawRequested` → `makeWithdraw` side-effect → one batched claim tx).
 */
export const RealFiWithdraw = (
  props: SheetScreenProps<SheetRoutes.RealFiWithdraw>,
) => {
  const { navigation } = props;
  const { t } = useTranslation();

  // Wallet-wide: every withdraw-ready timelock across accounts, each tagged with
  // its accountId.
  const withdrawable = useLaceSelector('realfiPosition.selectAllWithdrawables');
  const networkType = useLaceSelector('network.selectNetworkType');
  const withdraw = useDispatchLaceAction('realfiPosition.withdrawRequested');

  // Account name lookup (store-wired, same source as Manage Stake / the review
  // sheet): accountId → { accountName, walletName }.
  const accountsResult = useLaceSelector(
    'wallets.selectActiveNetworkAccountsByBlockchainName',
    CARDANO_BLOCKCHAIN_PARAM,
  );
  const walletsResult = useLaceSelector('wallets.selectAll');
  const accounts = useMemo(
    () => (Array.isArray(accountsResult) ? accountsResult : []),
    [accountsResult],
  );
  const wallets = useMemo(
    () => (Array.isArray(walletsResult) ? walletsResult : []),
    [walletsResult],
  );
  const accountMetaById = useMemo(() => {
    const map = new Map<
      AccountId,
      { accountName: string; walletName: string; avatarUri?: string }
    >();
    for (const account of accounts) {
      const wallet = wallets.find(w => w?.walletId === account?.walletId);
      map.set(account.accountId, {
        accountName: account?.metadata?.name ?? '',
        walletName: wallet?.metadata?.name ?? '',
        avatarUri: account?.metadata?.avatarUri,
      });
    }
    return map;
  }, [accounts, wallets]);

  // Distinct accounts that actually have withdraw-ready timelocks.
  const accountIdsWithItems = useMemo(
    () => [...new Set(withdrawable.map(item => item.accountId))],
    [withdrawable],
  );
  const hasMultipleAccounts = accountIdsWithItems.length > 1;

  const [selectedAccountId, setSelectedAccountId] = useState<
    AccountId | undefined
  >(accountIdsWithItems[0]);
  // Keep the selection valid as withdrawables load / change.
  useEffect(() => {
    if (
      accountIdsWithItems.length > 0 &&
      (!selectedAccountId || !accountIdsWithItems.includes(selectedAccountId))
    ) {
      setSelectedAccountId(accountIdsWithItems[0]);
    }
  }, [accountIdsWithItems, selectedAccountId]);

  const selectedMeta = selectedAccountId
    ? accountMetaById.get(selectedAccountId)
    : undefined;

  // The selected account's matured timelocks + their summed USDr.
  const selectedItems = useMemo(
    () => withdrawable.filter(item => item.accountId === selectedAccountId),
    [withdrawable, selectedAccountId],
  );
  const claimTotal = useMemo(
    () =>
      selectedItems
        .reduce((sum, unstake) => sum + BigInt(unstake.usdrAmount), 0n)
        .toString(),
    [selectedItems],
  );
  const claimAmountDisplay = `${formatAmountToLocale(
    claimTotal,
    USDR_DECIMALS,
  )} USDrf`;

  const accountDropdownItems = useMemo(
    () =>
      accountIdsWithItems.map(id => {
        const meta = accountMetaById.get(id);
        return {
          id,
          text: meta?.walletName ?? '',
          subText: meta?.accountName ?? '',
        };
      }),
    [accountIdsWithItems, accountMetaById],
  );
  const handleAccountChange = useCallback(
    (index: number) => {
      const id = accountIdsWithItems[index];
      if (id) setSelectedAccountId(id);
    },
    [accountIdsWithItems],
  );

  // ADA fiat price for the fee lines (same wiring as the review sheet).
  const prices = useLaceSelector('tokenPricing.selectPrices');
  const currency = useLaceSelector('tokenPricing.selectCurrencyPreference');
  // Priced like the send flow's fee rows (LW-14681): the fixed lovelace price
  // entry, gated only on a positive price.
  const adaPriceInCurrency = adaPriceInCurrencyFrom(prices);

  // Real fee via a dry-run build (LW-14684): the sheet quotes the exact
  // ledger min fee the claim tx will pay. Until (or if) the quote resolves
  // the rows show an em dash — never a hardcoded figure.
  const requestFeeQuote = useDispatchLaceAction(
    'realfiPosition.withdrawFeeQuoteRequested',
  );
  useEffect(() => {
    if (!selectedAccountId || selectedItems.length === 0) return;
    requestFeeQuote({ accountId: selectedAccountId, unstakes: selectedItems });
  }, [requestFeeQuote, selectedAccountId, selectedItems]);
  const quotedFeeLovelace = useLaceSelector(
    'realfiPosition.selectWithdrawFeeLovelace',
  );
  const feeBaseUnits = quotedFeeLovelace;

  // Success state (LW-14684): the sheet stays open through signing/submitting
  // and flips to "Claim completed" when the side-effect records the success —
  // the same store-signal seam the error sheet uses for failures.
  const withdrawSuccess = useLaceSelector(
    'realfiPosition.selectWithdrawSuccess',
  );
  const clearSuccess = useDispatchLaceAction(
    'realfiPosition.withdrawSuccessCleared',
  );
  // Store-derived, NOT local state: the error sheet's Try again re-dispatches
  // withdrawRequested without touching this sheet, and a still-enabled CTA
  // would let a second tap double-claim the same timelocks. The flag clears
  // when the attempt settles (success / failure / declined prompt).
  const isSubmitting = useLaceSelector('realfiPosition.selectWithdrawInFlight');
  // A success left showing when the sheet dies must not leak into the next
  // claim; the sheet owns clearing it.
  useEffect(
    () => () => {
      clearSuccess();
    },
    [clearSuccess],
  );
  const feeAda = (baseUnits: string): number =>
    Number(baseUnits) / 10 ** ADA_DECIMALS;
  // tADA off mainnet, as everywhere else in the app.
  const adaTicker = getAdaTokenTickerByNetwork(networkType);
  const adaLine = (baseUnits: string | undefined): string =>
    baseUnits === undefined
      ? '—'
      : `-${feeAda(baseUnits).toFixed(2)} ${adaTicker}`;
  // Always render a fiat line beneath each fee (in the user's stored display
  // currency); when the ADA price is unavailable (e.g. testnet ADA is
  // unpriced) it falls back to a 0.00 placeholder rather than being hidden.
  const fiatLine = (baseUnits: string | undefined): string =>
    `-${(baseUnits !== undefined && adaPriceInCurrency !== undefined
      ? feeAda(baseUnits) * adaPriceInCurrency
      : 0
    ).toFixed(2)} ${currency.ticker}`;

  const onWithdraw = useCallback(() => {
    if (!selectedAccountId || selectedItems.length === 0) return;
    // The sheet stays open: the signing prompt raises above it, and the sheet
    // flips to the success state (or the error sheet presents) when the
    // side-effect resolves. withdrawRequested itself sets withdrawInFlight.
    withdraw({ accountId: selectedAccountId, unstakes: selectedItems });
  }, [withdraw, selectedAccountId, selectedItems]);

  const onSuccessClose = useCallback(() => {
    clearSuccess();
    NavigationControls.closeSheet();
  }, [clearSuccess]);

  const isSuccess = withdrawSuccess !== undefined;
  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('realfi.withdraw.title')}
          testID="realfi-withdraw-header"
        />
      ),
      footer: isSuccess ? (
        <Sheet.Footer
          primaryButton={{
            label: t('realfi.error.close'),
            onPress: onSuccessClose,
            testID: 'realfi-withdraw-success-close',
          }}
        />
      ) : (
        <Sheet.Footer
          primaryButton={{
            label: t('realfi.withdraw.cta'),
            onPress: onWithdraw,
            // Confirming before the dry-run fee quote resolves would sign a
            // claim whose cost the user never saw (the fee rows still show an
            // em dash) — the CTA waits for the quote like the stake flow's.
            disabled:
              selectedItems.length === 0 ||
              isSubmitting ||
              quotedFeeLovelace === undefined,
            loading: isSubmitting,
            testID: 'realfi-withdraw-cta',
          }}
        />
      ),
    });
  }, [
    navigation,
    t,
    onWithdraw,
    onSuccessClose,
    isSuccess,
    isSubmitting,
    selectedItems.length,
    quotedFeeLovelace,
  ]);

  // Success result screen: centered smile + "Claim completed" (the queue
  // sheet's result layout), Close in the footer above.
  if (isSuccess) {
    return (
      <Sheet.Scroll>
        <Column
          gap={spacing.M}
          alignItems="center"
          justifyContent="center"
          style={styles.successContent}>
          <Icon
            name="Smile"
            size={SUCCESS_ICON_SIZE}
            testID="realfi-withdraw-success-icon"
          />
          <Text.L align="center" testID="realfi-withdraw-success-title">
            {t('realfi.withdraw.success-title')}
          </Text.L>
        </Column>
      </Sheet.Scroll>
    );
  }

  return (
    <Sheet.Scroll>
      <Column style={styles.content} gap={spacing.L}>
        {hasMultipleAccounts ? (
          <>
            <DropdownMenu
              items={accountDropdownItems}
              title={selectedMeta?.walletName ?? ''}
              titleSubText={selectedMeta?.accountName ?? ''}
              actionText={claimAmountDisplay}
              selectedItemId={selectedAccountId}
              onSelectItem={handleAccountChange}
              truncateText
              testID="realfi-withdraw-account-selector"
            />
            <Divider />
          </>
        ) : null}

        {/* 1. Overview */}
        <CollapsibleSection
          title={t('realfi.review.overview')}
          testID="realfi-withdraw-overview">
          {hasMultipleAccounts ? null : (
            <Row
              justifyContent="space-between"
              alignItems="center"
              testID="realfi-withdraw-account-row">
              <Text.XS variant="secondary">
                {t('realfi.review.account')}
              </Text.XS>
              <CustomTag
                size="M"
                label={selectedMeta?.accountName ?? ''}
                testID="realfi-withdraw-account-name"
                icon={
                  <Avatar
                    size={24}
                    shape="rounded"
                    content={
                      selectedMeta?.avatarUri
                        ? {
                            img: { uri: selectedMeta.avatarUri },
                            fallback: (selectedMeta?.accountName ?? '')
                              .substring(0, 2)
                              .toUpperCase(),
                          }
                        : {
                            fallback: (selectedMeta?.accountName ?? '')
                              .substring(0, 2)
                              .toUpperCase(),
                          }
                    }
                  />
                }
                color="white"
              />
            </Row>
          )}
          <ReviewRow
            label={t('realfi.withdraw.claim-amount')}
            value={claimAmountDisplay}
            testID="realfi-withdraw-claim-amount-row"
          />
        </CollapsibleSection>

        <Divider />

        {/* 2. Total Breakdown */}
        <CollapsibleSection
          title={t('realfi.review.total-breakdown')}
          testID="realfi-withdraw-total-breakdown">
          <ReviewRow
            label={t('realfi.review.network-fee')}
            value={adaLine(feeBaseUnits)}
            fiat={fiatLine(feeBaseUnits)}
            testID="realfi-withdraw-network-fee-row"
          />
          {/* Claims carry no RealFi service fee; the explicit zero row must
              still render for transparency (LW-14684 — never omit it). */}
          <ReviewRow
            label={t('realfi.review.service-fee')}
            value={`0 ${adaTicker}`}
            fiat={fiatLine('0')}
            testID="realfi-withdraw-service-fee-row"
          />
          <ReviewRow
            label={t('realfi.review.total-fees')}
            value={adaLine(feeBaseUnits)}
            fiat={fiatLine(feeBaseUnits)}
            testID="realfi-withdraw-total-fees-row"
          />
        </CollapsibleSection>
      </Column>
    </Sheet.Scroll>
  );
};

const SUCCESS_ICON_SIZE = 48;

const styles = StyleSheet.create({
  content: {
    padding: spacing.M,
  },
  successContent: {
    paddingVertical: spacing.XXL,
  },
});
