/* eslint-disable react/no-multi-comp */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { SendTransactionCost } from '@lace/core';
import { Button } from '@lace/common';
import { AddressInput } from './AddressInput';
import { CoinInput } from './CoinInput';
import { FormRowHeader } from './FormRowHeader';
import {
  useOutputs,
  useBuiltTxState,
  useSections,
  useCurrentRow,
  useSpentBalances,
  useLastFocusedInput
} from '../../store';
import { MetadataInput } from './MetadataInput';
import { getFee } from '../SendTransactionSummary';
import { AssetInfo, Sections, SpentBalances } from '../../types';
import { useWalletStore } from '@src/stores';
import { useMaxAda } from '@hooks/useMaxAda';
import BigNumber from 'bignumber.js';
import { useAnalyticsContext, useCurrencyStore } from '@providers';
import {
  AnalyticsEventActions,
  AnalyticsEventCategories,
  AnalyticsEventNames
} from '@providers/AnalyticsProvider/analyticsTracker';
import { CoinId, CurrencyInfo, Tokens } from '@src/types';
import BundleIcon from '../../../../../../assets/icons/bundle-icon.component.svg';

import styles from './Form.module.scss';
import { getReachedMaxAmountList } from '../../helpers';
import { PriceResult, useObservable } from '@hooks';

const RowContainer = ({
  children,
  id,
  focusRow,
  isBundle
}: {
  children: React.ReactNode;
  id: string;
  focusRow?: string;
  isBundle?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    if (focusRow === id || isBundle) {
      ref.current?.scrollIntoView(false);
    }
  }, [focusRow, id, isBundle]);

  return (
    <div ref={ref} className={styles.outputRowContainer} data-testid="asset-bundle-container">
      {children}
    </div>
  );
};

const cardanoAssetId = '1';

const formatAdaAllocation = ({
  missingCoins,
  fiat = 0,
  cardanoCoin,
  fiatCurrency
}: {
  missingCoins: string;
  fiat: number;
  cardanoCoin: CoinId;
  fiatCurrency: CurrencyInfo;
}) => ({
  adaAmount: `${Wallet.util.lovelacesToAdaString(missingCoins)} ${cardanoCoin.symbol}`,
  fiatAmount: `$${Wallet.util.convertLovelaceToFiat({
    lovelaces: missingCoins ?? '0',
    fiat
  })} ${fiatCurrency?.code}`
});

const getNextBundleCoinId = (
  balance: string,
  assetBalances: Tokens,
  usedCoins: SpentBalances,
  info: Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>,
  cardanoCoin: CoinId
) => {
  const adaAmountInLovelace = usedCoins[cardanoCoin.id] ? usedCoins[cardanoCoin.id] : '0';
  const balanceInAda = Wallet.util.lovelacesToAdaString(balance);
  if (new BigNumber(adaAmountInLovelace).lt(balanceInAda)) return cardanoCoin.id;
  const filterdAssets = [];

  if (assetBalances?.size) {
    for (const [id, value] of assetBalances) {
      const coinAmount = usedCoins[id.toString()] || '0';
      const bigintAmount = Wallet.util.assetBalanceToBigInt(coinAmount, info.get(id));

      if (bigintAmount < value) filterdAssets.push(id.toString());
    }
  }

  return filterdAssets.length > 0 ? filterdAssets[0] : undefined;
};

interface IFormProps {
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
}: IFormProps): React.ReactElement => {
  const { t } = useTranslation();
  const {
    inMemoryWallet,
    walletUI: { cardanoCoin },
    currentChain
  } = useWalletStore();
  const balance = useObservable(inMemoryWallet.balance.utxo.total$);
  const { builtTxData: { error, totalMinimumCoins, uiTx } = {} } = useBuiltTxState();
  const { setSection } = useSections();
  const [row, setCurrentRow] = useCurrentRow();
  const [isBundle, setIsBundle] = useState(false);
  const tokensUsed = useSpentBalances();
  const spendableCoin = useMaxAda();
  const analytics = useAnalyticsContext();
  const [insufficientBalanceInputs, setInsufficientBalanceInputs] = useState([]); // we save all the element input ids with insufficient balance error
  const { lastFocusedInput } = useLastFocusedInput();
  const { fiatCurrency } = useCurrencyStore();

  const { ids, uiOutputs, setNewOutput, removeExistingOutput } = useOutputs();
  const handleRemoveRow = (id: string) => removeExistingOutput(id);
  const isEmptyAssets = assetBalances?.size === 0;

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
          spendableCoin,
          balance,
          cardanoCoin,
          exceed: true
        }) || []
      ),
    [assets, balance, cardanoCoin, spendableCoin, tokensUsed]
  );

  useEffect(() => {
    if (lastFocusedInput) {
      const id = lastFocusedInput.split('.')[1]; // we get the coin id (cardano id or asset id) to check if it is in the reachedMaxAmountList
      setInsufficientBalanceInputs((prevInputsList) => {
        const isInMaxAmountList = reachedMaxAmountList.has(id); // check the if the id exists in reachedMaxAmountList
        const isInInsufficientBalanceList = prevInputsList.includes(lastFocusedInput); // check the if input element id exists in insufficient balance list

        // check if the last focused element has insufficient balance and doesn't exists in insufficient balance list
        if (isInMaxAmountList && !isInInsufficientBalanceList) {
          return [...prevInputsList, lastFocusedInput]; // add it to the insufficient balance list
          // check if the last focused element has balance and exists in insufficient balance list
        } else if (!isInMaxAmountList && isInInsufficientBalanceList) {
          return prevInputsList.filter((inputId) => inputId.split('.')[1] !== id); // remove all items with same coin id (cardano id or asset id)
        }

        return prevInputsList;
      });
    }
  }, [reachedMaxAmountList, lastFocusedInput]);

  const canAddMoreAssets = (outputId: string) => {
    const assetsIdsUsedInOutput = new Set(uiOutputs[outputId].assets.map(({ id }: AssetInfo) => id));

    return (
      (!reachedMaxAmountList.has(cardanoAssetId) && !assetsIdsUsedInOutput.has(cardanoAssetId)) ||
      (!!balance?.assets?.size &&
        balance?.assets &&
        [...balance.assets].some(
          ([id]) => !reachedMaxAmountList.has(id.toString()) && !assetsIdsUsedInOutput.has(id.toString())
        ))
    );
  };

  const handleAssetPicker = (outputId: string, coinId?: string) => {
    setSection({ currentSection: Sections.ASSET_PICKER, prevSection: Sections.FORM });
    setCurrentRow(outputId, coinId);
    setIsBundle(false);
  };

  const fee = uiTx?.fee?.toString() ?? '0';
  const totalCost = getFee(fee.toString(), prices?.cardano?.price, cardanoCoin, fiatCurrency);

  const hasMissingCoins = totalMinimumCoins?.coinMissing && totalMinimumCoins?.coinMissing !== '0';
  const bundleDisabled = spendableCoin
    ? !getNextBundleCoinId(spendableCoin?.toString(), assetBalances, tokensUsed, assets, cardanoCoin)?.length
    : false;

  return (
    <Skeleton loading={isLoading}>
      {ids.map((id, idx) => (
        <RowContainer key={id} id={id} focusRow={row} data-testid="asset-bundle-container" isBundle={isBundle}>
          {ids.length > 1 && (
            <FormRowHeader
              title={t('browserView.transaction.send.advanced.bundleTitle', { index: idx + 1 })}
              onDeleteRow={() => handleRemoveRow(id)}
            />
          )}
          <AddressInput row={id} currentNetwork={currentChain.networkId} isPopupView={isPopupView} />
          <CoinInput
            row={id}
            assets={assets}
            assetBalances={assetBalances}
            coinBalance={coinBalance}
            prices={prices}
            builtTxError={error}
            insufficientBalanceInputs={insufficientBalanceInputs}
            onAddAsset={() => handleAssetPicker(id)}
            openAssetPicker={(coinId) => handleAssetPicker(id, coinId)}
            canAddMoreAssets={canAddMoreAssets(id)}
            tokensUsed={tokensUsed}
            spendableCoin={spendableCoin?.toString()}
            isPopupView={isPopupView}
          />
        </RowContainer>
      ))}

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
            disabled={bundleDisabled || isEmptyAssets}
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
          <h1 className={styles.title}>{t('browserView.transaction.send.transactionCosts')}</h1>
        </div>

        <SendTransactionCost
          label={t('browserView.transaction.send.transactionFee')}
          adaAmount={totalCost.ada}
          fiatAmount={totalCost.fiat}
          tooltipContent={t('send.theAmountYoullBeChargedToProcessYourTransaction')}
          onTooltipHover={() =>
            analytics.sendEvent({
              action: AnalyticsEventActions.HOVER_EVENT,
              category: AnalyticsEventCategories.SEND_TRANSACTION,
              name: AnalyticsEventNames.SendTransaction.SEE_TX_FEE_INFO
            })
          }
        />

        {hasMissingCoins && (
          <SendTransactionCost
            label={t('browserView.transaction.send.adaAllocation')}
            tooltipContent={t('send.toSendAnNFTOrNativeToken')}
            {...formatAdaAllocation({
              missingCoins: totalMinimumCoins?.coinMissing,
              fiat: prices?.cardano?.price,
              cardanoCoin,
              fiatCurrency
            })}
            onTooltipHover={() =>
              analytics.sendEvent({
                action: AnalyticsEventActions.HOVER_EVENT,
                category: AnalyticsEventCategories.SEND_TRANSACTION,
                name: AnalyticsEventNames.SendTransaction.SEE_ADA_ALLOCATION_INFO
              })
            }
          />
        )}
      </div>
    </Skeleton>
  );
};
