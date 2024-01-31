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
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { buildMockTx } from '@src/utils/mocks/tx';
import { Wallet } from '@lace/cardano';
import { getWrapper } from '../testing.utils';
import { drepIDasBech32FromHash } from '../utils';

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
      stakeCredential: {
        type: Wallet.Cardano.CredentialType.KeyHash,
        hash: Wallet.Crypto.Hash28ByteBase16(STAKE_KEY_HASH)
      }
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
          drepId: drepIDasBech32FromHash((dRep as unknown as Wallet.Cardano.Credential).hash)
        },
        translations: {
          metadata: t('core.VoteDelegation.metadata'),
          option: t('core.VoteDelegation.option'),
          labels: {
            drepId: t('core.VoteDelegation.drepId'),
            alwaysAbstain: t('core.VoteDelegation.alwaysAbstain'),
            alwaysNoConfidence: t('core.VoteDelegation.alwaysNoConfidence')
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
