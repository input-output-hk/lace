/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
const mockCoinStateSelector = {
  uiOutputs: [],
  setCoinValue: jest.fn(),
  removeCoinFromOutputs: jest.fn()
} as unknown as SendTransactionStore.UseCoinStateSelector;

const mockUseFetchCoinPrice = jest.fn().mockReturnValue({ priceResult: { cardano: { price: 2 }, tokens: new Map() } });
const mockUseCurrencyStore = jest.fn().mockReturnValue({ fiatCurrency: { code: 'usd', symbol: '$' } });
const mockUseWalletStore = jest.fn().mockReturnValue({
  walletUI: { cardanoCoin: { id: '1', name: 'Cardano', decimals: 6, symbol: 'ADA' }, appMode: 'popup' }
});
const mockUseRewardAccountsData = jest.fn().mockReturnValue({ lockedStakeRewards: 0 });
const mockUseCoinStateSelector = jest.fn().mockReturnValue(mockCoinStateSelector);
const mockUseBuiltTxState = jest.fn().mockReturnValue({ builtTxData: { error: undefined } });
const mockUseAddressState = jest.fn().mockReturnValue({ address: undefined });
const mockUseCurrentCoinIdToChange = jest.fn().mockReturnValue('1');
const mockUseCurrentRow = jest.fn().mockReturnValue(['bundleId']);
const mockUseSpentBalances = jest.fn().mockReturnValue({});

/* eslint-disable import/imports-first */
import { renderHook } from '@testing-library/react-hooks';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '@lace/translation';
import { UseSelectedCoinsProps, useSelectedCoins } from '../useSelectedCoins';
import { COIN_SELECTION_ERRORS } from '@hooks/useInitializeTx';
import { mockAsset } from '@src/utils/mocks/test-helpers';
import * as UseFetchCoinPrice from '@hooks/useFetchCoinPrice';
import * as CurrencyProvider from '@providers/currency';
import * as Stores from '@stores';
import * as SendTransactionStore from '../../../../store';

jest.mock('@hooks/useFetchCoinPrice', (): typeof UseFetchCoinPrice => ({
  ...jest.requireActual<typeof UseFetchCoinPrice>('@hooks/useFetchCoinPrice'),
  useFetchCoinPrice: mockUseFetchCoinPrice
}));
jest.mock('@providers/currency', (): typeof CurrencyProvider => ({
  ...jest.requireActual<typeof CurrencyProvider>('@providers/currency'),
  useCurrencyStore: mockUseCurrencyStore
}));
jest.mock('@stores', (): typeof Stores => ({
  ...jest.requireActual<typeof Stores>('@stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@src/views/browser-view/features/staking/hooks', () => ({
  ...jest.requireActual<any>('@src/views/browser-view/features/staking/hooks'),
  useRewardAccountsData: mockUseRewardAccountsData
}));

jest.mock('../../../../store', (): typeof SendTransactionStore => ({
  ...jest.requireActual<typeof SendTransactionStore>('../../../../store'),
  useCoinStateSelector: mockUseCoinStateSelector,
  useBuiltTxState: mockUseBuiltTxState,
  useAddressState: mockUseAddressState,
  useCurrentCoinIdToChange: mockUseCurrentCoinIdToChange,
  useCurrentRow: mockUseCurrentRow,
  useSpentBalances: mockUseSpentBalances
}));

const renderUseSelectedCoins = (props: UseSelectedCoinsProps) =>
  renderHook(() => useSelectedCoins(props), {
    wrapper: I18nextProvider,
    initialProps: { i18n }
  });

describe('useSelectedCoin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Common properties', () => {
    describe('returns cardano coin and native asset as selected coins', () => {
      mockUseCoinStateSelector.mockReturnValue({
        ...mockCoinStateSelector,
        uiOutputs: [
          { id: '1', value: '1000000000', displayValue: '1B' },
          { id: mockAsset.assetId.toString(), value: '1000', compactValue: '1.00K' }
        ]
      });
      const props: UseSelectedCoinsProps = {
        assetBalances: new Map([[mockAsset.assetId, BigInt(100)]]),
        assets: new Map([[mockAsset.assetId, mockAsset]]),
        bundleId: 'bundleId',
        coinBalance: '1000000000',
        spendableCoin: BigInt(100),
        openAssetPicker: jest.fn()
      };
      const { result, waitFor, rerender } = renderUseSelectedCoins(props);
      test('has inputId as concatenation of bundle id + coin id', () => {
        expect(result.current.selectedCoins).toHaveLength(2);
        expect(result.current.selectedCoins[0].inputId).toEqual(`${props.bundleId}.1`);
        expect(result.current.selectedCoins[1].inputId).toEqual(`${props.bundleId}.${mockAsset.assetId.toString()}`);
      });
      test('has value, compactValue and, if defined, displayValue', () => {
        expect(result.current.selectedCoins[0].displayValue).toEqual('1B');
        expect(result.current.selectedCoins[0].compactValue).toEqual('1.00B');
        expect(result.current.selectedCoins[0].value).toEqual('1000000000');
        expect(result.current.selectedCoins[1].displayValue).toBeUndefined();
        expect(result.current.selectedCoins[1].compactValue).toEqual('1.00K');
        expect(result.current.selectedCoins[1].value).toEqual('1000');
      });
      test('have no errors if valid', () => {
        result.current.selectedCoins.forEach((selectedCoin) => {
          expect(selectedCoin.invalid).toEqual(false);
          expect(selectedCoin.error).toBeUndefined();
        });
      });
      test(
        'is focused when bundle of last added coin is the current bundle ' +
          'and the current coin to change is the current coin',
        () => {
          expect(result.current.selectedCoins[0].focused).toEqual(true);

          mockUseCurrentRow.mockReturnValueOnce(['bundle2']);
          rerender();
          expect(result.current.selectedCoins[0].focused).toEqual(false);

          mockUseCurrentCoinIdToChange.mockReturnValueOnce('2');
          rerender();
          expect(result.current.selectedCoins[0].focused).toEqual(false);
        }
      );
      describe('display coin value in UI functions', () => {
        test('all functions to interact with the UI are defined', () => {
          result.current.selectedCoins.forEach((selectedCoin) => {
            expect(typeof selectedCoin.setFocusInput).toEqual('function');
            expect(typeof selectedCoin.onChange).toEqual('function');
            expect(typeof selectedCoin.onBlur).toEqual('function');
            expect(typeof selectedCoin.onFocus).toEqual('function');
            expect(typeof selectedCoin.onDelete).toEqual('function');
            expect(typeof selectedCoin.onNameClick).toEqual('function');
            expect(typeof selectedCoin.getErrorMessage).toEqual('function');
            expect(selectedCoin.onBlurErrors.size).toBeGreaterThan(0);
          });
        });
        test('onChange function formats display value, removes compact value, and re-positions cursor', async () => {
          const params = {
            id: '1',
            value: '100',
            maxDecimals: 5,
            prevValue: '',
            element: { setSelectionRange: jest.fn(), value: '10000.123456789', selectionEnd: 15 }
          };
          result.current.selectedCoins[0].onChange(params);
          expect(mockCoinStateSelector.setCoinValue).toHaveBeenCalledWith('bundleId', {
            ...params,
            displayValue: '10,000.12345'
          });
          await waitFor(() => {
            expect(params.element.setSelectionRange).toHaveBeenCalledWith(12, 12);
          });
        });
        test('onBlur function formats compact and display values', () => {
          const params = { id: '1', value: '1000000.123456789', maxDecimals: 5 };
          result.current.selectedCoins[0].onBlur(params);
          expect(mockCoinStateSelector.setCoinValue).toHaveBeenCalledWith('bundleId', {
            ...params,
            compactValue: '1.00M',
            displayValue: '1,000,000.12345'
          });
        });
        test('onFocus function formats display value and removes compact value', () => {
          const params = { id: '1', value: '1000000.123456789', maxDecimals: 5 };
          result.current.selectedCoins[0].onFocus(params);
          expect(mockCoinStateSelector.setCoinValue).toHaveBeenCalledWith('bundleId', {
            ...params,
            displayValue: '1,000,000.12345'
          });
        });
        test('onDelete functions calls removeCoinFromOutputs from send transaction store', () => {
          result.current.selectedCoins[0].onDelete();
          expect(mockCoinStateSelector.removeCoinFromOutputs).toHaveBeenCalledWith('bundleId', { id: '1' });
        });
        test('onNameClick functions calls openAssetPicker from hook props', () => {
          result.current.selectedCoins[0].onNameClick({} as React.MouseEvent<HTMLDivElement, MouseEvent>);
          expect(props.openAssetPicker).toHaveBeenCalledWith('1');
        });
      });
    });
  });

  describe('Cardano coin properties', () => {
    test('gets coin properties from walletUI cardanoCoin in store and compacts coin balance', () => {
      mockUseCoinStateSelector.mockReturnValueOnce({
        ...mockCoinStateSelector,
        uiOutputs: [{ id: '1', value: '100' }]
      });
      const props: UseSelectedCoinsProps = {
        assetBalances: new Map(),
        assets: new Map(),
        bundleId: 'bundleId',
        coinBalance: '1000000000000',
        spendableCoin: BigInt(100)
      };
      const { result } = renderUseSelectedCoins(props);

      expect(result.current.selectedCoins).toHaveLength(1);
      expect(result.current.selectedCoins[0].coin).toEqual({ id: '1', ticker: 'ADA', balance: 'Balance: 1.00M' });
    });
    test('gets coin properties from walletUI cardanoCoin in store with compacts coin balance and locked rewards', () => {
      mockUseRewardAccountsData.mockReturnValueOnce({
        lockedStakeRewards: '10000000000'
      });

      mockUseCoinStateSelector.mockReturnValueOnce({
        ...mockCoinStateSelector,
        uiOutputs: [{ id: '1', value: '100' }]
      });
      const props: UseSelectedCoinsProps = {
        assetBalances: new Map(),
        assets: new Map(),
        bundleId: 'bundleId',
        coinBalance: '1010000000000',
        spendableCoin: BigInt(100)
      };
      const { result } = renderUseSelectedCoins(props);

      expect(result.current.selectedCoins).toHaveLength(1);
      expect(result.current.selectedCoins[0].coin).toEqual({
        id: '1',
        ticker: 'ADA',
        balance: 'Balance: 1.01M',
        availableBalance: 'Available Balance: 1.00M',
        lockedStakeRewards: 'Locked Stake Rewards: 10,000.00'
      });
    });

    test('converts coin value to fiat and set decimals from walletUI cardanoCoin', () => {
      mockUseCoinStateSelector.mockReturnValueOnce({
        ...mockCoinStateSelector,
        uiOutputs: [{ id: '1', value: '1000000' }]
      });
      const props: UseSelectedCoinsProps = {
        assetBalances: new Map(),
        assets: new Map(),
        bundleId: 'bundleId',
        coinBalance: '1000000000000',
        spendableCoin: BigInt(100)
      };
      const { result } = renderUseSelectedCoins(props);

      expect(result.current.selectedCoins).toHaveLength(1);
      expect(result.current.selectedCoins[0].fiatValue).toEqual('≈ 2000000.00 usd');
      expect(result.current.selectedCoins[0].formattedFiatValue).toEqual('≈ 2.00M usd');
      expect(result.current.selectedCoins[0].maxDecimals).toEqual(6);
      expect(result.current.selectedCoins[0].allowFloat).toEqual(true);
    });

    describe('returns calculated max spendable amount in ADA', () => {
      test('with no coin spent', () => {
        mockUseCoinStateSelector.mockReturnValueOnce({
          ...mockCoinStateSelector,
          uiOutputs: [{ id: '1', value: '0' }]
        });
        mockUseSpentBalances.mockReturnValueOnce({});
        const props: UseSelectedCoinsProps = {
          assetBalances: new Map(),
          assets: new Map(),
          bundleId: 'bundleId',
          coinBalance: '12000000',
          spendableCoin: BigInt(10_000_000)
        };
        const { result } = renderUseSelectedCoins(props);

        expect(result.current.selectedCoins).toHaveLength(1);
        expect(result.current.selectedCoins[0].max).toEqual('10');
        expect(result.current.selectedCoins[0].hasReachedMaxAmount).toEqual(false);
        expect(result.current.selectedCoins[0].hasMaxBtn).toEqual(true);
      });

      test('with some coin spent', () => {
        mockUseCoinStateSelector.mockReturnValueOnce({
          ...mockCoinStateSelector,
          uiOutputs: [{ id: '1', value: '2' }]
        });
        mockUseSpentBalances.mockReturnValueOnce({ '1': '5' });
        const props: UseSelectedCoinsProps = {
          assetBalances: new Map(),
          assets: new Map(),
          bundleId: 'bundleId',
          coinBalance: '12000000',
          spendableCoin: BigInt(10_000_000)
        };
        const { result } = renderUseSelectedCoins(props);

        expect(result.current.selectedCoins).toHaveLength(1);
        expect(result.current.selectedCoins[0].max).toEqual('7');
        expect(result.current.selectedCoins[0].hasReachedMaxAmount).toEqual(false);
        expect(result.current.selectedCoins[0].hasMaxBtn).toEqual(true);
      });

      test('when max amount reached', () => {
        mockUseCoinStateSelector.mockReturnValueOnce({
          ...mockCoinStateSelector,
          uiOutputs: [{ id: '1', value: '3' }]
        });
        mockUseSpentBalances.mockReturnValueOnce({ '1': '13' });
        const props: UseSelectedCoinsProps = {
          assetBalances: new Map(),
          assets: new Map(),
          bundleId: 'bundleId',
          coinBalance: '12000000',
          spendableCoin: BigInt(10_000_000)
        };
        const { result } = renderUseSelectedCoins(props);

        expect(result.current.selectedCoins).toHaveLength(1);
        expect(result.current.selectedCoins[0].max).toEqual('0');
        expect(result.current.selectedCoins[0].hasReachedMaxAmount).toEqual(true);
        expect(result.current.selectedCoins[0].hasMaxBtn).toEqual(true);
      });
    });
  });

  describe('Native asset properties', () => {
    test('gets coin properties from asset info in wallet and compacts coin balance', () => {
      mockUseCoinStateSelector.mockReturnValueOnce({
        ...mockCoinStateSelector,
        uiOutputs: [{ id: mockAsset.assetId.toString(), value: '0' }]
      });

      const props: UseSelectedCoinsProps = {
        assetBalances: new Map([[mockAsset.assetId, BigInt(10)]]),
        assets: new Map([
          [mockAsset.assetId, { ...mockAsset, tokenMetadata: { ...mockAsset.tokenMetadata, ticker: 'TestTicker' } }]
        ]),
        bundleId: 'bundleId',
        coinBalance: '0',
        spendableCoin: BigInt(100)
      };
      const { result } = renderUseSelectedCoins(props);

      expect(result.current.selectedCoins).toHaveLength(1);
      expect(result.current.selectedCoins[0].coin).toEqual({
        id: mockAsset.assetId.toString(),
        ticker: 'TestTicker',
        balance: 'Balance: 10.00',
        shortTicker: 'TestT...'
      });
    });

    test('converts asset input value to fiat and set decimals according to metadata', () => {
      mockUseCoinStateSelector.mockReturnValueOnce({
        ...mockCoinStateSelector,
        uiOutputs: [{ id: mockAsset.assetId.toString(), value: '3' }]
      });
      mockUseFetchCoinPrice.mockReturnValueOnce({
        priceResult: {
          cardano: { price: '2' },
          tokens: new Map([[mockAsset.assetId, { priceInAda: 1_000_000 }]])
        } as unknown as UseFetchCoinPrice.PriceResult
      });

      const props: UseSelectedCoinsProps = {
        assetBalances: new Map([[mockAsset.assetId, BigInt(10)]]),
        assets: new Map([
          [mockAsset.assetId, { ...mockAsset, tokenMetadata: { ...mockAsset.tokenMetadata, decimals: 4 } }]
        ]),
        bundleId: 'bundleId',
        coinBalance: '0',
        spendableCoin: BigInt(100)
      };
      const { result } = renderUseSelectedCoins(props);

      expect(result.current.selectedCoins).toHaveLength(1);
      expect(result.current.selectedCoins[0].fiatValue).toEqual('= 6000000.000 usd');
      expect(result.current.selectedCoins[0].maxDecimals).toEqual(4);
      expect(result.current.selectedCoins[0].allowFloat).toEqual(true);
    });

    describe('returns calculated max spendable amount', () => {
      test('with no amount spent', () => {
        mockUseCoinStateSelector.mockReturnValueOnce({
          ...mockCoinStateSelector,
          uiOutputs: [{ id: mockAsset.assetId.toString(), value: '0' }]
        });
        mockUseSpentBalances.mockReturnValueOnce({});
        const props: UseSelectedCoinsProps = {
          assetBalances: new Map([[mockAsset.assetId, BigInt(10)]]),
          assets: new Map([[mockAsset.assetId, mockAsset]]),
          bundleId: 'bundleId',
          coinBalance: '0',
          spendableCoin: BigInt(100)
        };
        const { result } = renderUseSelectedCoins(props);

        expect(result.current.selectedCoins).toHaveLength(1);
        expect(result.current.selectedCoins[0].max).toEqual('10');
        expect(result.current.selectedCoins[0].hasReachedMaxAmount).toEqual(false);
        expect(result.current.selectedCoins[0].hasMaxBtn).toEqual(true);
      });

      test('with some amount spent', () => {
        mockUseCoinStateSelector.mockReturnValueOnce({
          ...mockCoinStateSelector,
          uiOutputs: [{ id: mockAsset.assetId.toString(), value: '2' }]
        });
        mockUseSpentBalances.mockReturnValueOnce({ [mockAsset.assetId.toString()]: '5' });
        const props: UseSelectedCoinsProps = {
          assetBalances: new Map([[mockAsset.assetId, BigInt(10)]]),
          assets: new Map([[mockAsset.assetId, mockAsset]]),
          bundleId: 'bundleId',
          coinBalance: '0',
          spendableCoin: BigInt(100)
        };
        const { result } = renderUseSelectedCoins(props);

        expect(result.current.selectedCoins).toHaveLength(1);
        expect(result.current.selectedCoins[0].max).toEqual('7');
        expect(result.current.selectedCoins[0].hasReachedMaxAmount).toEqual(false);
        expect(result.current.selectedCoins[0].hasMaxBtn).toEqual(true);
      });

      test('when max amount reached', () => {
        mockUseCoinStateSelector.mockReturnValueOnce({
          ...mockCoinStateSelector,
          uiOutputs: [{ id: mockAsset.assetId.toString(), value: '3' }]
        });
        mockUseSpentBalances.mockReturnValueOnce({ [mockAsset.assetId.toString()]: '13' });
        const props: UseSelectedCoinsProps = {
          assetBalances: new Map([[mockAsset.assetId, BigInt(10)]]),
          assets: new Map([[mockAsset.assetId, mockAsset]]),
          bundleId: 'bundleId',
          coinBalance: '0',
          spendableCoin: BigInt(100)
        };
        const { result } = renderUseSelectedCoins(props);

        expect(result.current.selectedCoins).toHaveLength(1);
        expect(result.current.selectedCoins[0].max).toEqual('0');
        expect(result.current.selectedCoins[0].hasReachedMaxAmount).toEqual(true);
        expect(result.current.selectedCoins[0].hasMaxBtn).toEqual(true);
      });
    });
  });

  describe('Coin Errors', () => {
    test('coin has error if there is a transaction building error', () => {
      mockUseBuiltTxState.mockReturnValueOnce({ builtTxData: { error: 'Some tx building error' } });
      mockUseCoinStateSelector.mockReturnValueOnce({
        ...mockCoinStateSelector,
        uiOutputs: [{ id: '1', value: '1000000000' }]
      });
      const props: UseSelectedCoinsProps = {
        assetBalances: new Map(),
        assets: new Map(),
        bundleId: 'bundleId',
        coinBalance: '1000000000',
        spendableCoin: BigInt(100)
      };
      const { result } = renderUseSelectedCoins(props);
      expect(result.current.selectedCoins[0].invalid).toEqual(true);
      expect(result.current.selectedCoins[0].error).toEqual('Some tx building error');
    });
    test('coin has error if it has insufficient balance', () => {
      mockUseCoinStateSelector.mockReturnValueOnce({
        ...mockCoinStateSelector,
        uiOutputs: [
          { id: '1', value: '1000000000' },
          { id: mockAsset.assetId.toString(), value: '0' }
        ]
      });
      const props: UseSelectedCoinsProps = {
        assetBalances: new Map(),
        assets: new Map(),
        bundleId: 'bundleId',
        coinBalance: '1000000000',
        insufficientBalanceInputs: ['bundleId.1'],
        spendableCoin: BigInt(100)
      };
      const { result } = renderUseSelectedCoins(props);
      expect(result.current.selectedCoins[0].invalid).toEqual(true);
      expect(result.current.selectedCoins[0].error).toEqual(COIN_SELECTION_ERRORS.BALANCE_INSUFFICIENT_ERROR);
      expect(result.current.selectedCoins[1].invalid).toEqual(false);
      expect(result.current.selectedCoins[1].error).toBeUndefined();
    });
    test('coin has error if it has insufficient balance', () => {
      mockUseAddressState.mockReturnValueOnce({
        address:
          'addr_test1qrrx8s34r6m0w835qe9tj8mqa4ugkwhllw5l4hwpmhakpy8hukqufzmfnrvvr24tschssxw96z8dq9dz09xkg9eghtkqe07423'
      });
      mockUseCoinStateSelector.mockReturnValueOnce({
        ...mockCoinStateSelector,
        uiOutputs: [{ id: '1' }, { id: mockAsset.assetId.toString() }]
      });
      const props: UseSelectedCoinsProps = {
        assetBalances: new Map(),
        assets: new Map(),
        bundleId: 'bundleId',
        coinBalance: '1000000000',
        spendableCoin: BigInt(100)
      };
      const { result } = renderUseSelectedCoins(props);
      expect(result.current.selectedCoins[0].invalid).toEqual(true);
      expect(result.current.selectedCoins[0].error).toEqual(COIN_SELECTION_ERRORS.BUNDLE_AMOUNT_IS_EMPTY);
      expect(result.current.selectedCoins[1].invalid).toEqual(true);
      expect(result.current.selectedCoins[1].error).toEqual(COIN_SELECTION_ERRORS.BUNDLE_AMOUNT_IS_EMPTY);
    });
  });
});
