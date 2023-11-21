/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockUseWalletStore = jest.fn();
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockConfirmVoteDelegation = jest.fn();
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { ConfirmVoteDelegationContainer } from '../ConfirmVoteDelegationContainer';
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

const REWARD_ACCOUNT = Wallet.Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj');
const STAKE_KEY_HASH = Wallet.Cardano.RewardAccount.toHash(REWARD_ACCOUNT);

const assetInfo$ = new BehaviorSubject(new Map());
const available$ = new BehaviorSubject([]);

const inMemoryWallet = {
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

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@lace/core', () => {
  const original = jest.requireActual('@lace/core');
  return {
    __esModule: true,
    ...original,
    ConfirmVoteDelegation: mockConfirmVoteDelegation
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

describe('Testing ConfirmVoteDelegationContainer component', () => {
  beforeEach(() => {
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      inMemoryWallet,
      walletUI: { cardanoCoin: cardanoCoinMock },
      walletInfo: {}
    }));
    mockConfirmVoteDelegation.mockReset();
    mockConfirmVoteDelegation.mockReturnValue(<span data-testid="ConfirmVoteDelegation" />);
    mockUseTranslation.mockReset();
    mockUseTranslation.mockImplementation(() => ({ t }));
  });

  afterEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    cleanup();
  });

  test('should render ConfirmVoteDelegation component with proper props', async () => {
    let queryByTestId: any;
    let rerender: any;

    const dappInfo = {
      name: 'dappName',
      logo: 'dappLogo',
      url: 'dappUrl'
    };
    const certificate: Wallet.Cardano.Certificate = {
      __typename: Wallet.Cardano.CertificateType.VoteDelegation,
      dRep: {
        type: Wallet.Cardano.CredentialType.KeyHash,
        hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'))
      },
      stakeKeyHash: STAKE_KEY_HASH
    };
    const tx = buildMockTx({
      certificates: [certificate]
    });
    const errorMessage = 'errorMessage';
    const props = { signTxData: { dappInfo, tx }, errorMessage };
    const dRep = certificate.dRep;

    await act(async () => {
      ({ rerender, queryByTestId } = render(<ConfirmVoteDelegationContainer {...props} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('ConfirmVoteDelegation')).toBeInTheDocument();
    expect(mockConfirmVoteDelegation).toHaveBeenLastCalledWith(
      {
        dappInfo,
        metadata: {
          alwaysAbstain: false,
          alwaysNoConfidence: false,
          drepId: Wallet.Cardano.DRepID(
            Wallet.HexBlob.toTypedBech32('drep', Wallet.HexBlob((dRep as unknown as Wallet.Cardano.Credential).hash))
          )
        },
        translations: {
          metadata: t('core.voteDelegation.metadata'),
          option: t('core.voteDelegation.option'),
          labels: {
            drepId: t('core.voteDelegation.drepId'),
            alwaysAbstain: t('core.voteDelegation.alwaysAbstain'),
            alwaysNoConfidence: t('core.voteDelegation.alwaysNoConfidence')
          }
        },
        errorMessage
      },
      {}
    );

    await act(async () => {
      rerender(
        <ConfirmVoteDelegationContainer
          {...{
            signTxData: {
              dappInfo,
              tx: buildMockTx({
                certificates: [{ ...certificate, dRep: { __typename: 'AlwaysAbstain' } }]
              })
            },
            errorMessage
          }}
        />,
        {
          wrapper: getWrapper()
        }
      );
    });
    expect(mockConfirmVoteDelegation.mock.calls[mockConfirmVoteDelegation.mock.calls.length - 1][0].metadata).toEqual({
      alwaysAbstain: true,
      alwaysNoConfidence: false
    });
    await act(async () => {
      rerender(
        <ConfirmVoteDelegationContainer
          {...{
            signTxData: {
              dappInfo,
              tx: buildMockTx({
                certificates: [{ ...certificate, dRep: { __typename: 'AlwaysNoConfidence' } }]
              })
            },
            errorMessage
          }}
        />,
        {
          wrapper: getWrapper()
        }
      );
    });
    expect(mockConfirmVoteDelegation.mock.calls[mockConfirmVoteDelegation.mock.calls.length - 1][0].metadata).toEqual({
      alwaysAbstain: false,
      alwaysNoConfidence: true
    });
  });
});
