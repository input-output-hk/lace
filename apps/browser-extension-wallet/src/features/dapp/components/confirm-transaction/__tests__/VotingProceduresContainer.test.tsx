/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable unicorn/consistent-destructuring */
/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockUseWalletStore = jest.fn();
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockVotingProcedures = jest.fn();
const mockNonRegisteredUserModal = jest.fn();
const mockUseDisallowSignTx = jest.fn();
const mockPreprodCexplorerBaseUrl = 'PREPROD_CEXPLORER_BASE_URL';
const mockCexplorerUrlPathsTx = 'CEXPLORER_URL_PATHS.TX';
import * as React from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { VotingProceduresContainer } from '../VotingProceduresContainer';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import { buildMockTx } from '@src/utils/mocks/tx';
import { Wallet } from '@lace/cardano';
import { getWrapper } from '../testing.utils';
import { getVoterType, getVote, VoterTypeEnum, VotesEnum } from '@src/utils/tx-inspection';
import { drepIDasBech32FromHash } from '../utils';
import { TransactionWitnessRequest } from '@cardano-sdk/web-extension';
import { of } from 'rxjs';

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('@src/config', () => {
  const original = jest.requireActual<any>('@src/config');
  return {
    ...original,
    config: () => ({
      ...original.config(),
      CEXPLORER_BASE_URL: { Preprod: mockPreprodCexplorerBaseUrl },
      CEXPLORER_URL_PATHS: { Tx: mockCexplorerUrlPathsTx }
    })
  };
});

jest.mock('@lace/core', () => {
  const original = jest.requireActual('@lace/core');
  return {
    __esModule: true,
    ...original,
    VotingProcedures: mockVotingProcedures
  };
});

jest.mock('../NonRegisteredUserModal/NonRegisteredUserModal', () => {
  const original = jest.requireActual('../NonRegisteredUserModal/NonRegisteredUserModal');
  return {
    __esModule: true,
    ...original,
    NonRegisteredUserModal: mockNonRegisteredUserModal
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

jest.mock('../hooks', () => {
  const original = jest.requireActual('../hooks');
  return {
    __esModule: true,
    ...original,
    useDisallowSignTx: mockUseDisallowSignTx
  };
});

const dappInfo = {
  name: 'dappName',
  logo: 'dappLogo',
  url: 'dappUrl'
};
const tx = buildMockTx();
const constitutionalCommitteeKeyHashVoter: Wallet.Cardano.ConstitutionalCommitteeKeyHashVoter = {
  __typename: Wallet.Cardano.VoterType.ccHotKeyHash,
  credential: {
    type: Wallet.Cardano.CredentialType.KeyHash,
    hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'))
  }
};
const constitutionalCommitteeScriptHashVoter: Wallet.Cardano.ConstitutionalCommitteeScriptHashVoter = {
  __typename: Wallet.Cardano.VoterType.ccHotScriptHash,
  credential: {
    type: Wallet.Cardano.CredentialType.ScriptHash,
    hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'))
  }
};
const drepKeyHashVoter: Wallet.Cardano.DrepKeyHashVoter = {
  __typename: Wallet.Cardano.VoterType.dRepKeyHash,
  credential: {
    type: Wallet.Cardano.CredentialType.KeyHash,
    hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'))
  }
};
const drepScriptHashVoter: Wallet.Cardano.DrepScriptHashVoter = {
  __typename: Wallet.Cardano.VoterType.dRepScriptHash,
  credential: {
    type: Wallet.Cardano.CredentialType.ScriptHash,
    hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'))
  }
};
const stakePoolKeyHashVoter: Wallet.Cardano.StakePoolKeyHashVoter = {
  __typename: Wallet.Cardano.VoterType.stakePoolKeyHash,
  credential: {
    type: Wallet.Cardano.CredentialType.KeyHash,
    hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCreden').toString('hex'))
  }
};

const voters = [
  constitutionalCommitteeKeyHashVoter,
  constitutionalCommitteeScriptHashVoter,
  drepKeyHashVoter,
  drepScriptHashVoter,
  stakePoolKeyHashVoter
];

const votes = [
  Wallet.Cardano.Vote.yes,
  Wallet.Cardano.Vote.no,
  Wallet.Cardano.Vote.abstain,
  Wallet.Cardano.Vote.yes,
  Wallet.Cardano.Vote.no
];

const votingProcedures = voters.map((voter, index) => ({
  voter,
  votes: [
    {
      actionId: {
        id: Wallet.Cardano.TransactionId(`724a0a88b9470a714fc5bf84daf5851fa259a9b89e1a5453f6f5cd6595ad982${index}`),
        actionIndex: 0
      },
      votingProcedure: {
        vote: votes[index],
        ...(index && {
          anchor: {
            url: `anchorUrl${index}`,
            dataHash: Wallet.Crypto.Hash32ByteBase16(
              Buffer.from(`anchorDataHashanchorDataHashanc${index}`).toString('hex')
            )
          }
        })
      }
    }
  ]
}));

const request = {
  transaction: {
    toCore: jest.fn().mockReturnValue({ ...tx, body: { ...tx.body, votingProcedures } })
  } as any
} as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

jest.mock('@providers', () => ({
  ...jest.requireActual<any>('@providers'),
  useViewsFlowContext: () => ({
    signTxRequest: { request },
    dappInfo
  })
}));

describe('Testing VotingProceduresContainer component', () => {
  beforeEach(() => {
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      environmentName: 'Preprod',
      inMemoryWallet: {
        governance: {}
      }
    }));
    mockVotingProcedures.mockReset();
    mockVotingProcedures.mockReturnValue(<span data-testid="VotingProcedures" />);
    mockNonRegisteredUserModal.mockReset();
    mockNonRegisteredUserModal.mockReturnValue(<span data-testid="NonRegisteredUserModal" />);
    mockUseTranslation.mockReset();
    mockUseTranslation.mockImplementation(() => ({ t }));
  });

  afterEach(() => {
    cleanup();
  });

  test('should render VotingProcedures component with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(<VotingProceduresContainer />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('VotingProcedures')).toBeInTheDocument();
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const getExpectedDrepId = (type: string) => (hash: Wallet.Crypto.Hash28ByteBase16) =>
      type === VoterTypeEnum.DREP ? drepIDasBech32FromHash(hash) : hash.toString();
    expect(mockVotingProcedures).toHaveBeenLastCalledWith(
      {
        dappInfo,
        data: voters.map(({ __typename }, index) => ({
          voter: {
            type: t(`core.VotingProcedures.voterTypes.${getVoterType(__typename)}`),
            dRepId: getExpectedDrepId(getVoterType(__typename))(voters[index].credential.hash)
          },
          votes: votingProcedures[index].votes.map((vote) => ({
            actionId: {
              index: vote.actionId.actionIndex,
              txHash: vote.actionId.id.toString(),
              txHashUrl: `${mockPreprodCexplorerBaseUrl}/${mockCexplorerUrlPathsTx}/${vote.actionId.id}`
            },
            votingProcedure: {
              vote: t(`core.VotingProcedures.votes.${getVote(vote.votingProcedure.vote)}`),
              anchor: !!vote.votingProcedure.anchor?.url && {
                url: vote.votingProcedure.anchor?.url,
                hash: vote.votingProcedure.anchor?.dataHash.toString()
              }
            }
          }))
        })),
        translations: {
          voterType: t('core.VotingProcedures.voterType'),
          procedureTitle: t('core.VotingProcedures.procedureTitle'),
          actionIdTitle: t('core.VotingProcedures.actionIdTitle'),
          vote: t('core.VotingProcedures.vote'),
          actionId: {
            index: t('core.VotingProcedures.actionId.index'),
            txHash: t('core.VotingProcedures.actionId.txHash')
          },
          anchor: {
            hash: t('core.VotingProcedures.anchor.hash'),
            url: t('core.VotingProcedures.anchor.url')
          },
          dRepId: t('core.VotingProcedures.dRepId')
        }
      },
      {}
    );
  });

  test('should handle NonRegisteredUserModal onConfirm', async () => {
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      environmentName: 'Preprod',
      inMemoryWallet: {
        governance: {
          isRegisteredAsDRep$: of(true)
        }
      }
    }));

    await act(async () => {
      render(<VotingProceduresContainer />, {
        wrapper: getWrapper()
      });
    });

    expect(mockNonRegisteredUserModal.mock.calls[mockNonRegisteredUserModal.mock.calls.length - 1][0].visible).toEqual(
      true
    );

    await act(async () => {
      mockNonRegisteredUserModal.mock.calls[mockNonRegisteredUserModal.mock.calls.length - 1][0].onConfirm();
    });

    await waitFor(async () => {
      expect(
        mockNonRegisteredUserModal.mock.calls[mockNonRegisteredUserModal.mock.calls.length - 1][0].visible
      ).toEqual(false);
    });
  });

  test('should handle NonRegisteredUserModal onClose', async () => {
    const disallowSignTxMock = jest.fn();
    mockUseDisallowSignTx.mockReset();
    mockUseDisallowSignTx.mockReturnValue(disallowSignTxMock);
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      environmentName: 'Preprod',
      inMemoryWallet: {
        governance: {
          isRegisteredAsDRep$: of(false)
        }
      }
    }));

    await act(async () => {
      render(<VotingProceduresContainer />, {
        wrapper: getWrapper()
      });
    });

    expect(disallowSignTxMock).not.toHaveBeenCalled();

    await act(async () => {
      mockNonRegisteredUserModal.mock.calls[mockNonRegisteredUserModal.mock.calls.length - 1][0].onClose();
    });

    expect(disallowSignTxMock).toHaveBeenCalledWith(true);
  });

  test('testing getVoterType', () => {
    expect(getVoterType(constitutionalCommitteeKeyHashVoter.__typename)).toEqual(
      VoterTypeEnum.CONSTITUTIONAL_COMMITTEE
    );
    expect(getVoterType(constitutionalCommitteeScriptHashVoter.__typename)).toEqual(
      VoterTypeEnum.CONSTITUTIONAL_COMMITTEE
    );
    expect(getVoterType(drepKeyHashVoter.__typename)).toEqual(VoterTypeEnum.DREP);
    expect(getVoterType(drepScriptHashVoter.__typename)).toEqual(VoterTypeEnum.DREP);
    expect(getVoterType(stakePoolKeyHashVoter.__typename)).toEqual(VoterTypeEnum.SPO);
  });

  test('testing getVote', () => {
    expect(getVote(Wallet.Cardano.Vote.yes)).toEqual(VotesEnum.YES);
    expect(getVote(Wallet.Cardano.Vote.no)).toEqual(VotesEnum.NO);
    expect(getVote(Wallet.Cardano.Vote.abstain)).toEqual(VotesEnum.ABSTAIN);
  });
});
