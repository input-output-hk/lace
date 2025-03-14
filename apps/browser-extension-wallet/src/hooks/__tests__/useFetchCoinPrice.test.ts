/* eslint-disable import/imports-first */
const mockUseCurrencyStore = jest.fn().mockReturnValue({ fiatCurrency: { code: 'ADA', symbol: 'tADA' } });
/* eslint-disable camelcase */
import * as CurrencyProvider from '@providers/currency';
import { renderHook } from '@testing-library/react-hooks';
import { useFetchCoinPrice } from '../useFetchCoinPrice';
import { act } from 'react-dom/test-utils';
import { BehaviorSubject } from 'rxjs';

import { BackgroundServiceAPIProviderProps } from '@src/providers';

const tokenPrices$ = new BehaviorSubject({});
const adaPrices$ = new BehaviorSubject({});

jest.mock('@providers/currency', (): typeof CurrencyProvider => ({
  ...jest.requireActual<typeof CurrencyProvider>('@providers/currency'),
  useCurrencyStore: mockUseCurrencyStore
}));

const backgroundServices = {
  getBackgroundStorage: jest.fn(),
  setBackgroundStorage: jest.fn(),
  coinPrices: { tokenPrices$, adaPrices$ }
} as unknown as BackgroundServiceAPIProviderProps['value'];

jest.mock('@providers/BackgroundServiceAPI', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@providers/BackgroundServiceAPI'),
  useBackgroundServiceAPIContext: () => backgroundServices
}));

describe('Testing useFetchCoinPrice hook', () => {
  test('should return proper state', async () => {
    const hook = renderHook(() => useFetchCoinPrice());
    expect(hook.result.current).toEqual({
      priceResult: {
        cardano: {
          price: 1,
          priceVariationPercentage24h: 0
        },
        bitcoin: {
          price: undefined,
          priceVariationPercentage24h: 0
        },
        tokens: undefined
      },
      status: undefined,
      timestamp: undefined
    });

    const tokens = [
      {
        key: 'f4d97191f857096b441a410c036f63d6697dde0c71d2755dd664e3024d4b41',
        value: {
          priceInAda: 0.001_019_089_075,
          priceVariationPercentage24h: 0
        }
      },
      {
        key: '69147ab2935ad17bdf0684b44a16f78000ce4d32689ee42821d4302d43617264616e6f506f74696f6e7330303039',
        value: {
          priceInAda: 0,
          priceVariationPercentage24h: 0
        }
      },
      {
        key: 'b8b57f3bb13f0d4c1cbf8a1a89432b1e117778c49feec29102ea044b564953494f4e',
        value: {
          priceInAda: 0.000_654_275_679_353_57,
          priceVariationPercentage24h: 0
        }
      }
    ];

    const prices = {
      aud: 0.749_534,
      aud_24h_change: -4.715_654_465_251_793,
      brl: 2.44,
      brl_24h_change: -4.777_867_256_799_271,
      cad: 0.663_224,
      cad_24h_change: -5.109_852_292_078_679_5,
      chf: 0.429_024,
      chf_24h_change: -4.831_299_692_162_652,
      eur: 0.453_725,
      eur_24h_change: -4.613_477_733_171_235,
      gbp: 0.388_692,
      gbp_24h_change: -4.888_499_952_684_678,
      inr: 41.07,
      inr_24h_change: -4.827_209_327_545_388,
      jpy: 73.1,
      jpy_24h_change: -4.958_014_167_571_372,
      krw: 662.14,
      krw_24h_change: -4.527_301_528_944_956,
      usd: 0.494_062,
      usd_24h_change: -4.836_998_672_674_212,
      vnd: 12_134.65,
      vnd_24h_change: -4.794_452_678_617_532
    };

    act(() => {
      tokenPrices$.next({ status: 'fetched', tokens });
      adaPrices$.next({ status: 'fetched', prices });
    });
    expect(hook.result.current).toEqual({
      priceResult: {
        cardano: {
          price: 1,
          priceVariationPercentage24h: 0
        },
        tokens
      },
      status: 'fetched'
    });

    const fiatCurrency = { code: 'USD', symbol: '$' };
    act(() => {
      mockUseCurrencyStore.mockReset();
      mockUseCurrencyStore.mockReturnValue({ fiatCurrency });
    });

    hook.rerender();
    expect(hook.result.current).toEqual({
      priceResult: {
        cardano: {
          price: prices.usd,
          priceVariationPercentage24h: prices.usd_24h_change
        },
        tokens
      },
      status: 'fetched'
    });
  });
});
