import type { Meta, StoryObj } from '@storybook/react';

import { VotingProcedures } from './VotingProcedures';
import { ComponentProps } from 'react';
import { Wallet } from '@lace/cardano';

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

const TX_HASH_URL =
  'https://cexplorer.io/address/addr1q9wlvfl74g9h8txw5v0lfew2gjsw9z56d5kj8mmv5d8tudcx9eh8zefr3cxuje02lu6tgy083xkl39rr5xkj483vvd6q8nlapq';
const URL = 'https://shorturl.at/eK145';

const data: ComponentProps<typeof VotingProcedures> = {
  data: [
    {
      voter: {
        type: Wallet.util.getVoterType(Wallet.Cardano.VoterType.dRepKeyHash),
        dRepId: 'drep1cs234l5mtapethapx8cq97nkpa27xf84phruh5f6jqxa78ymlp4'
      },
      votes: [
        {
          actionId: {
            index: 0,
            txHash: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0',
            txHashUrl: TX_HASH_URL
          },
          votingProcedure: {
            anchor: {
              hash: '9067f223838d88b83f660c05eedf7f6f65c45de31e522c1bcb6a1eb287b17e89',
              url: URL
            },
            vote: Wallet.util.getVote(Wallet.Cardano.Vote.yes)
          }
        }
      ]
    }
  ]
};

const dataMultiple: ComponentProps<typeof VotingProcedures> = {
  data: [
    {
      voter: {
        type: Wallet.util.getVoterType(Wallet.Cardano.VoterType.dRepKeyHash),
        dRepId: 'drep1cs234l5mtapethapx8cq97nkpa27xf84phruh5f6jqxa78ymlp4'
      },
      votes: [
        {
          actionId: {
            index: 0,
            txHash: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0',
            txHashUrl: TX_HASH_URL
          },
          votingProcedure: {
            anchor: {
              hash: '9067f223838d88b83f660c05eedf7f6f65c45de31e522c1bcb6a1eb287b17e89',
              url: URL
            },
            vote: Wallet.util.getVote(Wallet.Cardano.Vote.yes)
          }
        }
      ]
    },
    {
      voter: {
        type: Wallet.util.getVoterType(Wallet.Cardano.VoterType.dRepKeyHash),
        dRepId: 'drep1cs234l5mtapethapx8cq97nkpa27xf84phruh5f6jqxa78ymlp4'
      },
      votes: [
        {
          actionId: {
            index: 0,
            txHash: '26bfdcc75a7f4d0cd8c71f0189bc5ca5ad2f4a3db6240c82b5a0edac7f9203e0',
            txHashUrl: TX_HASH_URL
          },
          votingProcedure: {
            anchor: {
              hash: '9067f223838d88b83f660c05eedf7f6f65c45de31e522c1bcb6a1eb287b17e89',
              url: URL
            },
            vote: Wallet.util.getVote(Wallet.Cardano.Vote.no)
          }
        }
      ]
    }
  ]
};

export const Overview: Story = {
  args: {
    ...data
  }
};

export const MultipleVotes: Story = {
  args: {
    ...dataMultiple
  }
};
