/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */

import { UserPromptService } from '@lib/scripts/background/services';
import { ExposeApiProps } from '@cardano-sdk/web-extension';

const mockUseWalletStore = jest.fn();
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockConfirmDRepRetirement = jest.fn();
const mockDRepIdMismatch = jest.fn();
const mockUseGetOwnPubDRepKeyHash = jest.fn();
const mockExposeApi = jest.fn((props: ExposeApiProps<Pick<UserPromptService, 'allowSignTx'>>) => {
  let returnValue;
  props.api$.forEach((v) => (returnValue = v.allowSignTx()));
  return returnValue;
});
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { ConfirmDRepRetirementContainer } from '../ConfirmDRepRetirementContainer';
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
import BigNumber from 'bignumber.js';
const LOVELACE_VALUE = 1_000_000;
const DEFAULT_DECIMALS = 2;

const { Cardano, Crypto, HexBlob } = Wallet;

const assetInfo$ = new BehaviorSubject(new Map());
const available$ = new BehaviorSubject([]);

const hash = Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'));
const getPubDRepKey = async () => await hash;

const inMemoryWallet = {
  getPubDRepKey,
  assetInfo$,
  balance: {
    utxo: {
      available$
    }
  }
};

const cardanoCoinMock = {
  symbol: 'cardanoCoinMockSymbol'
};

jest.mock('@cardano-sdk/web-extension', () => {
  const original = jest.requireActual('@cardano-sdk/web-extension');
  return {
    __esModule: true,
    ...original,
    exposeApi: mockExposeApi
  };
});

jest.mock('../hooks.ts', () => {
  const original = jest.requireActual('../hooks.ts');
  return {
    __esModule: true,
    ...original,
    useGetOwnPubDRepKeyHash: mockUseGetOwnPubDRepKeyHash
  };
});

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@lace/core', () => {
  const original = jest.requireActual('@lace/core');
  return {
    __esModule: true,
    ...original,
    ConfirmDRepRetirement: mockConfirmDRepRetirement
  };
});

jest.mock('../DRepIdMismatch', () => {
  const original = jest.requireActual('@lace/core');
  return {
    __esModule: true,
    ...original,
    DRepIdMismatch: mockDRepIdMismatch
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

describe('Testing ConfirmDRepRetirementContainer component', () => {
  beforeEach(() => {
    mockUseWalletStore.mockReset();
    mockExposeApi.mockRestore();
    mockUseGetOwnPubDRepKeyHash.mockImplementationOnce(() => ({
      loading: false,
      ownPubDRepKeyHash: hash
    }));
    mockUseWalletStore.mockImplementation(() => ({
      inMemoryWallet,
      walletUI: { cardanoCoin: cardanoCoinMock },
      walletInfo: {}
    }));
    mockConfirmDRepRetirement.mockReset();
    mockConfirmDRepRetirement.mockReturnValue(<span data-testid="ConfirmDRepRetirementContainer" />);
    mockDRepIdMismatch.mockReset();
    mockDRepIdMismatch.mockReturnValue(<span data-testid="DRepIdMismatch" />);
    mockUseTranslation.mockReset();
    mockUseTranslation.mockImplementation(() => ({ t }));
  });

  afterEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    cleanup();
  });

  const dappInfo = {
    name: 'dappName',
    logo: 'dappLogo',
    url: 'dappUrl'
  };
  const certificate: Wallet.Cardano.Certificate = {
    __typename: Cardano.CertificateType.UnregisterDelegateRepresentative,
    dRepCredential: {
      type: Cardano.CredentialType.KeyHash,
      hash
    },
    deposit: BigInt('1000')
  };
  const tx = buildMockTx({
    certificates: [certificate]
  });
  const errorMessage = 'errorMessage';
  // eslint-disable-next-line unicorn/consistent-function-scoping
  const onErrorMock = jest.fn();

  test('should render ConfirmDRepRetirementContainer component with proper props', async () => {
    let queryByTestId: any;
    await act(async () => {
      ({ queryByTestId } = render(
        <ConfirmDRepRetirementContainer {...{ signTxData: { dappInfo, tx }, errorMessage, onError: onErrorMock }} />,
        {
          wrapper: getWrapper()
        }
      ));
    });

    expect(queryByTestId('ConfirmDRepRetirementContainer')).toBeInTheDocument();
    expect(mockConfirmDRepRetirement).toHaveBeenLastCalledWith(
      {
        dappInfo,
        metadata: {
          depositReturned: `${new BigNumber(certificate.deposit.toString())
            .dividedBy(LOVELACE_VALUE)
            .toFixed(DEFAULT_DECIMALS)} ${cardanoCoinMock.symbol}`,
          drepId: Cardano.DRepID(HexBlob.toTypedBech32('drep', Wallet.HexBlob(certificate.dRepCredential.hash)))
        },
        translations: {
          metadata: t('core.DRepRetirement.metadata'),
          labels: {
            depositReturned: t('core.DRepRetirement.depositReturned'),
            drepId: t('core.DRepRetirement.drepId')
          }
        },
        errorMessage
      },
      {}
    );
  });

  test('should render ConfirmDRepRetirementContainer component with proper error for own retirement', async () => {
    let queryByTestId: any;
    await act(async () => {
      ({ queryByTestId } = render(
        <ConfirmDRepRetirementContainer {...{ signTxData: { dappInfo, tx }, onError: onErrorMock }} />,
        {
          wrapper: getWrapper()
        }
      ));
    });

    expect(queryByTestId('ConfirmDRepRetirementContainer')).toBeInTheDocument();
    expect(
      mockConfirmDRepRetirement.mock.calls[mockConfirmDRepRetirement.mock.calls.length - 1][0].errorMessage
    ).toEqual(t('core.DRepRetirement.isOwnRetirement'));
  });

  test('should render ConfirmDRepRetirementContainer component with proper error for not own retirement', async () => {
    mockUseGetOwnPubDRepKeyHash.mockReset();
    mockUseGetOwnPubDRepKeyHash.mockImplementation(() => ({
      loading: false,
      ownPubDRepKeyHash: Crypto.Hash28ByteBase16(Buffer.from('WRONG_dRepCredentialHashdRep').toString('hex'))
    }));
    let queryByTestId: any;
    await act(async () => {
      ({ queryByTestId } = render(
        <ConfirmDRepRetirementContainer {...{ signTxData: { dappInfo, tx }, onError: onErrorMock }} />,
        {
          wrapper: getWrapper()
        }
      ));
    });

    expect(queryByTestId('DRepIdMismatch')).toBeInTheDocument();
  });
});
