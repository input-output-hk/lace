import type { Meta, StoryObj } from '@storybook/react';

import { VotingProcedures } from './VotingProcedures';
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

const meta: Meta<typeof VotingProcedures> = {
  title: 'Sanchonet/Voting/Procedures',
  component: VotingProcedures,
  parameters: {
    layout: 'centered',
    viewport: {
      viewports: customViewports,
      defaultViewport: 'popup'
    }
  }
};

export default meta;
type Story = StoryObj<typeof VotingProcedures>;

const data: ComponentProps<typeof VotingProcedures> = {
  dappInfo: {
    logo: 'https://cdn.mint.handle.me/favicon.png',
    name: 'Mint',
    url: 'https://preprod.mint.handle.me'
  },
  data: [
    {
      voter: {
        type: 'DRep',
        dRepId: 'drep1cs234l5mtapethapx8cq97nkpa27xf84phruh5f6jqxa78ymlp4'
      },
      votes: [
        {
          actionId: {
            index: 0,
            txHash: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0',
            txHashUrl:
              'https://cexplorer.io/address/addr1q9wlvfl74g9h8txw5v0lfew2gjsw9z56d5kj8mmv5d8tudcx9eh8zefr3cxuje02lu6tgy083xkl39rr5xkj483vvd6q8nlapq'
          },
          votingProcedure: {
            anchor: {
              hash: '9067f223838d88b83f660c05eedf7f6f65c45de31e522c1bcb6a1eb287b17e89',
              url: 'https://shorturl.at/eK145'
            },
            vote: 'Yes'
          }
        }
      ]
    }
  ],
  translations: {
    voterType: 'Voter Type',
    procedureTitle: 'Procedure',
    actionIdTitle: 'Action ID',
    vote: 'Vote',
    actionId: {
      index: 'Index',
      txHash: 'TX Hash'
    },
    anchor: {
      hash: 'Anchor Hash',
      url: 'Anchor URL'
    },
    dRepId: 'DRep ID'
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

export const MultipleVotes: Story = {
  args: {
    ...data,
    data: [
      ...data.data,
      {
        voter: {
          type: 'DRep',
          dRepId: 'drep1cs234l5mtapethapx8cq97nkpa27xf84phruh5f6jqxa78ymlp5'
        },
        votes: [
          {
            actionId: {
              index: 0,
              txHash: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0',
              txHashUrl:
                'https://cexplorer.io/address/addr1q9wlvfl74g9h8txw5v0lfew2gjsw9z56d5kj8mmv5d8tudcx9eh8zefr3cxuje02lu6tgy083xkl39rr5xkj483vvd6q8nlapq'
            },
            votingProcedure: {
              anchor: {
                hash: '9067f223838d88b83f660c05eedf7f6f65c45de31e522c1bcb6a1eb287b17e89',
                url: 'https://shorturl.at/eK145'
              },
              vote: 'Yes'
            }
          }
        ]
      }
    ]
  }
};
