/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-magic-numbers */
/* eslint-disable import/imports-first */
const t = jest.fn().mockImplementation((res) => res);
const mockUseTranslation = jest.fn(() => ({ t }));
const mockInfoAction = jest.fn(() => <span data-testid="InfoAction" />);
const mockedCExpolorerBaseUrl = 'mockedCExpolorerBaseUrl';
const mockuseCexplorerBaseUrl = jest.fn(() => mockedCExpolorerBaseUrl);
import { Wallet } from '@lace/cardano';
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import { InfoActionContainer } from '../InfoActionContainer';
import { getWrapper } from '../../testing.utils';
import { mockProposalProcedure } from '@lace/core';

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
    InfoAction: mockInfoAction
  };
});

jest.mock('../../hooks', () => {
  const original = jest.requireActual('../../hooks');
  return {
    __esModule: true,
    ...original,
    useCexplorerBaseUrl: mockuseCexplorerBaseUrl
  };
});

const infoActionMock = mockProposalProcedure[Wallet.Cardano.GovernanceActionType.info_action];
const { deposit, rewardAccount, anchor, governanceAction: infoAction } = infoActionMock;

describe('Testing ProposalProceduresContainer component', () => {
  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  test('should render InfoAction component with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(
        <InfoActionContainer {...{ deposit, rewardAccount, anchor, governanceAction: infoAction }} />,
        {
          wrapper: getWrapper()
        }
      ));
    });

    expect(queryByTestId('InfoAction')).toBeInTheDocument();
    expect(mockInfoAction).toHaveBeenLastCalledWith(
      {
        data: {
          txDetails: {},
          procedure: {
            anchor: {
              url: anchor.url,
              hash: anchor.dataHash,
              txHashUrl: `${mockedCExpolorerBaseUrl}/${anchor.dataHash}`
            }
          }
        }
      },
      {}
    );
  });
});
