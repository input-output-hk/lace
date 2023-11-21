/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockSkeleton = jest.fn(() => <span data-testid="skeleton" />);
const mockUseWalletStore = jest.fn();
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockDappTransaction = jest.fn();
const mockUseTxSummary = jest.fn();
const mockUseCreateAssetList = jest.fn();
const mockWithAddressBookContext = jest.fn((children) => children);
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { DappTransactionContainer } from '../DappTransactionContainer';
import '@testing-library/jest-dom';
import { I18nextProvider } from 'react-i18next';
import { StoreProvider } from '@src/stores';
import {
  AnalyticsProvider,
  AppSettingsProvider,
  BackgroundServiceAPIProvider,
  BackgroundServiceAPIProviderProps,
  DatabaseProvider
} from '@src/providers';
import { APP_MODE_BROWSER } from '@src/utils/constants';
import i18n from '@lib/i18n';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';
import { postHogClientMocks } from '@src/utils/mocks/test-helpers';
import { buildMockTx } from '@src/utils/mocks/tx';
import { Wallet } from '@lace/cardano';
import { SignTxData } from '../types';

const { Cardano, Crypto } = Wallet;

const assetProvider = 'assetProvider';
const walletInfo = 'walletInfo';
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

jest.mock('../hooks.ts', () => {
  const original = jest.requireActual('../hooks.ts');
  return {
    __esModule: true,
    ...original,
    useTxSummary: mockUseTxSummary,
    useCreateAssetList: mockUseCreateAssetList
  };
});

const addressList = 'addressList';
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

const backgroundService = {
  getBackgroundStorage: jest.fn(),
  setBackgroundStorage: jest.fn()
} as unknown as BackgroundServiceAPIProviderProps['value'];

const getWrapper =
  () =>
  ({ children }: { children: React.ReactNode }) =>
    (
      <BackgroundServiceAPIProvider value={backgroundService}>
        <AppSettingsProvider>
          <DatabaseProvider>
            <StoreProvider appMode={APP_MODE_BROWSER}>
              <PostHogClientProvider postHogCustomClient={postHogClientMocks as any}>
                <AnalyticsProvider analyticsDisabled>
                  <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
                </AnalyticsProvider>
              </PostHogClientProvider>
            </StoreProvider>
          </DatabaseProvider>
        </AppSettingsProvider>
      </BackgroundServiceAPIProvider>
    );

describe('Testing DappTransactionContainer component', () => {
  beforeEach(() => {
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      inMemoryWallet,
      blockchainProvider: { assetProvider },
      walletInfo
    }));
    mockDappTransaction.mockReset();
    mockDappTransaction.mockReturnValue(<span data-testid="DappTransaction" />);
    mockUseTranslation.mockReset();
    mockUseTranslation.mockImplementation(() => ({ t }));
    mockWithAddressBookContext.mockReset();
    mockWithAddressBookContext.mockImplementation((children) => children);
    mockSkeleton.mockReset();
    mockSkeleton.mockImplementation(() => <span data-testid="skeleton" />);
  });

  afterEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    cleanup();
  });

  test('should render DappTransaction component with proper props', async () => {
    let queryByTestId: any;

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
    const errorMessage = 'errorMessage';
    const props = { signTxData: { dappInfo, tx }, errorMessage };

    const txSummary = 'txSummary';
    mockUseTxSummary.mockReset();
    mockUseTxSummary.mockReturnValue(txSummary);
    const createAssetList = 'createAssetList';
    mockUseCreateAssetList.mockReset();
    mockUseCreateAssetList.mockReturnValue(createAssetList);

    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer {...props} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).toBeInTheDocument();
    expect(mockUseCreateAssetList).toHaveBeenLastCalledWith({
      outputs: props.signTxData.tx.body.outputs,
      assets: mockedAssetsInfo,
      assetProvider
    });
    expect(mockUseTxSummary).toHaveBeenLastCalledWith({
      addressList,
      createAssetList,
      tx: props.signTxData.tx,
      walletInfo
    });
    expect(mockDappTransaction).toHaveBeenLastCalledWith(
      {
        dappInfo,
        transaction: txSummary,
        translations: {
          transaction: t('core.dappTransaction.transaction'),
          amount: t('core.dappTransaction.amount'),
          recipient: t('core.dappTransaction.recipient'),
          fee: t('core.dappTransaction.fee'),
          adaFollowingNumericValue: t('general.adaFollowingNumericValue')
        },
        errorMessage
      },
      {}
    );
  });

  test('should render loader in case there is no txSummary', async () => {
    let queryByTestId: any;

    mockUseTxSummary.mockReset();
    mockUseTxSummary.mockReturnValue(null);

    const signTxData = { tx: { body: {} } } as unknown as SignTxData;

    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer {...{ signTxData }} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).not.toBeInTheDocument();
    expect(queryByTestId('skeleton')).toBeInTheDocument();
  });
});
