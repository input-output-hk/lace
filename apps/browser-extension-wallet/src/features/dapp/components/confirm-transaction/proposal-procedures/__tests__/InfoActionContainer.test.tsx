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

const infoAction = {
  __typename: Wallet.Cardano.GovernanceActionType.info_action
} as Wallet.Cardano.InfoAction;

describe('Testing ProposalProceduresContainer component', () => {
  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  test('should render InfoAction component with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(
        <InfoActionContainer
          {...{ errorMessage, dappInfo, deposit, rewardAccount, anchor, governanceAction: infoAction }}
        />,
        {
          wrapper: getWrapper()
        }
      ));
    });

    expect(queryByTestId('InfoAction')).toBeInTheDocument();
    expect(mockInfoAction).toHaveBeenLastCalledWith(
      {
        dappInfo,
        data: {
          txDetails: {
            txType: t('core.ProposalProcedure.governanceAction.infoAction.title')
          },
          procedure: {
            anchor: {
              url: anchor.url,
              hash: anchor.dataHash,
              txHashUrl: `${mockedCExpolorerBaseUrl}/${anchor.dataHash}`
            }
          }
        },
        translations: {
          txDetails: {
            title: t('core.ProposalProcedure.txDetails.title'),
            txType: t('core.ProposalProcedure.txDetails.txType')
          },
          procedure: {
            title: t('core.ProposalProcedure.procedure.title'),
            anchor: {
              url: t('core.ProposalProcedure.procedure.anchor.url'),
              hash: t('core.ProposalProcedure.procedure.anchor.hash')
            }
          }
        },
        errorMessage
      },
      {}
    );
  });
});
