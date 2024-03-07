/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockUseWalletStore = jest.fn();
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockConfirmStakeRegistrationDelegation = jest.fn();
const mockLovelacesToAdaString = jest.fn();
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { ConfirmStakeRegistrationDelegationContainer } from '../ConfirmStakeRegistrationDelegationContainer';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { buildMockTx } from '@src/utils/mocks/tx';
import { Wallet } from '@lace/cardano';
import { getWrapper } from '../testing.utils';
import { TransactionWitnessRequest } from '@cardano-sdk/web-extension';
import { depositPaidWithSymbol } from '../utils';

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
const certificate: Wallet.Cardano.Certificate = {
  __typename: Wallet.Cardano.CertificateType.StakeRegistrationDelegation,
  poolId: Wallet.Cardano.PoolId('pool126zlx7728y7xs08s8epg9qp393kyafy9rzr89g4qkvv4cv93zem'),
  stakeCredential: {
    type: Wallet.Cardano.CredentialType.KeyHash,
    hash: Wallet.Crypto.Hash28ByteBase16(STAKE_KEY_HASH)
  },
  deposit: BigInt('100000')
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
  useViewsFlowContext: () => ({
    signTxRequest: { request },
    dappInfo
  })
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
    ConfirmStakeRegistrationDelegation: mockConfirmStakeRegistrationDelegation
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

jest.mock('@lace/cardano', () => {
  const actual = jest.requireActual<any>('@lace/cardano');
  return {
    __esModule: true,
    ...actual,
    Wallet: {
      ...actual.Wallet,
      util: {
        ...actual.Wallet.util,
        lovelacesToAdaString: mockLovelacesToAdaString
      }
    }
  };
});

describe('Testing ConfirmStakeRegistrationDelegationContainer component', () => {
  beforeEach(() => {
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      inMemoryWallet,
      walletUI: { cardanoCoin: cardanoCoinMock },
      walletInfo: {},
      currentChain: {
        networkId: 0
      }
    }));
    mockConfirmStakeRegistrationDelegation.mockReset();
    mockConfirmStakeRegistrationDelegation.mockReturnValue(<span data-testid="ConfirmStakeRegistrationDelegation" />);
    mockUseTranslation.mockReset();
    mockUseTranslation.mockImplementation(() => ({ t }));
    mockLovelacesToAdaString.mockReset();
    mockLovelacesToAdaString.mockImplementation((val) => val);
  });

  afterEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    cleanup();
  });

  test('should render ConfirmStakeRegistrationDelegation component with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmStakeRegistrationDelegationContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('ConfirmStakeRegistrationDelegation')).toBeInTheDocument();
    expect(mockConfirmStakeRegistrationDelegation).toHaveBeenLastCalledWith(
      {
        dappInfo,
        metadata: {
          poolId: certificate.poolId,
          stakeKeyHash: 'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
          depositPaid: depositPaidWithSymbol(certificate.deposit, cardanoCoinMock as Wallet.CoinId)
        },
        translations: {
          metadata: t('core.StakeRegistrationDelegation.metadata'),
          labels: {
            poolId: t('core.StakeRegistrationDelegation.poolId'),
            stakeKeyHash: t('core.StakeRegistrationDelegation.stakeKeyHash'),
            depositPaid: t('core.StakeRegistrationDelegation.depositPaid')
          }
        }
      },
      {}
    );
  });
});
