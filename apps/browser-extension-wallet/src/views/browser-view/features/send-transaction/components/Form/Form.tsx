import React, { useEffect, useMemo, useState } from 'react';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { Tokens } from '@src/types';
import { COIN_SELECTION_ERRORS, PriceResult } from '@hooks';
import { useCurrencyStore } from '@providers';
import { Wallet } from '@lace/cardano';
import { SendTransactionCost } from '@lace/core';
import { Banner, Button, useObservable } from '@lace/common';
import { useWalletStore } from '@src/stores';
import { useMaxAda } from '@hooks/useMaxAda';
import BundleIcon from '../../../../../../assets/icons/bundle-icon.component.svg';
import { getFee } from '../SendTransactionSummary';
import { useBuiltTxState, useSpentBalances, useLastFocusedInput, useOutputs } from '../../store';
import { getNextInsufficientBalanceInputs, getReachedMaxAmountList, hasReachedMaxAmountAda } from '../../helpers';
import { MetadataInput } from './MetadataInput';
import { BundlesList } from './BundlesList';
import { formatAdaAllocation, getNextBundleCoinId } from './util';
import { Box, Text, WarningIconCircleComponent } from '@input-output-hk/lace-ui-toolkit';
import styles from './Form.module.scss';
import { useRewardAccountsData } from '../../../staking/hooks';

export interface Props {
  assets: Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>;
  coinBalance: string;
  assetBalances: Tokens;
  isPopupView?: boolean;
  isLoading?: boolean;
  prices: PriceResult;
}

export const Form = ({
  isPopupView,
  coinBalance,
  assetBalances,
  assets,
  isLoading,
  prices
}: Props): React.ReactElement => {
  const { t } = useTranslation();
  const {
    inMemoryWallet,
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const balance = useObservable(inMemoryWallet.balance.utxo.total$);
  const { builtTxData: { totalMinimumCoins, uiTx, error } = {} } = useBuiltTxState();

  const [isBundle, setIsBundle] = useState(false);
  const tokensUsed = useSpentBalances();
  const spendableCoin = useMaxAda();
  const [insufficientBalanceInputs, setInsufficientBalanceInputs] = useState<string[]>([]); // we save all the element input ids with insufficient balance error
  const [insufficientAvailableBalanceInputs, setInsufficientAvailableBalanceInputs] = useState<string[]>([]);
  const { lastFocusedInput } = useLastFocusedInput();
  const { fiatCurrency } = useCurrencyStore();
  const availableRewards = useObservable(inMemoryWallet?.balance?.rewardAccounts?.rewards$);
  const { lockedStakeRewards } = useRewardAccountsData();

  const { setNewOutput } = useOutputs();

  const handleAddRow = () => {
    const nextBundleId = getNextBundleCoinId(spendableCoin?.toString(), assetBalances, tokensUsed, assets, cardanoCoin);
    setNewOutput(nextBundleId);
    setIsBundle(true);
  };

  const reachedMaxAmountList = useMemo(
    () =>
      new Set(
        getReachedMaxAmountList({
          assets,
          tokensUsed,
          balance,
          cardanoCoin,
          availableRewards,
          exceed: true
        }) || []
      ),
    [assets, availableRewards, balance, cardanoCoin, tokensUsed]
  );

  const reachedMaxAvailableAmount =
    balance?.coins &&
    hasReachedMaxAmountAda({
      tokensUsed,
      balance: BigInt(balance?.coins.toString()) - BigInt(lockedStakeRewards.toString()),
      cardanoCoin,
      availableRewards
    });

  useEffect(() => {
    if (lastFocusedInput) {
      const id = lastFocusedInput.split('.')[1]; // we get the coin id (cardano id or asset id) to check if it is in the reachedMaxAmountList
      setInsufficientBalanceInputs(getNextInsufficientBalanceInputs(lastFocusedInput, reachedMaxAmountList, id));

      setInsufficientAvailableBalanceInputs(
        getNextInsufficientBalanceInputs(
          lastFocusedInput,
          new Set(reachedMaxAvailableAmount ? [cardanoCoin.id] : []),
          id
        )
      );
    }
  }, [reachedMaxAmountList, lastFocusedInput, cardanoCoin.id, reachedMaxAvailableAmount]);
  const fee = uiTx?.fee?.toString() ?? '0';
  const totalCost = getFee(fee.toString(), prices?.cardano?.price, cardanoCoin, fiatCurrency);

  const hasMissingCoins = totalMinimumCoins?.coinMissing && totalMinimumCoins?.coinMissing !== '0';

  const bundleDisabled =
    !spendableCoin ||
    !getNextBundleCoinId(spendableCoin?.toString(), assetBalances, tokensUsed, assets, cardanoCoin)?.length;

  const utxoDepletedMsg = (
    <>
      <Text.Button>{t('browserView.transaction.send.utxoDepletedBannerErrorText')}</Text.Button>
      {spendableCoin > 0 && (
        <Text.Button> {t('browserView.transaction.send.utxoDepletedBannerMaxButtonText')}</Text.Button>
      )}
    </>
  );

  return (
    <Skeleton loading={isLoading}>
      {error === COIN_SELECTION_ERRORS.FULLY_DEPLETED_ERROR && (
        <Box mb="$20">
          <Banner
            withIcon
            message={utxoDepletedMsg}
            customIcon={
              <Text.Label color="warning">
                <WarningIconCircleComponent />
              </Text.Label>
            }
          />
        </Box>
      )}
      <BundlesList
        isPopupView={isPopupView}
        coinBalance={coinBalance}
        isBundle={isBundle}
        setIsBundle={setIsBundle}
        insufficientBalanceInputs={insufficientBalanceInputs}
        insufficientAvailableBalanceInputs={insufficientAvailableBalanceInputs}
        reachedMaxAmountList={reachedMaxAmountList}
        assets={assets}
        assetBalances={assetBalances}
        spendableCoin={spendableCoin}
      />

      {!isPopupView && (
        <div className={styles.actionsBtnContainer}>
          <Button
            size="large"
            color="secondary"
            variant="outlined"
            block
            className={styles.actionBtn}
            onClick={handleAddRow}
            data-testid="add-bundle-button"
            disabled={bundleDisabled}
          >
            <BundleIcon className={styles.bundleIcon} />
            {t('browserView.transaction.send.advanced.output')}
          </Button>
          <p className={styles.message} data-testid="bundle-description">
            {t('browserView.transaction.send.advancedFlowText')}{' '}
          </p>
        </div>
      )}

      <MetadataInput />

      <div className={styles.costsContainer}>
        <div className={styles.titleContainer}>
          <h1 className={styles.title} data-testid="transaction-costs-section-label">
            {t('browserView.transaction.send.transactionCosts')}
          </h1>
        </div>

        <SendTransactionCost
          label={t('browserView.transaction.send.transactionFee')}
          testId="transaction-fee"
          adaAmount={totalCost.ada}
          fiatAmount={totalCost.fiat}
          tooltipContent={t('send.theAmountYoullBeChargedToProcessYourTransaction')}
        />

        {hasMissingCoins && (
          <SendTransactionCost
            label={t('browserView.transaction.send.adaAllocation')}
            testId="ada-allocation"
            tooltipContent={t('send.toSendAnNFTOrNativeToken')}
            {...formatAdaAllocation({
              missingCoins: totalMinimumCoins?.coinMissing,
              fiat: prices?.cardano?.price,
              cardanoCoin,
              fiatCurrency
            })}
          />
        )}
      </div>
    </Skeleton>
  );
};
