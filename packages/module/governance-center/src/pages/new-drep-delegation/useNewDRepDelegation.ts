import { Cardano } from '@cardano-sdk/core';
import {
  ADA_DECIMALS,
  DEFAULT_DECIMALS,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { toHttpImageUrl } from '@lace-contract/governance-center';
import { useTranslation } from '@lace-contract/i18n';
import { AccountId } from '@lace-contract/wallet-repo';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import { formatAmountToLocale } from '@lace-lib/util-render';
import { useEffect, useMemo, useRef } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { AnyAddress } from '@lace-contract/addresses';
import type {
  CardanoAddressData,
  DRepOption,
} from '@lace-contract/cardano-context';
import type { DRepDelegationSheetProps } from '@lace-lib/ui-toolkit';
import type { BlockchainName } from '@lace-lib/util-store';

type DRepParameter =
  | { type: 'alwaysAbstain' }
  | { type: 'alwaysNoConfidence' }
  | { type: 'specific'; drepId: string };

export const useNewDRepDelegation = (
  dRep: DRepParameter,
  accountIdString: string,
): DRepDelegationSheetProps | null => {
  const { t } = useTranslation();

  const feeCalculationRequested = useDispatchLaceAction(
    'voteDelegationFlow.feeCalculationRequested',
  );
  const delegationRequested = useDispatchLaceAction(
    'voteDelegationFlow.delegationRequested',
  );
  const resetFlow = useDispatchLaceAction('voteDelegationFlow.reset');

  const flowState = useLaceSelector(
    'voteDelegationFlow.selectVoteDelegationFlowState',
  );

  const accountId = AccountId(accountIdString);

  const allAccounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const account = useMemo(
    () => allAccounts.find(a => a.accountId === accountId),
    [allAccounts, accountId],
  );

  const dReps = useLaceSelector('dRepsList.selectDReps');
  const drepSummary = useMemo(
    () =>
      dRep.type === 'specific'
        ? dReps.find(summary => summary.drepId === dRep.drepId)
        : undefined,
    [dReps, dRep],
  );

  const addresses = useLaceSelector('addresses.selectByAccountId', accountId);
  const stakeKeyHash = useMemo(() => {
    const withRewardAccount = (
      addresses as AnyAddress<CardanoAddressData>[] | undefined
    )?.find(address => address?.data?.rewardAccount);
    const rewardAccount = withRewardAccount?.data?.rewardAccount;
    if (!rewardAccount) return undefined;
    return Cardano.RewardAccount.toHash(
      Cardano.RewardAccount(rewardAccount.toString()),
    ).toString();
  }, [addresses]);

  const networkId = useLaceSelector(
    'network.selectActiveNetworkId',
    'Cardano' as BlockchainName,
  );

  const ticker = useMemo(
    () =>
      networkId
        ? getAdaTokenTickerByNetwork(
            networkId as Parameters<typeof getAdaTokenTickerByNetwork>[0],
          )
        : 'ADA',
    [networkId],
  );

  const flowStateRef = useRef(flowState);
  flowStateRef.current = flowState;

  useEffect(() => {
    const state = flowStateRef.current;
    if (!state || state.status === 'Idle') {
      feeCalculationRequested({ accountId, dRep: dRep as DRepOption });
    }

    return () => {
      resetFlow();
    };
  }, []);

  useEffect(() => {
    if (flowState?.status === 'Success') {
      NavigationControls.navigate(SheetRoutes.DRepDelegationSuccess);
    }
  }, [flowState?.status]);

  const drepDisplayValue = useMemo(() => {
    switch (dRep.type) {
      case 'alwaysAbstain':
        return t('v2.governance.browse-drep.option.abstain');
      case 'alwaysNoConfidence':
        return t('v2.governance.browse-drep.option.no-confidence');
      case 'specific':
        return dRep.drepId;
    }
  }, [dRep, t]);

  const summaryState =
    flowState &&
    (flowState.status === 'Summary' ||
      flowState.status === 'AwaitingConfirmation' ||
      flowState.status === 'Processing')
      ? flowState
      : undefined;

  const feeLovelace = summaryState?.fees[0]?.amount;
  const depositLovelace =
    summaryState?.deposit && summaryState.deposit !== '0'
      ? summaryState.deposit
      : undefined;

  const formatAda = (lovelace: string) =>
    `${formatAmountToLocale(
      lovelace,
      ADA_DECIMALS,
      DEFAULT_DECIMALS,
    )} ${ticker}`;

  const transactionFeeAda = feeLovelace ? formatAda(feeLovelace) : '—';

  const depositAda = depositLovelace ? formatAda(depositLovelace) : undefined;

  const totalAda = feeLovelace
    ? formatAda(
        (BigInt(feeLovelace) + BigInt(depositLovelace ?? '0')).toString(),
      )
    : '—';

  const certificate = useMemo<DRepDelegationSheetProps['certificate']>(() => {
    const rows: { label: string; value: string }[] = [
      {
        label: t('v2.governance.delegation-confirmation.certificate.type'),
        value: depositLovelace
          ? t(
              'v2.governance.delegation-confirmation.certificate.type.vote-registration-delegation',
            )
          : t(
              'v2.governance.delegation-confirmation.certificate.type.vote-delegation',
            ),
      },
      {
        label: t('v2.governance.delegation-confirmation.certificate.drep-id'),
        value: drepDisplayValue,
      },
    ];
    if (stakeKeyHash) {
      rows.push({
        label: t(
          'v2.governance.delegation-confirmation.certificate.stake-key-hash',
        ),
        value: stakeKeyHash,
      });
    }
    return {
      title: t('v2.governance.delegation-confirmation.certificate.title'),
      rows,
    };
  }, [t, depositLovelace, drepDisplayValue, stakeKeyHash]);

  const rawTransaction = summaryState?.serializedTx
    ? {
        title: t('v2.governance.delegation-confirmation.raw-tx'),
        cbor: summaryState.serializedTx,
      }
    : undefined;

  const isLoading = !flowState || flowState.status === 'CalculatingFees';

  if (isLoading) return null;

  const isTxInFlight =
    flowState.status === 'AwaitingConfirmation' ||
    flowState.status === 'Processing';

  return {
    headerTitle: t('v2.governance.delegation-confirmation.title'),
    drepLabel: t('v2.governance.delegation-confirmation.drep-label'),
    drepValue: drepDisplayValue,
    drepName: drepSummary?.name,
    drepAvatarUri: toHttpImageUrl(drepSummary?.metadata?.imageUrl),
    sourceAccountLabel: t('v2.governance.delegation-confirmation.account'),
    sourceAccountName: account?.metadata?.name ?? accountIdString,
    totalBreakdownLabel: t('v2.governance.delegation-confirmation.total'),
    stakeKeyDepositLabel: depositAda
      ? t('v2.governance.delegation-confirmation.stake-key-deposit')
      : undefined,
    stakeKeyDepositAda: depositAda,
    transactionFeeLabel: t(
      'v2.governance.delegation-confirmation.transaction-fee',
    ),
    transactionFeeAda,
    totalLabel: t('v2.governance.delegation-confirmation.total'),
    totalAda,
    certificate,
    rawTransaction,
    cancelButtonLabel: t('v2.governance.delegation-confirmation.button.cancel'),
    delegateButtonLabel: t(
      'v2.governance.delegation-confirmation.button.delegate',
    ),
    delegateButtonDisabled:
      flowState.status !== 'Summary' || !flowState.confirmButtonEnabled,
    delegateButtonLoading: isTxInFlight,
    onCancelPress: () => {
      NavigationControls.closeSheet();
    },
    onDelegatePress: () => {
      // The machine ignores delegationRequested outside Summary; guarding here
      // keeps the press a no-op without logging "handler not found".
      if (flowState.status === 'Summary') delegationRequested();
    },
  };
};
