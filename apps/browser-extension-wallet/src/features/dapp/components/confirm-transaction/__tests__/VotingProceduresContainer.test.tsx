/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable unicorn/consistent-destructuring */
/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
const mockUseWalletStore = jest.fn();
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockVotingProcedures = jest.fn();
const mockPreprodCexplorerBaseUrl = 'PREPROD_CEXPLORER_BASE_URL';
const mockCexplorerUrlPathsTx = 'CEXPLORER_URL_PATHS.TX';
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { VotingProceduresContainer, getVote, getVoterType } from '../VotingProceduresContainer';
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
import { act } from 'react-dom/test-utils';
import { PostHogClientProvider } from '@providers/PostHogClientProvider';
import { postHogClientMocks } from '@src/utils/mocks/test-helpers';
import { buildMockTx } from '@src/utils/mocks/tx';
import { Wallet } from '@lace/cardano';

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

describe('Testing VotingProceduresContainer component', () => {
  beforeEach(() => {
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      environmentName: 'Preprod'
    }));
    mockVotingProcedures.mockReset();
    mockVotingProcedures.mockReturnValue(<span data-testid="VotingProcedures" />);
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
  const tx = buildMockTx();
  const errorMessage = 'errorMessage';
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

  const props = { signTxData: { dappInfo, tx: { ...tx, body: { ...tx.body, votingProcedures } } }, errorMessage };

  test('should render VotingProcedures component with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(<VotingProceduresContainer {...props} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('VotingProcedures')).toBeInTheDocument();
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const getExpectedDrepId = (type: string) => (hash: Wallet.Crypto.Hash28ByteBase16) =>
      type === 'DRep'
        ? Wallet.Cardano.DRepID(Wallet.HexBlob.toTypedBech32('drep', Wallet.HexBlob(hash)))
        : hash.toString();
    expect(mockVotingProcedures).toHaveBeenLastCalledWith(
      {
        dappInfo,
        data: voters.map(({ __typename }, index) => ({
          voter: {
            type: getVoterType(__typename),
            dRepId: getExpectedDrepId(getVoterType(__typename))(voters[index].credential.hash)
          },
          votes: votingProcedures[index].votes.map((vote) => ({
            actionId: {
              index: vote.actionId.actionIndex,
              txHash: vote.actionId.id.toString(),
              txHashUrl: `${mockPreprodCexplorerBaseUrl}/${mockCexplorerUrlPathsTx}/${vote.actionId.id}`
            },
            votingProcedure: {
              vote: getVote(vote.votingProcedure.vote),
              anchor: !!vote.votingProcedure.anchor?.url && {
                url: vote.votingProcedure.anchor?.url,
                hash: vote.votingProcedure.anchor?.dataHash.toString()
              }
            }
          }))
        })),
        translations: {
          voterType: t('core.votingProcedures.voterType'),
          procedureTitle: t('core.votingProcedures.procedureTitle'),
          actionIdTitle: t('core.votingProcedures.actionIdTitle'),
          vote: t('core.votingProcedures.vote'),
          actionId: {
            index: t('core.votingProcedures.actionId.index'),
            txHash: t('core.votingProcedures.actionId.txHash')
          },
          anchor: {
            hash: t('core.votingProcedures.anchor.hash'),
            url: t('core.votingProcedures.anchor.url')
          },
          dRepId: t('core.votingProcedures.dRepId')
        },
        errorMessage
      },
      {}
    );
  });

  test('should render VotingProcedures with no txHashUrl for Sanchonet network', async () => {
    let queryByTestId: any;
    mockUseWalletStore.mockReset();
    mockUseWalletStore.mockImplementation(() => ({
      environmentName: 'Sanchonet'
    }));
    await act(async () => {
      ({ queryByTestId } = render(<VotingProceduresContainer {...props} />, {
        wrapper: getWrapper()
      }));
    });

    expect(queryByTestId('VotingProcedures')).toBeInTheDocument();
    const lastCockVotingProceduresCallParams =
      mockVotingProcedures.mock.calls[mockVotingProcedures.mock.calls.length - 1][0];

    let txHashUrls: Array<string> = [];

    for (const data of lastCockVotingProceduresCallParams.data) {
      txHashUrls = [
        ...txHashUrls,
        ...data.votes.map(({ actionId: { txHashUrl } }: { actionId: { txHashUrl?: string } }) => txHashUrl)
      ];
    }

    expect(txHashUrls.filter((e) => !!e).length).toEqual(0);
  });

  test('testing getVoterType', () => {
    expect(getVoterType(constitutionalCommitteeKeyHashVoter.__typename)).toEqual('Constitutional Committee');
    expect(getVoterType(constitutionalCommitteeScriptHashVoter.__typename)).toEqual('Constitutional Committee');
    expect(getVoterType(drepKeyHashVoter.__typename)).toEqual('DRep');
    expect(getVoterType(drepScriptHashVoter.__typename)).toEqual('DRep');
    expect(getVoterType(stakePoolKeyHashVoter.__typename)).toEqual('SPO');
  });

  test('testing getVote', () => {
    expect(getVote(Wallet.Cardano.Vote.yes)).toEqual('Yes');
    expect(getVote(Wallet.Cardano.Vote.no)).toEqual('No');
    expect(getVote(Wallet.Cardano.Vote.abstain)).toEqual('Abstain');
  });
});
