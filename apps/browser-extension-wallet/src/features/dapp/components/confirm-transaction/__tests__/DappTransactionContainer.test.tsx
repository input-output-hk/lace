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
const mockUseChainHistoryProvider = jest.fn().mockReturnValue({
  transactionsByAddress: jest.fn().mockResolvedValue([]),
  transactionsByHashes: jest.fn().mockResolvedValue([]),
  blocksByHashes: jest.fn().mockResolvedValue([])
});
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { DappTransactionContainer } from '../DappTransactionContainer';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { buildMockTx, sendingAddress } from '@src/utils/mocks/tx';
import { Wallet } from '@lace/cardano';
import { SignTxData } from '../types';
import { getWrapper } from '../testing.utils';
import { TransactionWitnessRequest } from '@cardano-sdk/web-extension';
import { cardanoCoin } from '@src/utils/constants';
import { AddressBookSchema } from '@lib/storage';

const { Cardano, Crypto } = Wallet;

const assetProvider = {
  getAssets: jest.fn(() => ['assets']),
  getAsset: jest.fn(() => 'asset')
};
const walletInfo = {
  name: 'wall',
  addresses: [{ address: 'address' }]
};
const mockedAssetsInfo = new Map([['id', 'data']]);
const assetInfo$ = new BehaviorSubject(mockedAssetsInfo);
const available$ = new BehaviorSubject([]);
const signed$ = new BehaviorSubject([]);
const addresses$ = new BehaviorSubject([sendingAddress]);
const rewardAccounts$ = new BehaviorSubject([
  {
    // eslint-disable-next-line unicorn/consistent-destructuring
    address: Wallet.Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj'),
    credentialStatus: 'REGISTERED',
    rewardBalance: 1
  }
]);
const protocolParameters$ = new BehaviorSubject({
  stakeKeyDeposit: 1,
  poolDeposit: 1
});

const inMemoryWallet = {
  addresses$,
  assetInfo$,
  balance: {
    utxo: {
      available$
    }
  },
  utxo: {
    available$
  },
  transactions: {
    outgoing: {
      signed$
    }
  },
  delegation: {
    rewardAccounts$
  },
  protocolParameters$,
  governance: {
    isRegisteredAsDRep$: new BehaviorSubject(true)
  }
};
const REWARD_ACCOUNT = Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj');
const STAKE_KEY_HASH = Cardano.RewardAccount.toHash(REWARD_ACCOUNT);
const STAKE_CREDENTIAL = {
  type: Cardano.CredentialType.KeyHash,
  hash: Crypto.Hash28ByteBase16(STAKE_KEY_HASH)
};
const DREP_CREDENTIAL = {
  type: Cardano.CredentialType.KeyHash,
  hash: Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'))
};
const POOL_ID = Cardano.PoolId('pool126zlx7728y7xs08s8epg9qp393kyafy9rzr89g4qkvv4cv93zem');

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

jest.mock('@hooks/useChainHistoryProvider', (): typeof CurrencyProvider => ({
  ...jest.requireActual<any>('@hooks/useChainHistoryProvider'),
  useChainHistoryProvider: mockUseChainHistoryProvider
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

const addressBook: AddressBookSchema[] = [];
jest.mock('@src/features/address-book/context', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('@src/features/address-book/context'),
  withAddressBookContext: mockWithAddressBookContext,
  useAddressBookContext: () => ({ list: addressBook })
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

const mockCredentialKeyHash = Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'));

const drepRegistrationcertificate: Wallet.Cardano.Certificate = {
  __typename: Cardano.CertificateType.RegisterDelegateRepresentative,
  dRepCredential: DREP_CREDENTIAL,
  deposit: BigInt('1000'),
  anchor: {
    url: 'anchorUrl',
    dataHash: Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex'))
  }
};

const drepRetirementCertificate: Wallet.Cardano.Certificate = {
  __typename: Cardano.CertificateType.UnregisterDelegateRepresentative,
  dRepCredential: DREP_CREDENTIAL,
  deposit: BigInt('1000')
};

const drepUpdateCertificate: Wallet.Cardano.Certificate = {
  __typename: Cardano.CertificateType.UpdateDelegateRepresentative,
  dRepCredential: DREP_CREDENTIAL,
  anchor: {
    url: 'anchorUrl',
    dataHash: Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex'))
  }
};

const stakeRegistrationDelegationCertificate: Wallet.Cardano.Certificate = {
  __typename: Cardano.CertificateType.StakeRegistrationDelegation,
  poolId: POOL_ID,
  stakeCredential: STAKE_CREDENTIAL,
  deposit: BigInt('100000')
};

const stakeVoteDelegationCertificate: Wallet.Cardano.Certificate = {
  __typename: Cardano.CertificateType.StakeVoteDelegation,
  poolId: POOL_ID,
  stakeCredential: STAKE_CREDENTIAL,
  dRep: DREP_CREDENTIAL
};

const stakeVoteRegistrationDelegationCertificate: Wallet.Cardano.Certificate = {
  __typename: Cardano.CertificateType.StakeVoteRegistrationDelegation,
  poolId: POOL_ID,
  stakeCredential: STAKE_CREDENTIAL,
  dRep: DREP_CREDENTIAL,
  deposit: BigInt('100000')
};

const voteDelegationCertificate: Wallet.Cardano.Certificate = {
  __typename: Cardano.CertificateType.VoteDelegation,
  dRep: DREP_CREDENTIAL,
  stakeCredential: STAKE_CREDENTIAL
};

const voteRegistrationDelegationCertificate: Wallet.Cardano.Certificate = {
  __typename: Cardano.CertificateType.VoteRegistrationDelegation,
  stakeCredential: STAKE_CREDENTIAL,
  dRep: DREP_CREDENTIAL,
  deposit: BigInt('100000')
};

jest.mock('@providers/ViewFlowProvider', () => ({
  ...jest.requireActual<any>('@providers/ViewFlowProvider'),
  useViewsFlowContext: mockUseViewsFlowContext
}));

describe('Testing DappTransactionContainer component', () => {
  beforeEach(() => {
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      inMemoryWallet,
      blockchainProvider: { assetProvider },
      walletInfo,
      walletUI: { cardanoCoin },
      currentChain: {
        networkId: 0,
        networkMagic: 1
      }
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
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    cleanup();
  });

  test('should render DappTransaction component with proper props', async () => {
    let queryByTestId: any;

    const request = {
      transaction: {
        toCore: jest.fn().mockReturnValue(buildMockTx({ certificates: [drepRegistrationcertificate] }))
      } as any
    } as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: { request, set: jest.fn() },
      dappInfo
    }));

    const toAddress = new Map([
      [
        // eslint-disable-next-line unicorn/consistent-destructuring
        Wallet.Cardano.PaymentAddress(
          'addr_test1qpfhhfy2qgls50r9u4yh0l7z67xpg0a5rrhkmvzcuqrd0znuzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q9gw0lz'
        ),
        {
          assets: new Map([
            [
              '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41',
              {
                amount: BigInt(9),
                assetInfo: {
                  assetId: '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41',
                  fingerprint: 'asset1rqluyux4nxv6kjashz626c8usp8g88unmqwnyh',
                  name: '54534c41',
                  nftMetadata: null,
                  policyId: '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82',
                  quantity: BigInt(3),
                  supply: BigInt(3)
                }
              }
            ],
            [
              '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
              {
                amount: BigInt(4),
                assetInfo: {
                  assetId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
                  fingerprint: 'asset1cvmyrfrc7lpht2hcjwr9lulzyyjv27uxh3kcz0',
                  name: '',
                  policyId: '6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7',
                  quantity: BigInt(0),
                  supply: BigInt(0)
                }
              }
            ]
          ]),
          coins: BigInt(9_000_000)
        }
      ],
      [
        // eslint-disable-next-line unicorn/consistent-destructuring
        Wallet.Cardano.PaymentAddress(
          'addr_test1qq585l3hyxgj3nas2v3xymd23vvartfhceme6gv98aaeg9muzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q2g7k3g'
        ),
        {
          assets: new Map([
            [
              '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41',
              {
                amount: BigInt(1),
                assetInfo: {
                  assetId: '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41',
                  fingerprint: 'asset1rqluyux4nxv6kjashz626c8usp8g88unmqwnyh',
                  name: '54534c41',
                  nftMetadata: null,
                  policyId: '659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba82',
                  quantity: BigInt(3),
                  supply: BigInt(3)
                }
              }
            ]
          ]),
          coins: BigInt(2_000_000)
        }
      ]
    ]);

    const txInspectionDetails = {
      assets: new Map(),
      coins: BigInt(0),
      collateral: BigInt(0),
      deposit: BigInt(1000),
      fee: BigInt(170_000),
      returnedDeposit: BigInt(0),
      unresolved: {
        inputs: [
          {
            address:
              'addr_test1qq585l3hyxgj3nas2v3xymd23vvartfhceme6gv98aaeg9muzcjqw982pcftgx53fu5527z2cj2tkx2h8ux2vxsg475q2g7k3g',
            index: 0,
            txId: 'bb217abaca60fc0ca68c1555eca6a96d2478547818ae76ce6836133f3cc546e0'
          }
        ],
        value: {
          assets: new Map([
            ['6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7', BigInt(4)],
            ['659f2917fb63f12b33667463ee575eeac1845bbc736b9c0bbc40ba8254534c41', BigInt(7)]
          ]),

          coins: BigInt(11_171_000)
        }
      }
    };

    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer />, {
        wrapper: getWrapper()
      }));
    });
    expect(queryByTestId('DappTransaction')).toBeInTheDocument();

    expect(mockDappTransaction).toHaveBeenLastCalledWith(
      {
        dappInfo,
        toAddress,
        fromAddress: new Map(),
        fiatCurrencyCode: 'usd',
        fiatCurrencyPrice: 2,
        coinSymbol: 'ADA',
        collateral: BigInt(1_000_000),
        txInspectionDetails,
        ownAddresses: [sendingAddress.address],
        addressToNameMap: new Map()
      },
      {}
    );
  });

  it('should display drep registration certificate', async () => {
    let queryByTestId: any;
    const drepRegistrationTx = buildMockTx({ certificates: [drepRegistrationcertificate] });
    const request = {
      transaction: {
        toCore: jest.fn().mockReturnValue(drepRegistrationTx)
      } as any
    } as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: { request, set: jest.fn() },
      dappInfo
    }));

    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).toBeInTheDocument();
    expect(queryByTestId('certificates')).toBeInTheDocument();
  });

  it('should display drep retirement certificate', async () => {
    let queryByTestId: any;
    const drepRetirementCertificateTx = buildMockTx({ certificates: [drepRetirementCertificate] });
    const request = {
      transaction: {
        toCore: jest.fn().mockReturnValue(drepRetirementCertificateTx)
      } as any
    } as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: { request, set: jest.fn() },
      dappInfo
    }));
    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).toBeInTheDocument();
    expect(queryByTestId('certificates')).toBeInTheDocument();
  });

  it('should display drep update certificate', async () => {
    let queryByTestId: any;
    const drepUpdateCertificateTx = buildMockTx({ certificates: [drepUpdateCertificate] });
    const request = {
      transaction: {
        toCore: jest.fn().mockReturnValue(drepUpdateCertificateTx)
      } as any
    } as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: { request, set: jest.fn() },
      dappInfo
    }));

    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).toBeInTheDocument();
    expect(queryByTestId('certificates')).toBeInTheDocument();
  });

  it('should display stake registration delegation certificate', async () => {
    let queryByTestId: any;
    const stakeRegistrationDelegationCertificateTx = buildMockTx({
      certificates: [stakeRegistrationDelegationCertificate]
    });
    const request = {
      transaction: {
        toCore: jest.fn().mockReturnValue(stakeRegistrationDelegationCertificateTx)
      } as any
    } as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: { request, set: jest.fn() },
      dappInfo
    }));

    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).toBeInTheDocument();
    expect(queryByTestId('certificates')).toBeInTheDocument();
  });

  it('should display stake vote delegation certificate', async () => {
    let queryByTestId: any;
    const stakeVoteDelegationCertificateTx = buildMockTx({ certificates: [stakeVoteDelegationCertificate] });
    const request = {
      transaction: {
        toCore: jest.fn().mockReturnValue(stakeVoteDelegationCertificateTx)
      } as any
    } as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: { request, set: jest.fn() },
      dappInfo
    }));
    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).toBeInTheDocument();
    expect(queryByTestId('certificates')).toBeInTheDocument();
  });

  it('should display stake vote registration delegation certificate', async () => {
    let queryByTestId: any;
    const stakeVoteRegistrationDelegationCertificateTx = buildMockTx({
      certificates: [stakeVoteRegistrationDelegationCertificate]
    });
    const request = {
      transaction: {
        toCore: jest.fn().mockReturnValue(stakeVoteRegistrationDelegationCertificateTx)
      } as any
    } as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: { request, set: jest.fn() },
      dappInfo
    }));
    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).toBeInTheDocument();
    expect(queryByTestId('certificates')).toBeInTheDocument();
  });

  it('should display vote delegation certificate', async () => {
    let queryByTestId: any;
    const voteDelegationCertificateTx = buildMockTx({ certificates: [voteDelegationCertificate] });
    const request = {
      transaction: {
        toCore: jest.fn().mockReturnValue(voteDelegationCertificateTx)
      } as any
    } as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: { request, set: jest.fn() },
      dappInfo
    }));
    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).toBeInTheDocument();
    expect(queryByTestId('certificates')).toBeInTheDocument();
  });

  it('should display vote registration delegation certificate', async () => {
    let queryByTestId: any;
    const voteRegistrationDelegationCertificateTx = buildMockTx({
      certificates: [voteRegistrationDelegationCertificate]
    });
    const request = {
      transaction: {
        toCore: jest.fn().mockReturnValue(voteRegistrationDelegationCertificateTx)
      } as any
    } as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: { request, set: jest.fn() },
      dappInfo
    }));
    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).toBeInTheDocument();
    expect(queryByTestId('certificates')).toBeInTheDocument();
  });

  it('should display votes', async () => {
    let queryByTestId: any;
    const votingTx = buildMockTx({
      votingProcedures: [
        {
          voter: {
            __typename: Cardano.VoterType.dRepKeyHash,
            credential: {
              type: Cardano.CredentialType.KeyHash,
              hash: mockCredentialKeyHash
            }
          },
          votes: [
            {
              actionId: {
                id: Cardano.TransactionId('724a0a88b9470a714fc5bf84daf5851fa259a9b89e1a5453f6f5cd6595ad9821'),
                actionIndex: 0
              },
              votingProcedure: {
                vote: Cardano.Vote.yes,
                anchor: {
                  url: 'anchorUrl',
                  dataHash: Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanc1').toString('hex'))
                }
              }
            }
          ]
        }
      ]
    });
    const request = {
      transaction: {
        toCore: jest.fn().mockReturnValue(votingTx)
      } as any
    } as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    mockUseViewsFlowContext.mockReset();
    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: {
        request
      },
      dappInfo
    }));

    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).toBeInTheDocument();
    expect(queryByTestId('voting-procedures')).toBeInTheDocument();
  });

  it('should render proposal procedures', async () => {
    let queryByTestId: any;
    const proposalProceduresTx = buildMockTx({
      proposalProcedures: [
        {
          anchor: {
            url: 'anchorUrl',
            dataHash: Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanc1').toString('hex'))
          },
          governanceAction: {
            __typename: Cardano.GovernanceActionType.info_action
          },
          deposit: BigInt('100000'),
          rewardAccount: REWARD_ACCOUNT
        }
      ]
    });
    const request = {
      transaction: {
        toCore: jest.fn().mockReturnValue(proposalProceduresTx)
      } as any
    } as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    mockUseViewsFlowContext.mockImplementation(() => ({
      signTxRequest: { request, set: jest.fn() },
      dappInfo
    }));
    await act(async () => {
      ({ queryByTestId } = render(<DappTransactionContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('DappTransaction')).toBeInTheDocument();
    expect(queryByTestId('proposal-procedures')).toBeInTheDocument();
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
});
