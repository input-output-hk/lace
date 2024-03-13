/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockUseWalletStore = jest.fn();
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockConfirmStakeVoteRegistrationDelegation = jest.fn();
const mockIsDRepAlwaysAbstain = jest.fn();
const mockIsDRepAlwaysNoConfidence = jest.fn();
const mockIsDRepCredential = jest.fn();
const mockLovelacesToAdaString = jest.fn();
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { ConfirmStakeVoteRegistrationDelegationContainer } from '../ConfirmStakeVoteRegistrationDelegationContainer';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { buildMockTx } from '@src/utils/mocks/tx';
import { Wallet } from '@lace/cardano';
import { getWrapper } from '../testing.utils';
import { depositPaidWithSymbol, drepIDasBech32FromHash } from '../utils';
import { TransactionWitnessRequest } from '@cardano-sdk/web-extension';

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
  __typename: Wallet.Cardano.CertificateType.StakeVoteRegistrationDelegation,
  poolId: Wallet.Cardano.PoolId('pool126zlx7728y7xs08s8epg9qp393kyafy9rzr89g4qkvv4cv93zem'),
  stakeCredential: {
    type: Wallet.Cardano.CredentialType.KeyHash,
    hash: Wallet.Crypto.Hash28ByteBase16(STAKE_KEY_HASH)
  },
  dRep: {
    type: Wallet.Cardano.CredentialType.KeyHash,
    hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'))
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
    ConfirmStakeVoteRegistrationDelegation: mockConfirmStakeVoteRegistrationDelegation
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
      },
      Cardano: {
        ...actual.Wallet.Cardano,
        isDRepAlwaysAbstain: mockIsDRepAlwaysAbstain,
        isDRepAlwaysNoConfidence: mockIsDRepAlwaysNoConfidence,
        isDRepCredential: mockIsDRepCredential
      }
    }
  };
});

const isDRepAlwaysAbstainMocked = 'isDRepAlwaysAbstainMocked';
const isDRepAlwaysNoConfidenceMocked = 'isDRepAlwaysNoConfidenceMocked';

describe('Testing ConfirmStakeVoteRegistrationDelegationContainer component', () => {
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
    mockConfirmStakeVoteRegistrationDelegation.mockReset();
    mockConfirmStakeVoteRegistrationDelegation.mockReturnValue(
      <span data-testid="ConfirmStakeVoteRegistrationDelegation" />
    );
    mockUseTranslation.mockReset();
    mockUseTranslation.mockImplementation(() => ({ t }));
    mockLovelacesToAdaString.mockReset();
    mockLovelacesToAdaString.mockImplementation((val) => val);
    mockIsDRepAlwaysAbstain.mockReset();
    mockIsDRepAlwaysAbstain.mockImplementation(() => isDRepAlwaysAbstainMocked);
    mockIsDRepAlwaysNoConfidence.mockReset();
    mockIsDRepAlwaysNoConfidence.mockImplementation(() => isDRepAlwaysNoConfidenceMocked);
    mockIsDRepCredential.mockReset();
    mockIsDRepCredential.mockImplementation(() => true);
  });

  afterEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
    cleanup();
  });

  test('should render ConfirmStakeVoteRegistrationDelegation component with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmStakeVoteRegistrationDelegationContainer tx={tx} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('ConfirmStakeVoteRegistrationDelegation')).toBeInTheDocument();
    expect(mockConfirmStakeVoteRegistrationDelegation).toHaveBeenLastCalledWith(
      {
        dappInfo,
        metadata: {
          poolId: certificate.poolId,
          stakeKeyHash: 'stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj',
          depositPaid: depositPaidWithSymbol(certificate.deposit, cardanoCoinMock as Wallet.CoinId),
          alwaysAbstain: isDRepAlwaysAbstainMocked,
          alwaysNoConfidence: isDRepAlwaysNoConfidenceMocked,
          drepId: drepIDasBech32FromHash((certificate.dRep as Wallet.Cardano.Credential).hash)
        },
        translations: {
          metadata: t('core.StakeVoteDelegationRegistration.metadata'),
          option: t('core.StakeVoteDelegationRegistration.option'),
          labels: {
            poolId: t('core.StakeVoteDelegationRegistration.poolId'),
            stakeKeyHash: t('core.StakeVoteDelegationRegistration.stakeKeyHash'),
            drepId: t('core.StakeVoteDelegationRegistration.drepId'),
            alwaysAbstain: t('core.StakeVoteDelegationRegistration.alwaysAbstain'),
            alwaysNoConfidence: t('core.StakeVoteDelegationRegistration.alwaysNoConfidence'),
            depositPaid: t('core.StakeVoteDelegationRegistration.depositPaid')
          }
        }
      },
      {}
    );
  });
});
