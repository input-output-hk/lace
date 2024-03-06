/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
/* eslint-disable import/imports-first */
const cardanoCoinMock = {
  symbol: 'cardanoCoinMockSymbol',
  name: 'Cardano'
};
const mockUseWalletStore = jest.fn(() => ({
  walletUI: { cardanoCoin: cardanoCoinMock },
  walletInfo: {}
}));
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockUpdateCommitteeAction = jest.fn(() => <span data-testid="UpdateCommitteeAction" />);
const mockLovelacesToAdaString = jest.fn((val) => val);
const mockedCExpolorerBaseUrl = 'mockedCExpolorerBaseUrl';
const mockuseCexplorerBaseUrl = jest.fn(() => mockedCExpolorerBaseUrl);
import { Wallet } from '@lace/cardano';
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import { UpdateCommitteeActionContainer } from '../UpdateCommitteeActionContainer';
import { getWrapper } from '../../testing.utils';
import { depositPaidWithSymbol } from '../../utils';

jest.mock('react-i18next', () => {
  const original = jest.requireActual('react-i18next');
  return {
    __esModule: true,
    ...original,
    useTranslation: mockUseTranslation
  };
});

jest.mock('@lace/core', () => {
  const original = jest.requireActual('@lace/core');
  return {
    __esModule: true,
    ...original,
    UpdateCommitteeAction: mockUpdateCommitteeAction
  };
});

jest.mock('@src/stores', () => ({
  ...jest.requireActual<any>('@src/stores'),
  useWalletStore: mockUseWalletStore
}));

jest.mock('../../hooks', () => {
  const original = jest.requireActual('../../hooks');
  return {
    __esModule: true,
    ...original,
    useCexplorerBaseUrl: mockuseCexplorerBaseUrl
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

const dappInfo = {
  name: 'dappName',
  logo: 'dappLogo',
  url: 'dappUrl'
};
const errorMessage = 'errorMessage';
const deposit = BigInt('10000');
const rewardAccount = Wallet.Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj');
const anchor = {
  url: 'anchorUrl',
  dataHash: Wallet.Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex'))
};

const updateCommittee = {
  membersToBeAdded: new Set([
    {
      coldCredential: {
        type: 0,
        hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('updateCommitteecoldCredenti1').toString('hex'))
      },
      epoch: 1
    },
    {
      coldCredential: {
        type: 1,
        hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('updateCommitteecoldCredenti2').toString('hex'))
      },
      epoch: 2
    }
  ]),
  membersToBeRemoved: new Set([
    {
      type: 0,
      hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('updateCommitteecoldCredenti2').toString('hex'))
    },
    {
      type: 1,
      hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('updateCommitteecoldCredenti3').toString('hex'))
    }
  ]),
  governanceActionId: {
    actionIndex: 123,
    id: Wallet.Cardano.TransactionId('724a0a88b9470a714fc5bf84daf5851fa259a9b89e1a5453f6f5cd6595ad9821')
  },
  __typename: Wallet.Cardano.GovernanceActionType.update_committee
} as Wallet.Cardano.UpdateCommittee;

describe('Testing ProposalProceduresContainer component', () => {
  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  test('should render UpdateCommitteeAction component with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(
        <UpdateCommitteeActionContainer
          {...{ errorMessage, dappInfo, deposit, rewardAccount, anchor, governanceAction: updateCommittee }}
        />,
        {
          wrapper: getWrapper()
        }
      ));
    });

    expect(queryByTestId('UpdateCommitteeAction')).toBeInTheDocument();
    expect(mockUpdateCommitteeAction).toHaveBeenLastCalledWith(
      {
        dappInfo,
        data: {
          txDetails: {
            txType: t('core.ProposalProcedure.governanceAction.updateCommitteeAction.title'),
            deposit: depositPaidWithSymbol(deposit, cardanoCoinMock as Wallet.CoinId),
            rewardAccount
          },
          procedure: {
            anchor: {
              url: anchor.url,
              hash: anchor.dataHash,
              txHashUrl: `${mockedCExpolorerBaseUrl}/${anchor.dataHash}`
            }
          },
          actionId: {
            index: updateCommittee.governanceActionId.actionIndex.toString(),
            id: updateCommittee.governanceActionId.id || ''
          },
          membersToBeAdded: [...updateCommittee.membersToBeAdded].map(({ coldCredential: { hash }, epoch }) => ({
            coldCredential: {
              hash: hash.toString()
            },
            epoch: epoch.toString()
          })),
          membersToBeRemoved: [...updateCommittee.membersToBeRemoved].map(({ hash }) => ({ hash: hash.toString() }))
        },
        translations: {
          txDetails: {
            title: t('core.ProposalProcedure.txDetails.title'),
            txType: t('core.ProposalProcedure.txDetails.txType'),
            deposit: t('core.ProposalProcedure.txDetails.deposit'),
            rewardAccount: t('core.ProposalProcedure.txDetails.rewardAccount')
          },
          procedure: {
            title: t('core.ProposalProcedure.procedure.title'),
            anchor: {
              url: t('core.ProposalProcedure.procedure.anchor.url'),
              hash: t('core.ProposalProcedure.procedure.anchor.hash')
            }
          },
          actionId: {
            title: t('core.ProposalProcedure.governanceAction.actionId.title'),
            index: t('core.ProposalProcedure.governanceAction.actionId.index'),
            txId: t('core.ProposalProcedure.governanceAction.actionId.txId')
          },
          membersToBeAdded: {
            title: t('core.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeAdded.title'),
            coldCredential: {
              hash: t(
                'core.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeAdded.coldCredential.hash'
              ),
              epoch: t(
                'core.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeAdded.coldCredential.epoch'
              )
            }
          },
          membersToBeRemoved: {
            title: t('core.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeRemoved.title'),
            hash: t('core.ProposalProcedure.governanceAction.updateCommitteeAction.membersToBeRemoved.hash')
          }
        },
        errorMessage
      },
      {}
    );
  });
});
