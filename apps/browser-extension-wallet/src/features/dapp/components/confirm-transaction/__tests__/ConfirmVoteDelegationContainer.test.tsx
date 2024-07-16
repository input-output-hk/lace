/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
/* eslint-disable sonarjs/no-identical-functions */
const mockUseWalletStore = jest.fn();
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockConfirmVoteDelegation = jest.fn();
const mockUseViewsFlowContext = jest.fn();
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { ConfirmVoteDelegationContainer } from '../ConfirmVoteDelegationContainer';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { buildMockTx } from '@src/utils/mocks/tx';
import { Wallet } from '@lace/cardano';
import { getWrapper } from '../testing.utils';

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
  name: 'Cardano',
  symbol: 'cardanoCoinMockSymbol'
};

const dappInfo = {
  name: 'dappName',
  logo: 'dappLogo',
  url: 'dappUrl'
};

jest.mock('@providers', () => ({
  ...jest.requireActual<any>('@providers'),
  useViewsFlowContext: mockUseViewsFlowContext
}));

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
    mockUseViewsFlowContext.mockReset();
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

  test('should render ConfirmVoteDelegation component with DRep ID', async () => {
    let queryByTestId: any;
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

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: {
        request: {
          transaction: {
            toCore: jest.fn().mockReturnValue(
              buildMockTx({
                certificates: [certificate]
              })
            )
          }
        }
      },
      dappInfo
    }));
    const dRep = certificate.dRep;

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmVoteDelegationContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('ConfirmVoteDelegation')).toBeInTheDocument();
    expect(mockConfirmVoteDelegation).toHaveBeenLastCalledWith(
      {
        metadata: {
          alwaysAbstain: false,
          alwaysNoConfidence: false,
          drepId: Wallet.util.drepIDasBech32FromHash((dRep as unknown as Wallet.Cardano.Credential).hash)
        }
      },
      {}
    );
  });

  test('should render ConfirmVoteDelegation component with AlwaysAbstain', async () => {
    let queryByTestId: any;
    const certificate: Wallet.Cardano.Certificate = {
      __typename: Wallet.Cardano.CertificateType.VoteDelegation,
      dRep: { __typename: 'AlwaysAbstain' },
      stakeCredential: {
        type: Wallet.Cardano.CredentialType.KeyHash,
        hash: Wallet.Crypto.Hash28ByteBase16(STAKE_KEY_HASH)
      }
    };

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: {
        request: {
          transaction: {
            toCore: jest.fn().mockReturnValue(
              buildMockTx({
                certificates: [certificate]
              })
            )
          }
        }
      },
      dappInfo
    }));

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmVoteDelegationContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('ConfirmVoteDelegation')).toBeInTheDocument();
    expect(mockConfirmVoteDelegation).toHaveBeenLastCalledWith(
      {
        metadata: {
          alwaysAbstain: true,
          alwaysNoConfidence: false
        }
      },
      {}
    );
  });

  test('should render ConfirmVoteDelegation component with AlwaysAbstain', async () => {
    let queryByTestId: any;
    const certificate: Wallet.Cardano.Certificate = {
      __typename: Wallet.Cardano.CertificateType.VoteDelegation,
      dRep: { __typename: 'AlwaysNoConfidence' },
      stakeCredential: {
        type: Wallet.Cardano.CredentialType.KeyHash,
        hash: Wallet.Crypto.Hash28ByteBase16(STAKE_KEY_HASH)
      }
    };

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: {
        request: {
          transaction: {
            toCore: jest.fn().mockReturnValue(
              buildMockTx({
                certificates: [certificate]
              })
            )
          }
        }
      },
      dappInfo
    }));

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmVoteDelegationContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('ConfirmVoteDelegation')).toBeInTheDocument();
    expect(mockConfirmVoteDelegation).toHaveBeenLastCalledWith(
      {
        metadata: {
          alwaysAbstain: false,
          alwaysNoConfidence: true
        }
      },
      {}
    );
  });
});
