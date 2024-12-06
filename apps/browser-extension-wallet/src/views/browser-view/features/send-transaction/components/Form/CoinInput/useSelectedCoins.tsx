/* eslint-disable complexity */
import { Wallet } from '@lace/cardano';
import { AssetInputListProps, AssetInputProps } from '@lace/core';
import {
  useAddressState,
  useBuiltTxState,
  useCoinStateSelector,
  useCurrentCoinIdToChange,
  useCurrentRow,
  useLastFocusedInput,
  useSpentBalances
} from '../../../store';
import { COIN_SELECTION_ERRORS, getErrorMessage } from '@hooks/useInitializeTx';
import { useFetchCoinPrice } from '@hooks/useFetchCoinPrice';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@src/stores';
import { useCurrencyStore } from '@providers/currency';
import { compactNumberWithUnit, handleFormattedValueChange, formatNumberForDisplay } from '@src/utils/format-number';
import { getADACoinProperties, getAssetFiatValue, getAssetProperties } from './util';
import { isValidAddress } from '@src/utils/validators';
import { shortenString } from '@src/utils/format-string';
import { isNFT } from '@src/utils/is-nft';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { useCallback } from 'react';
import { AssetInfo } from '../../../types';
import { MAX_NFT_TICKER_LENGTH, MAX_TOKEN_TICKER_LENGTH } from '../../../constants';
import { useRewardAccountsData } from '@src/views/browser-view/features/staking/hooks';

interface InputFieldActionParams {
  id: string;
  value: string;
  maxDecimals?: number;
}

export interface UseSelectedCoinsProps {
  assetBalances: Wallet.Cardano.Value['assets'];
  assets: Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>;
  bundleId: string;
  /** Coin balance (ADA) in lovelace */
  coinBalance: string;
  insufficientBalanceInputs?: Array<string>;
  insufficientAvailableBalanceInputs?: Array<string>;
  openAssetPicker?: (id: string) => void;
  spendableCoin: bigint;
}

export interface SelectedCoins {
  selectedCoins: AssetInputListProps['rows'];
}

/**
 * Returns a list of props for `AssetInput` items corresponding to the coin/tokens added by the user to a particular bundle
 */
export const useSelectedCoins = ({
  assetBalances,
  assets,
  coinBalance,
  insufficientBalanceInputs,
  insufficientAvailableBalanceInputs,
  openAssetPicker,
  bundleId,
  spendableCoin
}: UseSelectedCoinsProps): SelectedCoins => {
  const { t } = useTranslation();
  const { priceResult: prices } = useFetchCoinPrice();
  const { fiatCurrency } = useCurrencyStore();
  const {
    walletUI: { cardanoCoin, appMode }
  } = useWalletStore();
  const { uiOutputs: assetInputList, removeCoinFromOutputs, setCoinValue } = useCoinStateSelector(bundleId);
  const { address } = useAddressState(bundleId);
  const { builtTxData: { error: builtTxError } = {} } = useBuiltTxState();
  const tokensUsed = useSpentBalances();
  const currentCoinToChange = useCurrentCoinIdToChange();
  const { setLastFocusedInput } = useLastFocusedInput();
  // TODO: change "rows" for "bundleIds" in the send transaction store [LW-7353]
  // Talking about "rows" is confusing, here it is actually referring to bundles.
  // When adding a new asset or modifying an address in a bundle, "currentRow" is set with that bundle id
  // This is used to focus on the last asset after the changes in the bundle
  const [bundleIdOfLastAddedCoin] = useCurrentRow();

  const rewardAcountsData = useRewardAccountsData();

  /**
   * Displays the error with highest priority. Tx level error > Asset level error > Bundle level error
   */
  const getError = useCallback(
    (inputId: string, assetInput: AssetInfo): string | undefined => {
      // If there is an error with the transaction, then display it over any other potential error
      if (builtTxError) return builtTxError;

      // If the asset has an input value but there is no sufficient balance, then display an insufficient balance error.
      if (assetInput?.value && assetInput.value !== '0' && !!insufficientBalanceInputs?.includes(inputId)) {
        return COIN_SELECTION_ERRORS.BALANCE_INSUFFICIENT_ERROR;
      }
      // If the asset has an input value but it is less than the total balance, but more than the available balance, then display an insufficient available balance error.
      if (assetInput?.value && assetInput.value !== '0' && !!insufficientAvailableBalanceInputs?.includes(inputId)) {
        return COIN_SELECTION_ERRORS.AVAILABLE_BALANCE_INSUFFICIENT_ERROR;
      }
      // If there is a valid address but all coins have 0 as value or it's missing, then display a bundle empty error
      if (address && isValidAddress(address) && assetInputList.every((item) => !(item.value && Number(item.value)))) {
        return COIN_SELECTION_ERRORS.BUNDLE_AMOUNT_IS_EMPTY;
      }
      // eslint-disable-next-line consistent-return
      return undefined;
    },
    [address, assetInputList, builtTxError, insufficientBalanceInputs, insufficientAvailableBalanceInputs]
  );

  const handleOnChangeCoin = useCallback(
    (params: Parameters<AssetInputProps['onChange']>[0]) => {
      const { prevValue = '', element: inputElement, value: currentValue, maxDecimals } = params;
      const coinValue = !currentValue ? '' : inputElement?.value;

      const { formattedValue, characterOffset } = handleFormattedValueChange(
        {
          previousFormattedValue: formatNumberForDisplay(prevValue, maxDecimals),
          newFormattedValue: inputElement ? coinValue : currentValue
        },
        maxDecimals
      );
      // This has to go before calling setCoinValue, otherwise element.selectionEnd will be changed by it
      const newCursorPosition = Math.max(0, (inputElement?.selectionEnd ?? 0) + (characterOffset ?? 0));
      setCoinValue(bundleId, { ...params, displayValue: formattedValue });
      setTimeout(() => {
        // Needs a timeout to make sure this is called after setCoinValue
        inputElement?.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);
    },
    [bundleId, setCoinValue]
  );

  const handleOnBlurCoin = useCallback(
    (params: InputFieldActionParams) => {
      const { value, maxDecimals } = params;
      setCoinValue(bundleId, {
        ...params,
        compactValue: compactNumberWithUnit(value),
        displayValue: formatNumberForDisplay(value, maxDecimals)
      });
    },
    [bundleId, setCoinValue]
  );

  const handleOnFocusCoin = useCallback(
    (params: InputFieldActionParams) => {
      const { value, maxDecimals } = params;
      setCoinValue(bundleId, { ...params, displayValue: value && formatNumberForDisplay(value, maxDecimals) });
    },
    [bundleId, setCoinValue]
  );

  const selectedCoins = assetInputList.map((assetInputItem) => {
    // Adds a unique id for each input element, this is a concatenation of the bundle/output id and the coin id separated by a dot
    const inputId = `${bundleId}.${assetInputItem.id}`;
    const error = getError(inputId, assetInputItem);

    // Props common to native assets and cardano coin
    const commonCoinProps = {
      inputId,
      setFocusInput: setLastFocusedInput,
      onChange: handleOnChangeCoin,
      onBlur: handleOnBlurCoin,
      onFocus: handleOnFocusCoin,
      displayValue: assetInputItem.displayValue,
      compactValue: assetInputItem.compactValue || compactNumberWithUnit(assetInputItem.value),
      value: assetInputItem.value,
      hasMaxBtn: true,
      displayMaxBtn:
        assetInputItem.id === cardanoCoin.id &&
        error === COIN_SELECTION_ERRORS.FULLY_DEPLETED_ERROR &&
        spendableCoin > 0,
      invalid: !!error,
      error,
      onBlurErrors: new Set([COIN_SELECTION_ERRORS.BUNDLE_AMOUNT_IS_EMPTY]),
      getErrorMessage: getErrorMessage(t),
      focused: bundleIdOfLastAddedCoin === bundleId && currentCoinToChange === assetInputItem.id,
      onDelete: () => removeCoinFromOutputs(bundleId, { id: assetInputItem.id }),
      onNameClick: () => openAssetPicker(assetInputItem.id)
    } as Partial<AssetInputListProps['rows'][number]>;

    // Asset is cardano coin
    if (assetInputItem.id === cardanoCoin.id) {
      const {
        totalADA,
        availableADA,
        lockedStakeRewards,
        hasReachedMaxAmount,
        hasReachedMaxAvailableAmount,
        ...adaCoinProps
      } = getADACoinProperties(
        coinBalance,
        spendableCoin?.toString(),
        tokensUsed[cardanoCoin.id] || '0',
        assetInputItem?.value || '0',
        rewardAcountsData.lockedStakeRewards.toString() || '0'
      );
      const fiatValue = Wallet.util.convertAdaToFiat({
        ada: assetInputItem?.value || '0',
        fiat: prices?.cardano?.price
      });
      return {
        ...commonCoinProps,
        ...adaCoinProps,
        hasReachedMaxAmount: hasReachedMaxAmount && error !== COIN_SELECTION_ERRORS.FULLY_DEPLETED_ERROR,
        hasReachedMaxAvailableAmount:
          hasReachedMaxAvailableAmount && error !== COIN_SELECTION_ERRORS.FULLY_DEPLETED_ERROR,
        coin: {
          id: cardanoCoin.id,
          ticker: cardanoCoin.symbol,
          balance: t('send.balanceAmount', { amount: compactNumberWithUnit(totalADA) }),
          ...(rewardAcountsData.lockedStakeRewards && {
            availableBalance: t('send.availableBalanceAmount', {
              amount: compactNumberWithUnit(availableADA)
            }),
            lockedStakeRewards: t('send.lockedStakeRewardsAmount', {
              amount: compactNumberWithUnit(lockedStakeRewards.toString())
            })
          })
        },
        formattedFiatValue: `= ${compactNumberWithUnit(fiatValue)} ${fiatCurrency?.code}`,
        fiatValue: `= ${fiatValue} ${fiatCurrency?.code}`,
        maxDecimals: cardanoCoin.decimals
      } as AssetInputListProps['rows'][number];
    }

    // Asset is a native asset
    const assetInfo = assets?.get(Wallet.Cardano.AssetId(assetInputItem.id));

    const { ticker, totalAssetBalance, maxSpendableAmount, allowFloat, hasReachedMaxAmount, maxDecimals } =
      getAssetProperties(assetInputItem, assetInfo, assetBalances, tokensUsed);

    return {
      ...commonCoinProps,
      allowFloat,
      hasReachedMaxAmount,
      maxDecimals,
      coin: {
        id: assetInputItem.id,
        ticker,
        balance: t('send.balanceAmount', {
          amount: compactNumberWithUnit(totalAssetBalance)
        }),
        ...(appMode === APP_MODE_POPUP && {
          shortTicker: shortenString(ticker, isNFT(assetInfo) ? MAX_NFT_TICKER_LENGTH : MAX_TOKEN_TICKER_LENGTH)
        })
      },
      fiatValue: getAssetFiatValue(assetInputItem, assetInfo, prices, fiatCurrency),
      max: maxSpendableAmount
    } as AssetInputListProps['rows'][number];
  });

  return { selectedCoins };
};
