/* eslint-disable no-magic-numbers */
/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
import * as CurrencyProvider from '@providers/currency';
import * as UseFetchCoinPrice from '@hooks/useFetchCoinPrice';
import * as UseComputeTxCollateral from '@hooks/useComputeTxCollateral';
import * as GetAssetsInformation from '@src/utils/get-assets-information';

const mockSkeleton = jest.fn(() => <span data-testid="skeleton" />);
const mockUseWalletStore = jest.fn();
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockDappTransaction = jest.fn();
const mockUseViewsFlowContext = jest.fn();
const mockGetAssetsInformation = jest.fn().mockReturnValue(Promise.resolve(new Map()));
const mockWithAddressBookContext = jest.fn((children) => children);
const mockUseCurrencyStore = jest.fn().mockReturnValue({ fiatCurrency: { code: 'usd', symbol: '$' } });
const mockUseFetchCoinPrice = jest.fn().mockReturnValue({ priceResult: { cardano: { price: 2 }, tokens: new Map() } });
const mockUseComputeTxCollateral = jest.fn().mockReturnValue(BigInt(1_000_000));
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
// import { DappTransactionContainer } from '../DappTransactionContainer';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { buildMockTx } from '@src/utils/mocks/tx';
import { Wallet } from '@lace/cardano';
import { SignTxData } from '../types';
import { getWrapper } from '../testing.utils';
import { TransactionWitnessRequest } from '@cardano-sdk/web-extension';
import { cardanoCoin } from '@src/utils/constants';
import { DappTransactionContainer } from '../DappTransactionContainer';

const { Cardano, Crypto } = Wallet;

const assetProvider = {
  getAssets: jest.fn(() => ['assets'])
};
const walletInfo = {
  name: 'wall',
  addresses: [{ address: 'address' }]
};
const mockedAssetsInfo = new Map([['id', 'data']]);
const assetInfo$ = new BehaviorSubject(mockedAssetsInfo);
const available$ = new BehaviorSubject([]);

const inMemoryWallet = {
  assetInfo$,
  balance: {
    utxo: {
      available$
    }
  }
};

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@hooks/useFetchCoinPrice', (): typeof UseFetchCoinPrice => ({
  ...jest.requireActual<typeof UseFetchCoinPrice>('@hooks/useFetchCoinPrice'),
  useFetchCoinPrice: mockUseFetchCoinPrice
}));

jest.mock('@hooks/useComputeTxCollateral', (): typeof UseComputeTxCollateral => ({
  ...jest.requireActual<typeof UseComputeTxCollateral>('@hooks/useComputeTxCollateral'),
  useComputeTxCollateral: mockUseComputeTxCollateral
}));

jest.mock('@src/utils/get-assets-information', (): typeof GetAssetsInformation => ({
  ...jest.requireActual<typeof GetAssetsInformation>('@src/utils/get-assets-information'),
  getAssetsInformation: mockGetAssetsInformation
}));

jest.mock('@providers/currency', (): typeof CurrencyProvider => ({
  ...jest.requireActual<typeof CurrencyProvider>('@providers/currency'),
  useCurrencyStore: mockUseCurrencyStore
}));

jest.mock('@lace/core', () => {
  const original = jest.requireActual('@lace/core');
  return {
    __esModule: true,
    ...original,
    DappTransaction: mockDappTransaction
  };
});

jest.mock('react-i18next', () => {
  const original = jest.requireActual('react-i18next');
  return {
    __esModule: true,
    ...original,
    useTranslation: mockUseTranslation
  };
});

const addressList = ['addressList'];
jest.mock('@src/features/address-book/context', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@src/features/address-book/context'),
  withAddressBookContext: mockWithAddressBookContext,
  useAddressBookContext: () => ({ list: addressList })
}));

jest.mock('antd', () => {
  const original = jest.requireActual('antd');
  return {
    __esModule: true,
    ...original,
    Skeleton: mockSkeleton
  };
});

const dappInfo = {
  name: 'dappName',
  logo: 'dappLogo',
  url: 'dappUrl'
};

const certificate: Wallet.Cardano.Certificate = {
  __typename: Cardano.CertificateType.RegisterDelegateRepresentative,
  dRepCredential: {
    type: Cardano.CredentialType.KeyHash,
    hash: Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'))
  },
  deposit: BigInt('1000'),
  anchor: {
    url: 'anchorUrl',
    dataHash: Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex'))
  }
};
const tx = buildMockTx({
  certificates: [certificate]
});

const request = {
  transaction: {
    toCore: jest.fn().mockReturnValue(tx)
  } as any
} as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

jest.mock('@providers', () => ({
  ...jest.requireActual<any>('@providers'),
  useViewsFlowContext: mockUseViewsFlowContext
}));

describe('Testing DappTransactionContainer component', () => {
  beforeEach(() => {
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      inMemoryWallet,
      blockchainProvider: { assetProvider },
      walletInfo,
      walletUI: { cardanoCoin }
    }));
    mockDappTransaction.mockReset();
    mockDappTransaction.mockReturnValue(<span data-testid="DappTransaction" />);
    mockUseTranslation.mockReset();
    mockUseTranslation.mockImplementation(() => ({ t }));
    mockWithAddressBookContext.mockReset();
    mockWithAddressBookContext.mockImplementation((children) => children);
    mockSkeleton.mockReset();
    mockSkeleton.mockImplementation(() => <span data-testid="skeleton" />);
    mockUseViewsFlowContext.mockReset();
    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: { request },
      dappInfo
    }));
  });

  afterEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    cleanup();
  });

  test('should render DappTransaction component with proper props', async () => {
    let queryByTestId: any;

    const errorMessage = 'errorMessage';
    const props = { errorMessage };

    const txSummary = {
      burnedAssets: [],
      collateral: '1.00',
      fee: '0.17',
      mintedAssets: [
        {
          amount: '3',
          name: 'asset1rqluyux4nxv6kjashz626c8usp8g88unmqwnyh',
          ticker: 'asset1rqluyux4nxv6kjashz626c8usp8g88unmqwnyh'
        }
      ],
      outputs: [
        {
          coins: '5.00',
          recipient:
            'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz'
        },
        {
          assets: [
            {
              amount: '3',
              name: '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41',
              ticker: undefined
            },
            {
              amount: '4',
              name: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
              ticker: undefined
            }
          ],
          coins: '2.00',
          recipient:
            'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz'
        },
        {
          assets: [
            {
              amount: '6',
              name: '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41',
              ticker: undefined
            }
          ],
          coins: '2.00',
          recipient:
            'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz'
        },
        {
          assets: [
            {
              amount: '1',
              name: '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41',
              ticker: undefined
            }
          ],
          coins: '2.00',
          recipient:
            'addr_test1qq585l3hyxgj3nas2v3xymd23vvartfhceme6gv98aaeg9muzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q2g7k3g'
        }
      ],
      type: 'Mint'
    } as Wallet.Cip30SignTxSummary;

    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer {...props} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).toBeInTheDocument();
    expect(mockDappTransaction).toHaveBeenLastCalledWith(
      {
        dappInfo,
        transaction: txSummary,
        fiatCurrencyCode: 'usd',
        fiatCurrencyPrice: 2,
        errorMessage,
        coinSymbol: 'ADA'
      },
      {}
    );
  });

  test('should render loader in case there is no tx data', async () => {
    let queryByTestId: any;

    mockUseViewsFlowContext.mockReset();
    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: {},
      dappInfo
    }));

    const signTxData = { tx: { body: {} } } as unknown as SignTxData;

    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer {...({ signTxData } as any)} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).not.toBeInTheDocument();
    expect(queryByTestId('skeleton')).toBeInTheDocument();
  });

  test('should render loader in case there is no txSummary', async () => {
    let queryByTestId: any;

    mockUseCurrencyStore.mockRestore();

    const signTxData = { tx: { body: {} } } as unknown as SignTxData;

    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer {...({ signTxData } as any)} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).not.toBeInTheDocument();
    expect(queryByTestId('skeleton')).toBeInTheDocument();
  });
});
