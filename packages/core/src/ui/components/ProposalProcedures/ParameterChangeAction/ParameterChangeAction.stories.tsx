import type { Meta, StoryObj } from '@storybook/react';

import { ParameterChangeAction } from './ParameterChangeAction';
import { ComponentProps } from 'react';

const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '360px',
      height: '600'
    }
  }
};

const meta: Meta<typeof ParameterChangeAction> = {
  title: 'Sanchonet/Proposal Procedures/ParameterChangeAction',
  component: ParameterChangeAction,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof ParameterChangeAction>;

const data: ComponentProps<typeof ParameterChangeAction> = {
  dappInfo: {
    logo: 'https://cdn.mint.handle.me/favicon.png',
    name: 'Mint',
    url: 'https://preprod.mint.handle.me'
  },
  data: {
    txDetails: {
      txType: 'Protocol Parameter Update',
      deposit: '2000',
      rewardAccount: 'stake1u89sasnfyjtmgk8ydqfv3fdl52f36x3djedfnzfc9rkgzrcss5vgr'
    },
    anchor: {
      hash: '0000000000000000000000000000000000000000000000000000000000000000',
      url: 'https://www.someurl.io',
      txHashUrl: 'https://www.someurl.io/'
    },
    protocolParamUpdate: {
      maxBlockExUnits: {
        memory: '50000000',
        step: '4000000000'
      },
      maxTxExUnits: {
        memory: '10000000',
        step: '10000000000'
      },
      networkGroup: {
        maxBBSize: '65536',
        maxBHSize: '1100',
        maxTxSize: '16384',
        maxCollateralInputs: '3',
        maxValSize: '5000'
      },
      economicGroup: {
        minFeeA: '44',
        minFeeB: '155381',
        keyDeposit: '2000000',
        poolDeposit: '500000000',
        minPoolCost: '340000000',
        coinsPerUTxOByte: '34482',
        price: {
          memory: '0.0577',
          step: '0.0000721'
        },
        rho: '0.003',
        tau: '0.2'
      },
      technicalGroup: {
        a0: '0.3',
        nOpt: '150',
        collateralPercentage: '150',
        costModels: {
          PlutusV1: {
            'addInteger-cpu-arguments-intercept': '197_209',
            'addInteger-cpu-arguments-slope': '0'
          },
          PlutusV2: {
            'addInteger-cpu-arguments-intercept': '197_209',
            'addInteger-cpu-arguments-slope': '0'
          }
        },
        eMax: '18'
      },
      governanceGroup: {
        govActionLifetime: '14',
        govActionDeposit: '0',
        ccMaxTermLength: '60',
        ccMinSize: '0',
        drepActivity: '0',
        drepDeposit: '0',
        dRepVotingThresholds: {
          motionNoConfidence: '0.51',
          committeeNormal: '0.51',
          committeeNoConfidence: '0.51',
          updateToConstitution: '0.51',
          hardForkInitiation: '0.51',
          ppNetworkGroup: '0.51',
          ppEconomicGroup: '0.51',
          ppTechnicalGroup: '0.51',
          ppGovGroup: '0.51',
          treasuryWithdrawal: '0.51'
        }
      }
    }
  },
  translations: {
    txDetails: {
      title: 'Transaction Details',
      txType: 'Transaction Type',
      deposit: 'Deposit',
      rewardAccount: 'Reward Account'
    },
    memory: 'Memory',
    step: 'Step',
    anchor: {
      hash: 'Anchor Hash',
      url: 'Anchor URL'
    },
    networkGroup: {
      title: 'Network Group',
      maxBBSize: 'Max BB Size',
      maxTxSize: 'Max Tx Size',
      maxBHSize: 'Max BH Size',
      maxValSize: 'Max Val Size',
      maxTxExUnits: 'Max TX Ex Units',
      maxBlockExUnits: 'Max BLK Ex Units',
      maxCollateralInputs: 'Max Coll Inputs',
      tooltip: {
        maxBBSize: 'Max block body size',
        maxTxSize: 'Max transaction size',
        maxBHSize: 'Max block header size',
        maxValSize: 'Max size of a serialized asset value',
        maxTxExUnits: 'Max script execution units in a single transaction',
        maxBlockExUnits: 'Max script execution units in a single block',
        maxCollateralInputs: 'Max number of collateral inputs'
      }
    },
    economicGroup: {
      title: 'Economic Group',
      minFeeA: 'Min Fee A',
      minFeeB: 'Min Fee B',
      keyDeposit: 'Key Deposit',
      poolDeposit: 'Pool Deposit',
      rho: 'Rho',
      tau: 'Tau',
      minPoolCost: 'Min Pool Cost',
      coinsPerUTxOByte: 'Coins/UTxO Byte',
      prices: 'Price',
      tooltip: {
        minFeeA: 'Min fee coefficient',
        minFeeB: 'Min fee constant',
        keyDeposit: 'Delegation key Lovelace deposit',
        poolDeposit: 'Pool registration Lovelace deposit',
        rho: 'Monetary expansion',
        tau: 'Treasury expansion',
        minPoolCost: 'Min fixed rewards cut for pools',
        coinsPerUTxOByte: 'Min Lovelace deposit per byte of serialized UTxO',
        prices: 'Prices of Plutus execution units'
      }
    },
    technicalGroup: {
      title: 'Technical Group',
      a0: 'A0',
      eMax: 'EMax',
      nOpt: 'NOpt',
      costModels: 'Cost Models',
      collateralPercentage: 'Coll Percentage',
      tooltip: {
        a0: 'Pool pledge influence',
        eMax: 'Pool retirement maximum epoch',
        nOpt: 'Desired number of pools',
        costModels: 'Plutus execution cost models',
        collateralPercentage: 'Proportion of collateral needed for scripts'
      }
    },
    governanceGroup: {
      title: 'Governance Group',
      govActionLifetime: 'Gov Act Lifetime',
      govActionDeposit: 'Gov Act Deposit',
      drepDeposit: 'DRep Deposit',
      drepActivity: 'DRep Activity',
      ccMinSize: 'CC Min Size',
      ccMaxTermLength: 'CC Max Term Length',
      dRepVotingThresholds: {
        title: 'Governance voting thresholds',
        motionNoConfidence: 'Motion No Conf',
        committeeNormal: 'Comm Normal',
        committeeNoConfidence: 'Comm No Conf',
        updateConstitution: 'Update Const',
        hardForkInitiation: 'Hard Fork Init',
        ppNetworkGroup: 'PP Network Grp',
        ppEconomicGroup: 'PP Economic Grp',
        ppTechnicalGroup: 'PP Technical Grp',
        ppGovernanceGroup: 'PP Governance Grp',
        treasuryWithdrawal: 'Treasury Withdraw'
      },
      tooltip: {
        govActionLifetime: 'governance action maximum lifetime in epochs',
        govActionDeposit: 'governance action deposit',
        drepDeposit: 'DRep deposit amount',
        drepActivity: 'DRep activity period in epochs',
        ccMinSize: 'Min constitutional committee size',
        ccMaxTermLength: 'Max term length (in epochs) for the constitutional committee members',
        dRepVotingThresholds: {
          title: 'DRep voting thresholds',
          motionNoConfidence: '1. Motion of no-confidence',
          committeeNormal: '2a. New committee/threshold (normal state)',
          committeeNoConfidence: '2b. New committee/threshold (state of no-confidence)',
          updateConstitution: '3. Update to the Constitution or proposal policy',
          hardForkInitiation: '4. Hard-fork initiation',
          ppNetworkGroup: '5a. Protocol parameter changes, network group',
          ppEconomicGroup: '5b. Protocol parameter changes, economic group',
          ppTechnicalGroup: '5c. Protocol parameter changes, technical group',
          ppGovernanceGroup: '5d. Protocol parameter changes, governance group',
          treasuryWithdrawal: '6. Treasury withdrawal'
        }
      }
    }
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};

export const WithError: Story = {
  args: {
    ...data,
    errorMessage: 'Something went wrong'
  }
};
