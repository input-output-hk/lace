/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
/* eslint-disable import/imports-first */
const mockHardForkInitiationActionContainer = jest.fn(() => <span data-testid="HardForkInitiationActionContainer" />);
const mockInfoActionContainer = jest.fn(() => <span data-testid="InfoActionContainer" />);
const mockNewConstitutionActionContainer = jest.fn(() => <span data-testid="NewConstitutionActionContainer" />);
const mockNoConfidenceActionContainer = jest.fn(() => <span data-testid="NoConfidenceActionContainer" />);
const mockParameterChangeActionContainer = jest.fn(() => <span data-testid="ParameterChangeActionContainer" />);
const mockTreasuryWithdrawalsActionContainer = jest.fn(() => <span data-testid="TreasuryWithdrawalsActionContainer" />);
const mockUpdateCommitteeActionContainer = jest.fn(() => <span data-testid="UpdateCommitteeActionContainer" />);
import { Wallet } from '@lace/cardano';
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { ProposalProceduresContainer } from '../ProposalProceduresContainer';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import { buildMockTx } from '@src/utils/mocks/tx';
import { TransactionWitnessRequest } from '@cardano-sdk/web-extension';

jest.mock('../proposal-procedures/HardForkInitiationActionContainer', () => {
  const original = jest.requireActual('../proposal-procedures/HardForkInitiationActionContainer');
  return {
    __esModule: true,
    ...original,
    HardForkInitiationActionContainer: mockHardForkInitiationActionContainer
  };
});

jest.mock('../proposal-procedures/InfoActionContainer', () => {
  const original = jest.requireActual('../proposal-procedures/InfoActionContainer');
  return {
    __esModule: true,
    ...original,
    InfoActionContainer: mockInfoActionContainer
  };
});

jest.mock('../proposal-procedures/NewConstitutionActionContainer', () => {
  const original = jest.requireActual('../proposal-procedures/NewConstitutionActionContainer');
  return {
    __esModule: true,
    ...original,
    NewConstitutionActionContainer: mockNewConstitutionActionContainer
  };
});

jest.mock('../proposal-procedures/NoConfidenceActionContainer', () => {
  const original = jest.requireActual('../proposal-procedures/NoConfidenceActionContainer');
  return {
    __esModule: true,
    ...original,
    NoConfidenceActionContainer: mockNoConfidenceActionContainer
  };
});

jest.mock('../proposal-procedures/ParameterChangeActionContainer', () => {
  const original = jest.requireActual('../proposal-procedures/ParameterChangeActionContainer');
  return {
    __esModule: true,
    ...original,
    ParameterChangeActionContainer: mockParameterChangeActionContainer
  };
});

jest.mock('../proposal-procedures/TreasuryWithdrawalsActionContainer', () => {
  const original = jest.requireActual('../proposal-procedures/TreasuryWithdrawalsActionContainer');
  return {
    __esModule: true,
    ...original,
    TreasuryWithdrawalsActionContainer: mockTreasuryWithdrawalsActionContainer
  };
});

jest.mock('../proposal-procedures/UpdateCommitteeActionContainer', () => {
  const original = jest.requireActual('../proposal-procedures/UpdateCommitteeActionContainer');
  return {
    __esModule: true,
    ...original,
    UpdateCommitteeActionContainer: mockUpdateCommitteeActionContainer
  };
});

const dappInfo = {
  name: 'dappName',
  logo: 'dappLogo',
  url: 'dappUrl'
};
const tx = buildMockTx();
const deposit = BigInt('10000');
const rewardAccount = Wallet.Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj');
const anchor = {
  url: 'anchorUrl',
  dataHash: Wallet.Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex'))
};

const hardForkInitiationAction = {
  __typename: Wallet.Cardano.GovernanceActionType.hard_fork_initiation_action
} as Wallet.Cardano.HardForkInitiationAction;
const infoAction = {
  __typename: Wallet.Cardano.GovernanceActionType.info_action
} as Wallet.Cardano.InfoAction;
const newConstitution = {
  __typename: Wallet.Cardano.GovernanceActionType.new_constitution
} as Wallet.Cardano.NewConstitution;
const noConfidence = {
  __typename: Wallet.Cardano.GovernanceActionType.no_confidence
} as Wallet.Cardano.NoConfidence;
const parameterChangeAction = {
  __typename: Wallet.Cardano.GovernanceActionType.parameter_change_action
} as Wallet.Cardano.ParameterChangeAction;
const treasuryWithdrawalsAction = {
  __typename: Wallet.Cardano.GovernanceActionType.treasury_withdrawals_action
} as Wallet.Cardano.TreasuryWithdrawalsAction;
const updateCommittee = {
  __typename: Wallet.Cardano.GovernanceActionType.update_committee
} as Wallet.Cardano.UpdateCommittee;

const proposalProcedures = [
  { deposit, rewardAccount, anchor, governanceAction: hardForkInitiationAction },
  { deposit, rewardAccount, anchor, governanceAction: infoAction },
  { deposit, rewardAccount, anchor, governanceAction: newConstitution },
  { deposit, rewardAccount, anchor, governanceAction: noConfidence },
  { deposit, rewardAccount, anchor, governanceAction: parameterChangeAction },
  { deposit, rewardAccount, anchor, governanceAction: treasuryWithdrawalsAction },
  { deposit, rewardAccount, anchor, governanceAction: updateCommittee }
];

const request = {
  transaction: {
    toCore: jest.fn().mockReturnValue({ ...tx, body: { ...tx.body, proposalProcedures } })
  } as any
} as TransactionWitnessRequest<Wallet.WalletMetadata, Wallet.AccountMetadata>;

jest.mock('@providers', () => ({
  ...jest.requireActual<any>('@providers'),
  useViewsFlowContext: () => ({
    signTxRequest: { request },
    dappInfo
  })
}));

describe('Testing ProposalProceduresContainer component', () => {
  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  test('should render proper procedure', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(<ProposalProceduresContainer />));
    });

    expect(queryByTestId('HardForkInitiationActionContainer')).toBeInTheDocument();
    expect(queryByTestId('InfoActionContainer')).toBeInTheDocument();
    expect(queryByTestId('NewConstitutionActionContainer')).toBeInTheDocument();
    expect(queryByTestId('NoConfidenceActionContainer')).toBeInTheDocument();
    expect(queryByTestId('ParameterChangeActionContainer')).toBeInTheDocument();
    expect(queryByTestId('TreasuryWithdrawalsActionContainer')).toBeInTheDocument();
    expect(queryByTestId('UpdateCommitteeActionContainer')).toBeInTheDocument();

    const expectedProps = { deposit, rewardAccount, anchor };

    expect(mockHardForkInitiationActionContainer).toHaveBeenLastCalledWith(
      { ...expectedProps, governanceAction: hardForkInitiationAction },
      {}
    );
    expect(mockInfoActionContainer).toHaveBeenLastCalledWith({ ...expectedProps, governanceAction: infoAction }, {});
    expect(mockNewConstitutionActionContainer).toHaveBeenLastCalledWith(
      { ...expectedProps, governanceAction: newConstitution },
      {}
    );
    expect(mockNoConfidenceActionContainer).toHaveBeenLastCalledWith(
      { ...expectedProps, governanceAction: noConfidence },
      {}
    );
    expect(mockParameterChangeActionContainer).toHaveBeenLastCalledWith(
      { ...expectedProps, governanceAction: parameterChangeAction },
      {}
    );
    expect(mockTreasuryWithdrawalsActionContainer).toHaveBeenLastCalledWith(
      { ...expectedProps, governanceAction: treasuryWithdrawalsAction },
      {}
    );
    expect(mockUpdateCommitteeActionContainer).toHaveBeenLastCalledWith(
      { ...expectedProps, governanceAction: updateCommittee },
      {}
    );
  });
});
