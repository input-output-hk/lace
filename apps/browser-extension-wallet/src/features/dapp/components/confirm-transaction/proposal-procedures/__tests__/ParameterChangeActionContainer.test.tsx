/* eslint-disable unicorn/no-array-reduce */
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
const mockParameterChangeAction = jest.fn(() => <span data-testid="ParameterChangeAction" />);
const mockLovelacesToAdaString = jest.fn((val) => val);
const mockedCExpolorerBaseUrl = 'mockedCExpolorerBaseUrl';
const mockuseCexplorerBaseUrl = jest.fn(() => mockedCExpolorerBaseUrl);
import { Wallet } from '@lace/cardano';
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react-dom/test-utils';
import { ParameterChangeActionContainer } from '../ParameterChangeActionContainer';
import { formatPercentages } from '@lace/common';
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
    ParameterChangeAction: mockParameterChangeAction
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

const deposit = BigInt('10000');
const rewardAccount = Wallet.Cardano.RewardAccount('stake_test1uqrw9tjymlm8wrwq7jk68n6v7fs9qz8z0tkdkve26dylmfc2ux2hj');
const anchor = {
  url: 'anchorUrl',
  dataHash: Wallet.Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanch').toString('hex'))
};

const parameterChangeAction = {
  protocolParamUpdate: {
    maxBlockBodySize: 1,
    maxTxSize: 2,
    maxBlockHeaderSize: 3,
    maxValueSize: 4,
    maxExecutionUnitsPerTransaction: {
      memory: 5,
      steps: 6
    },
    maxExecutionUnitsPerBlock: {
      memory: 7,
      steps: 8
    },
    maxCollateralInputs: 9,
    stakeKeyDeposit: 10,
    poolDeposit: 11,
    minFeeCoefficient: 12,
    minFeeConstant: 13,
    treasuryExpansion: '14',
    monetaryExpansion: '15',
    minPoolCost: 16,
    coinsPerUtxoByte: 17,
    prices: {
      memory: 18,
      steps: 19
    },
    poolInfluence: '20',
    poolRetirementEpochBound: 21,
    desiredNumberOfPools: 22,
    costModels: new Map([
      [0, [23, 24]],
      [1, [25, 26]]
    ]),
    collateralPercentage: 27,
    governanceActionDeposit: 28,
    dRepDeposit: 29,
    governanceActionValidityPeriod: 30,
    dRepInactivityPeriod: 31,
    minCommitteeSize: 32,
    committeeTermLimit: 33,
    dRepVotingThresholds: {
      motionNoConfidence: {
        numerator: 34,
        denominator: 35
      },
      committeeNormal: {
        numerator: 36,
        denominator: 37
      },
      committeeNoConfidence: {
        numerator: 38,
        denominator: 39
      },
      updateConstitution: {
        numerator: 40,
        denominator: 41
      },
      hardForkInitiation: {
        numerator: 42,
        denominator: 43
      },
      ppNetworkGroup: {
        numerator: 44,
        denominator: 45
      },
      ppEconomicGroup: {
        numerator: 46,
        denominator: 47
      },
      ppTechnicalGroup: {
        numerator: 48,
        denominator: 49
      },
      ppGovernanceGroup: {
        numerator: 50,
        denominator: 51
      },
      treasuryWithdrawal: {
        numerator: 55,
        denominator: 56
      }
    }
  },
  governanceActionId: {
    actionIndex: 123,
    id: Wallet.Cardano.TransactionId('724a0a88b9470a714fc5bf84daf5851fa259a9b89e1a5453f6f5cd6595ad9821')
  },
  __typename: Wallet.Cardano.GovernanceActionType.parameter_change_action
} as Wallet.Cardano.ParameterChangeAction;

describe('Testing ProposalProceduresContainer component', () => {
  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  test('should render ParameterChangeAction component with proper props', async () => {
    let queryByTestId: any;

    await act(async () => {
      ({ queryByTestId } = render(
        <ParameterChangeActionContainer
          {...{ deposit, rewardAccount, anchor, governanceAction: parameterChangeAction }}
        />,
        {
          wrapper: getWrapper()
        }
      ));
    });

    expect(queryByTestId('ParameterChangeAction')).toBeInTheDocument();
    expect(mockParameterChangeAction).toHaveBeenLastCalledWith(
      {
        data: {
          txDetails: {
            deposit: depositPaidWithSymbol(deposit, cardanoCoinMock as Wallet.CoinId),
            rewardAccount
          },
          anchor: {
            url: anchor.url,
            hash: anchor.dataHash,
            txHashUrl: `${mockedCExpolorerBaseUrl}/${anchor.dataHash}`
          },
          protocolParamUpdate: {
            maxTxExUnits: {
              memory: parameterChangeAction.protocolParamUpdate.maxExecutionUnitsPerTransaction.memory.toString(),
              step: parameterChangeAction.protocolParamUpdate.maxExecutionUnitsPerTransaction.steps.toString()
            },
            maxBlockExUnits: {
              memory: parameterChangeAction.protocolParamUpdate.maxExecutionUnitsPerBlock.memory.toString(),
              step: parameterChangeAction.protocolParamUpdate.maxExecutionUnitsPerBlock.steps.toString()
            },
            networkGroup: {
              maxBBSize: parameterChangeAction.protocolParamUpdate.maxBlockBodySize.toString(),
              maxTxSize: parameterChangeAction.protocolParamUpdate.maxTxSize.toString(),
              maxBHSize: parameterChangeAction.protocolParamUpdate.maxBlockHeaderSize.toString(),
              maxValSize: parameterChangeAction.protocolParamUpdate.maxValueSize.toString(),
              maxCollateralInputs: parameterChangeAction.protocolParamUpdate.maxCollateralInputs.toString()
            },
            economicGroup: {
              minFeeA: parameterChangeAction.protocolParamUpdate.minFeeCoefficient.toString(),
              minFeeB: parameterChangeAction.protocolParamUpdate.minFeeConstant.toString(),
              keyDeposit: parameterChangeAction.protocolParamUpdate.stakeKeyDeposit.toString(),
              poolDeposit: parameterChangeAction.protocolParamUpdate.poolDeposit.toString(),
              rho: parameterChangeAction.protocolParamUpdate.monetaryExpansion,
              tau: parameterChangeAction.protocolParamUpdate.treasuryExpansion,
              minPoolCost: parameterChangeAction.protocolParamUpdate.minPoolCost.toString(),
              coinsPerUTxOByte: parameterChangeAction.protocolParamUpdate.coinsPerUtxoByte.toString(),
              price: {
                memory: parameterChangeAction.protocolParamUpdate.prices.memory.toString(),
                step: parameterChangeAction.protocolParamUpdate.prices.steps.toString()
              }
            },
            technicalGroup: {
              a0: parameterChangeAction.protocolParamUpdate.poolInfluence,
              eMax: parameterChangeAction.protocolParamUpdate.poolRetirementEpochBound.toString(),
              nOpt: parameterChangeAction.protocolParamUpdate.desiredNumberOfPools.toString(),
              costModels: {
                PlutusV1: Object.entries(
                  parameterChangeAction.protocolParamUpdate.costModels.get(Wallet.Cardano.PlutusLanguageVersion.V1)
                ).reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {}),
                PlutusV2: Object.entries(
                  parameterChangeAction.protocolParamUpdate.costModels.get(Wallet.Cardano.PlutusLanguageVersion.V2)
                ).reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {})
              },
              collateralPercentage: parameterChangeAction.protocolParamUpdate.collateralPercentage.toString()
            },
            governanceGroup: {
              govActionLifetime: parameterChangeAction.protocolParamUpdate.governanceActionValidityPeriod.toString(),
              govActionDeposit: parameterChangeAction.protocolParamUpdate.governanceActionDeposit.toString(),
              drepDeposit: parameterChangeAction.protocolParamUpdate.dRepDeposit.toString(),
              drepActivity: parameterChangeAction.protocolParamUpdate.dRepInactivityPeriod.toString(),
              ccMinSize: parameterChangeAction.protocolParamUpdate.minCommitteeSize.toString(),
              ccMaxTermLength: parameterChangeAction.protocolParamUpdate.committeeTermLimit.toString(),
              dRepVotingThresholds: {
                motionNoConfidence: formatPercentages(
                  parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.motionNoConfidence.numerator /
                    parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.motionNoConfidence.denominator
                ),
                committeeNormal: formatPercentages(
                  parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.committeeNormal.numerator /
                    parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.committeeNormal.denominator
                ),
                committeeNoConfidence: formatPercentages(
                  parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.committeeNoConfidence.numerator /
                    parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.committeeNoConfidence.denominator
                ),
                updateToConstitution: formatPercentages(
                  parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.updateConstitution.numerator /
                    parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.updateConstitution.denominator
                ),
                hardForkInitiation: formatPercentages(
                  parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.hardForkInitiation.numerator /
                    parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.hardForkInitiation.denominator
                ),
                ppNetworkGroup: formatPercentages(
                  parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.ppNetworkGroup.numerator /
                    parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.ppNetworkGroup.denominator
                ),
                ppEconomicGroup: formatPercentages(
                  parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.ppEconomicGroup.numerator /
                    parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.ppEconomicGroup.denominator
                ),
                ppTechnicalGroup: formatPercentages(
                  parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.ppTechnicalGroup.numerator /
                    parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.ppTechnicalGroup.denominator
                ),
                ppGovGroup: formatPercentages(
                  parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.ppGovernanceGroup.numerator /
                    parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.ppGovernanceGroup.denominator
                ),
                treasuryWithdrawal: formatPercentages(
                  parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.treasuryWithdrawal.numerator /
                    parameterChangeAction.protocolParamUpdate.dRepVotingThresholds.treasuryWithdrawal.denominator
                )
              }
            }
          }
        }
      },
      {}
    );
  });
});
