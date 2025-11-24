import React, { useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { Form } from './Form';
import { FormLayout } from './FormLayout';
import { TransitionAcknowledgmentDialog } from '@components/TransitionAcknowledgmentDialog';
import { useWalletStore } from '@src/stores';
import { useFetchCoinPrice } from '@hooks';
import { useObservable } from '@lace/common';

const STORAGE_MEMO_ENTRY_NAME = 'hideSendHwDialog';

interface TransactionFormProps {
  isPopupView?: boolean;
}

export const TransactionForm = ({ isPopupView }: TransactionFormProps): React.ReactElement => {
  const { t } = useTranslation();
  const { isInMemoryWallet, inMemoryWallet } = useWalletStore();
  const { priceResult, status } = useFetchCoinPrice();
  const dialogHiddenByUser = localStorage.getItem(STORAGE_MEMO_ENTRY_NAME) === 'true';
  const shouldShowAcknowledgmentDialog = !dialogHiddenByUser && isPopupView && !isInMemoryWallet;
  const [isTransitionAcknowledgmentDialogVisible, setIsTransitionAcknowledgmentDialogVisible] =
    useState(shouldShowAcknowledgmentDialog);
  const toggleisTransitionAcknowledgmentDialog = () =>
    setIsTransitionAcknowledgmentDialogVisible(!isTransitionAcknowledgmentDialogVisible);

  const assets = useObservable(inMemoryWallet.assetInfo$);
  const balance = useObservable(inMemoryWallet.balance.utxo.total$);
  const availableRewards = useObservable(inMemoryWallet.balance.rewardAccounts.rewards$);

  const coinBalance = useMemo(
    () => (balance?.coins ? (balance?.coins + BigInt(availableRewards || 0)).toString() : '0'),
    [balance?.coins, availableRewards]
  );
  // we need to check if assets is undefined because if already set value of token with decimal places
  // if we get back from other step assets goes undefined until the first value is emitted again,
  // so, when we try to parse the value with assetBalanceToBigInt the decimal metadata is still not loaded and throws an error that cannot covert to bigint
  const isLoading = status === 'fetching' || !assets;
  return (
    <>
      <TransitionAcknowledgmentDialog
        visible={isTransitionAcknowledgmentDialogVisible}
        onClose={toggleisTransitionAcknowledgmentDialog}
        title={t('browserView.onboarding.sendTransitionAcknowledgment.title')}
        description={t('browserView.onboarding.sendTransitionAcknowledgment.description')}
        confirmationLabel={t('browserView.onboarding.sendTransitionAcknowledgment.iUnderstand')}
        storageMemoEntryName={STORAGE_MEMO_ENTRY_NAME}
      />
      <FormLayout>
        <Form
          isPopupView={isPopupView}
          assetBalances={balance?.assets}
          coinBalance={coinBalance}
          isLoading={isLoading}
          prices={priceResult}
          assets={assets}
        />
      </FormLayout>
    </>
  );
};
