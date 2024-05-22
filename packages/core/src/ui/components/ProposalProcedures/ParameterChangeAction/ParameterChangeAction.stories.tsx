import type { Meta, StoryObj } from '@storybook/react';

import { ParameterChangeAction } from './ParameterChangeAction';
import { ComponentProps } from 'react';

const customViewports = {
  popup: {
    name: 'Popup',
    styles: {
      width: '720px',
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
  data: {
    txDetails: {
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
  }
};

export const Overview: Story = {
  args: {
    ...data
  }
};
