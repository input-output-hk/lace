/* eslint-disable complexity */
/* eslint-disable unicorn/no-nested-ternary */
import { AssetInputList, AssetInputListProps, AssetInputProps } from '@lace/core';
import {
  useCoinStateSelector,
  useCurrentRow,
  useCurrentCoinIdToChange,
  useAddressState,
  useLastFocusedInput
} from '../../store';
import { Wallet } from '@lace/cardano';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AssetInfo, SpentBalances } from '../../types';
import BigNumber from 'bignumber.js';
import { COIN_SELECTION_ERRORS, getErrorMessage as getErrorMessageFactory, PriceResult } from '@hooks';
import { useWalletStore } from '@src/stores';
import { CoinId } from '@src/types';
import {
  compactNumber,
  getInlineCurrencyFormat,
  getCaretPositionForFormattedCurrency,
  getChangedValue
} from '@utils/format-number';
import { isValidAddress } from '@src/utils/validators';
import { getTokenAmountInFiat, parseFiat } from '@src/utils/assets-transformers';
import { useCurrencyStore } from '@providers';
import { isNFT } from '@src/utils/is-nft';

const TEMP_OUTPUTS = 'tempOutputs';
const MAX_NFT_TICKER_LENGTH = 10;
const MAX_TOKEN_TICKER_LENGTH = 5;

const getMaxSpendableAmount = (balance = '0', usedCoins = '0', itemValue = '0') => {
  const maxSpendableAmount = new BigNumber(balance).minus(usedCoins).plus(itemValue);
  return maxSpendableAmount.lte(0) || maxSpendableAmount.isNaN() ? '0' : maxSpendableAmount.toString();
};

const formatADACoinInfo = (balance: string, cardanoCoin: CoinId) => ({
  id: cardanoCoin.id,
  ticker: cardanoCoin.symbol,
  balance
});

const getADARowProperties = (balance: string, spentCoins: string, spendableCoin: string, rowIconAmount: string) => {
  const availableADA = Wallet.util.lovelacesToAdaString(balance);
  const spendableCoinInAda = Wallet.util.lovelacesToAdaString(spendableCoin);
  const max = getMaxSpendableAmount(spendableCoinInAda, spentCoins, rowIconAmount);
  const hasMaxBtn = Number(availableADA) > 0;
  const hasReachedMaxAmount = new BigNumber(spentCoins).gte(spendableCoinInAda);

  return {
    availableADA,
    max,
    allowFloat: true,
    hasMaxBtn,
    hasReachedMaxAmount
  };
};

const shortenString = (str: string, length: number) =>
  str?.length > length && `${str.slice(0, Math.max(0, length))}...`;

interface CoinInputProps {
  row: string;
  assets: Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>;
  coinBalance: string;
  assetBalances: Wallet.Cardano.Value['assets'];
  prices: PriceResult;
  builtTxError?: string;
  canAddMoreAssets?: boolean;
  tokensUsed: SpentBalances;
  spendableCoin: string;
  onAddAsset?: () => void;
  openAssetPicker?: (id: string) => void;
  insufficientBalanceInputs?: Array<string>;
  isPopupView?: boolean;
}

interface InputFieldActionParams {
  id: string;
  value: string;
  maxDecimals?: number;
}

const getTempUiOutputs = (): AssetInfo[] | null => {
  const uiOutputsString = localStorage.getItem(TEMP_OUTPUTS);
  return uiOutputsString?.length > 0 && JSON.parse(uiOutputsString);
};

export const CoinInput = ({
  row,
  assets,
  coinBalance,
  assetBalances,
  prices,
  builtTxError,
  onAddAsset,
  openAssetPicker,
  canAddMoreAssets,
  tokensUsed,
  spendableCoin,
  insufficientBalanceInputs,
  isPopupView
}: CoinInputProps): React.ReactElement => {
  const { t } = useTranslation();
  const getErrorMessage = getErrorMessageFactory(t);
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const { uiOutputs: list, removeCoinFromOutputs, setCoinValue, setCoinValues } = useCoinStateSelector(row);
  const { address } = useAddressState(row);
  const [currentRow] = useCurrentRow();
  const currentCoinToChange = useCurrentCoinIdToChange();
  const onBlurErrors = new Set([COIN_SELECTION_ERRORS.BUNDLE_AMOUNT_IS_EMPTY]);
  const isEmptyAssets = !!assetBalances && assetBalances?.size === 0;
  const { setLastFocusedInput } = useLastFocusedInput();
  const { fiatCurrency } = useCurrencyStore();

  const removeAsset = (id: string) => removeCoinFromOutputs(row, { id });

  const changeCoinValue = (params: Parameters<AssetInputProps['onChange']>[0]) => {
    const { prevValue = '', element, value: currentValue, maxDecimals } = params;

    const elementValue = !currentValue ? '' : element?.value;

    const { currentDisplayValue, value, currentCursorPosition } = getChangedValue({
      displayValue: getInlineCurrencyFormat(prevValue, maxDecimals),
      currentDisplayValue: element ? elementValue : currentValue,
      currentCursorPosition: element && element.selectionEnd
    });

    const displayValue = getInlineCurrencyFormat(value, maxDecimals);

    const startPosition = getCaretPositionForFormattedCurrency({
      currentDisplayValue,
      displayValue,
      currentCursorPosition
    });

    const params2 = { ...params, displayValue };
    setCoinValue(row, params2);

    setTimeout(() => {
      element && element.setSelectionRange(startPosition, startPosition);
    }, 0);
  };

  const handleOnBlur = (params: InputFieldActionParams) => {
    const { value, maxDecimals } = params;
    const compactValue = compactNumber(value);
    const displayValue = getInlineCurrencyFormat(value, maxDecimals);
    const params2 = { ...params, compactValue, displayValue };
    setCoinValue(row, params2);
  };

  const handleOnFocus = (params: InputFieldActionParams) => {
    const { value, maxDecimals } = params;
    const displayValue = value && getInlineCurrencyFormat(value, maxDecimals);
    const params2 = { ...params, displayValue };
    setCoinValue(row, params2);
  };

  const bundleValuesAreEmpty =
    address && isValidAddress(address) && list.every((item) => !(item.value && Number(item.value)));

  // eslint-disable-next-line sonarjs/cognitive-complexity,max-statements
  const selectedCoins: AssetInputListProps['rows'] = list.map((item) => {
    const inputId = `${row}.${item.id}`; // add a unique id for each input element, this is a concatenation of the bundle/output id and the coin id (cardano id or asset id) separated by a dot
    const isCardano = item.id === cardanoCoin.id;
    const shouldCheckForError = item?.value && item?.value !== '0';
    const emptyBundleAmountError = bundleValuesAreEmpty ? COIN_SELECTION_ERRORS.BUNDLE_AMOUNT_IS_EMPTY : undefined;
    const hasInsufficientBalance = insufficientBalanceInputs.includes(inputId); // check if the current input element has in insufficient balance
    const fieldLevelError =
      hasInsufficientBalance && shouldCheckForError
        ? COIN_SELECTION_ERRORS.BALANCE_INSUFFICIENT_ERROR
        : emptyBundleAmountError;
    const error = builtTxError || fieldLevelError;
    const invalid = !!error;

    const commonCoinProps = {
      inputId,
      setFocusInput: setLastFocusedInput,
      onChange: changeCoinValue,
      onBlur: handleOnBlur,
      onFocus: handleOnFocus,
      displayValue: item.displayValue,
      compactValue: item.compactValue || compactNumber(item.value),
      invalid,
      value: item.value,
      error,
      hasMaxBtn: true,
      onBlurErrors,
      getErrorMessage
    };

    if (isCardano) {
      const { availableADA, ...adaRowProps } = getADARowProperties(
        coinBalance,
        tokensUsed[cardanoCoin.id] || '0',
        spendableCoin,
        item?.value || '0'
      );
      const coin = formatADACoinInfo(t('send.balanceAmount', { amount: compactNumber(availableADA) }), cardanoCoin);
      const fiatValue = Wallet.util.convertAdaToFiat({ ada: item?.value || '0', fiat: prices?.cardano?.price });
      return {
        coin,
        focused: currentRow === row && currentCoinToChange === coin.id,
        ...commonCoinProps,
        ...adaRowProps,
        formattedFiatValue: `= ${compactNumber(fiatValue)} ${fiatCurrency?.code}`,
        fiatValue: `= ${fiatValue} ${fiatCurrency?.code}`,
        onDelete: () => removeAsset(cardanoCoin.id),
        onNameClick: () => openAssetPicker(cardanoCoin.id),
        maxDecimals: cardanoCoin.decimals,
        hasMaxBtn: true
      };
    }

    const assetInfo = assets?.get(Wallet.Cardano.AssetId(item.id));

    const decimals = assetInfo?.tokenMetadata?.decimals;
    const tokenMaxDecimal = decimals > 0 ? decimals : 0;

    const id = assetInfo?.assetId.toString();
    const ticker =
      assetInfo?.nftMetadata?.name ??
      assetInfo?.tokenMetadata?.ticker ??
      assetInfo?.tokenMetadata?.name ??
      assetInfo?.fingerprint.toString();

    const bigintBalance = assetBalances?.get(Wallet.Cardano.AssetId(item.id)) || BigInt(0);

    // convert tokens to bigint so we can ignore the decimal places for calculation
    const bigintUsedTokens = Wallet.util.assetBalanceToBigInt(tokensUsed[id] || '0', assetInfo);
    const bigintItemValue = Wallet.util.assetBalanceToBigInt(item?.value || '0', assetInfo);

    const maxSpendableAmount = getMaxSpendableAmount(
      bigintBalance.toString(),
      bigintUsedTokens.toString(),
      bigintItemValue.toString()
    );
    const max = Wallet.util.calculateAssetBalance(BigInt(maxSpendableAmount), assetInfo);
    const assetBalance = Wallet.util.calculateAssetBalance(bigintBalance, assetInfo);
    const tokenPriceInAda = prices?.tokens?.get(Wallet.Cardano.AssetId(item.id))?.priceInAda;
    const tokenFiatPrice =
      assetInfo?.tokenMetadata !== undefined && tokenPriceInAda && prices?.cardano?.price
        ? `= ${
            item?.value
              ? parseFiat(Number(getTokenAmountInFiat(item?.value, tokenPriceInAda, prices?.cardano?.price)))
              : '0'
          } ${fiatCurrency?.code}`
        : '-';

    return {
      ...commonCoinProps,
      coin: {
        id,
        ticker,
        balance: t('send.balanceAmount', {
          amount: compactNumber(assetBalance)
        }),
        ...(isPopupView === true && {
          shortTicker: shortenString(ticker, isNFT(assetInfo) ? MAX_NFT_TICKER_LENGTH : MAX_TOKEN_TICKER_LENGTH)
        })
      },
      focused: currentRow === row && currentCoinToChange === id,
      fiatValue: tokenFiatPrice,
      allowFloat: decimals > 0,
      onDelete: () => removeAsset(id),
      onNameClick: () => openAssetPicker(id),
      max,
      maxDecimals: tokenMaxDecimal,
      hasReachedMaxAmount: Wallet.util.assetBalanceToBigInt(tokensUsed[id] || '0', assetInfo) >= bigintBalance
    };
  });

  useEffect(() => {
    const uiOutputs = getTempUiOutputs();
    if (!uiOutputs) return;
    setCoinValues(row, uiOutputs);
  }, [row, setCoinValues]);

  return (
    <AssetInputList
      disabled={isEmptyAssets || !canAddMoreAssets}
      rows={selectedCoins}
      onAddAsset={onAddAsset}
      translations={{ addAsset: t('browserView.transaction.send.advanced.asset') }}
    />
  );
};
