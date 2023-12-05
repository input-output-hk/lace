/* eslint-disable unicorn/no-null */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/imports-first */
import { Wallet } from '@lace/cardano';

const mockSkeleton = jest.fn(() => <span data-testid="skeleton" />);
const mockConfirmDRepRegistrationContainer = jest.fn(() => <span data-testid="ConfirmDRepRegistrationContainer" />);
const mockConfirmDRepRetirementContainer = jest.fn(() => <span data-testid="ConfirmDRepRetirementContainer" />);
const mockConfirmDRepUpdateContainer = jest.fn(() => <span data-testid="ConfirmDRepUpdateContainer" />);
const mockConfirmVoteDelegationContainer = jest.fn(() => <span data-testid="ConfirmVoteDelegationContainer" />);
const mockVotingProceduresContainer = jest.fn(() => <span data-testid="VotingProceduresContainer" />);
const mockProposalProceduresContainer = jest.fn(() => <span data-testid="ProposalProceduresContainer" />);
const mockDappTransactionContainer = jest.fn(() => <span data-testid="DappTransactionContainer" />);
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { ConfirmTransactionContent } from '../ConfirmTransactionContent';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import { buildMockTx } from '@src/utils/mocks/tx';

jest.mock('antd', () => {
  const original = jest.requireActual('antd');
  return {
    __esModule: true,
    ...original,
    Skeleton: mockSkeleton
  };
});

jest.mock('../ConfirmDRepRegistrationContainer', () => {
  const original = jest.requireActual('../ConfirmDRepRegistrationContainer');
  return {
    __esModule: true,
    ...original,
    ConfirmDRepRegistrationContainer: mockConfirmDRepRegistrationContainer
  };
});

jest.mock('../ConfirmDRepRetirementContainer', () => {
  const original = jest.requireActual('../ConfirmDRepRetirementContainer');
  return {
    __esModule: true,
    ...original,
    ConfirmDRepRetirementContainer: mockConfirmDRepRetirementContainer
  };
});

jest.mock('../ConfirmDRepUpdateContainer', () => {
  const original = jest.requireActual('../ConfirmDRepUpdateContainer');
  return {
    __esModule: true,
    ...original,
    ConfirmDRepUpdateContainer: mockConfirmDRepUpdateContainer
  };
});

jest.mock('../ConfirmVoteDelegationContainer', () => {
  const original = jest.requireActual('../ConfirmVoteDelegationContainer');
  return {
    __esModule: true,
    ...original,
    ConfirmVoteDelegationContainer: mockConfirmVoteDelegationContainer
  };
});

jest.mock('../VotingProceduresContainer', () => {
  const original = jest.requireActual('../VotingProceduresContainer');
  return {
    __esModule: true,
    ...original,
    VotingProceduresContainer: mockVotingProceduresContainer
  };
});

jest.mock('../ProposalProceduresContainer', () => {
  const original = jest.requireActual('../ProposalProceduresContainer');
  return {
    __esModule: true,
    ...original,
    ProposalProceduresContainer: mockProposalProceduresContainer
  };
});

jest.mock('../DappTransactionContainer', () => {
  const original = jest.requireActual('../DappTransactionContainer');
  return {
    __esModule: true,
    ...original,
    DappTransactionContainer: mockDappTransactionContainer
  };
});

const dappInfo = {
  name: 'dappName',
  logo: 'dappLogo',
  url: 'dappUrl'
};
const errorMessage = 'errorMessage';
const props = { signTxData: { dappInfo, tx: buildMockTx() }, errorMessage };

describe('Testing ConfirmTransactionContent component', () => {
  afterEach(() => {
    cleanup();
  });

  test('should render loader placeholder if there is no signTxData', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(<ConfirmTransactionContent />));
    });

    expect(queryByTestId('skeleton')).toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRegistrationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRetirementContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepUpdateContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmVoteDelegationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('VotingProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ProposalProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('DappTransactionContainer')).not.toBeInTheDocument();
    expect(mockSkeleton).toHaveBeenLastCalledWith({ loading: true }, {});
  });

  test('should render ConfirmDRepRegistrationContainer with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(
        <ConfirmTransactionContent {...{ ...props, txType: Wallet.Cip30TxType.DRepRegistration }} />
      ));
    });

    expect(queryByTestId('skeleton')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRegistrationContainer')).toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRetirementContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepUpdateContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmVoteDelegationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('VotingProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ProposalProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('DappTransactionContainer')).not.toBeInTheDocument();
    expect(mockConfirmDRepRegistrationContainer).toHaveBeenLastCalledWith(props, {});
  });

  test('should render ConfirmDRepRetirementContainer with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(
        <ConfirmTransactionContent {...{ txType: Wallet.Cip30TxType.DRepRetirement, ...props }} />
      ));
    });

    expect(queryByTestId('skeleton')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRegistrationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRetirementContainer')).toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepUpdateContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmVoteDelegationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('VotingProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ProposalProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('DappTransactionContainer')).not.toBeInTheDocument();
    expect(mockConfirmDRepRetirementContainer).toHaveBeenLastCalledWith(props, {});
  });

  test('should render ConfirmDRepUpdateContainer with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(
        <ConfirmTransactionContent {...{ txType: Wallet.Cip30TxType.DRepUpdate, ...props }} />
      ));
    });

    expect(queryByTestId('skeleton')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRegistrationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRetirementContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepUpdateContainer')).toBeInTheDocument();
    expect(queryByTestId('ConfirmVoteDelegationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('VotingProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ProposalProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('DappTransactionContainer')).not.toBeInTheDocument();
    expect(mockConfirmDRepUpdateContainer).toHaveBeenLastCalledWith(props, {});
  });

  test('should render ConfirmVoteDelegationContainer with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(
        <ConfirmTransactionContent {...{ txType: Wallet.Cip30TxType.VoteDelegation, ...props }} />
      ));
    });

    expect(queryByTestId('skeleton')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRegistrationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRetirementContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepUpdateContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmVoteDelegationContainer')).toBeInTheDocument();
    expect(queryByTestId('VotingProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ProposalProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('DappTransactionContainer')).not.toBeInTheDocument();
    expect(mockConfirmVoteDelegationContainer).toHaveBeenLastCalledWith(props, {});
  });

  test('should render VotingProceduresContainer with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(
        <ConfirmTransactionContent {...{ txType: Wallet.Cip30TxType.VotingProcedures, ...props }} />
      ));
    });

    expect(queryByTestId('skeleton')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRegistrationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRetirementContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepUpdateContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmVoteDelegationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('VotingProceduresContainer')).toBeInTheDocument();
    expect(queryByTestId('ProposalProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('DappTransactionContainer')).not.toBeInTheDocument();
    expect(mockVotingProceduresContainer).toHaveBeenLastCalledWith(props, {});
  });

  test('should render ProposalProceduresContainer with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(
        <ConfirmTransactionContent {...{ txType: Wallet.Cip30TxType.ProposalProcedures, ...props }} />
      ));
    });

    expect(queryByTestId('skeleton')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRegistrationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRetirementContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepUpdateContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmVoteDelegationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('VotingProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ProposalProceduresContainer')).toBeInTheDocument();
    expect(queryByTestId('DappTransactionContainer')).not.toBeInTheDocument();
    expect(mockProposalProceduresContainer).toHaveBeenLastCalledWith(props, {});
  });

  test('should render DappTransactionContainer with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(
        <ConfirmTransactionContent {...{ txType: 'other' as Wallet.Cip30TxType, ...props }} />
      ));
    });

    expect(queryByTestId('skeleton')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRegistrationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepRetirementContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmDRepUpdateContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ConfirmVoteDelegationContainer')).not.toBeInTheDocument();
    expect(queryByTestId('VotingProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('ProposalProceduresContainer')).not.toBeInTheDocument();
    expect(queryByTestId('DappTransactionContainer')).toBeInTheDocument();
    expect(mockDappTransactionContainer).toHaveBeenLastCalledWith(props, {});
  });
});
