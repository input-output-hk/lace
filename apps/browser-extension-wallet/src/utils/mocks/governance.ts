import { Wallet } from '@lace/cardano';

const VOTER_CREDENTIAL = {
  type: Wallet.Cardano.CredentialType.KeyHash,
  hash: Wallet.Crypto.Hash28ByteBase16('0d94e174732ef9aae73f395ab44507bfa983d65023c11a951f0c32e4')
};

export const mockVotingProcedures: Wallet.Cardano.VotingProcedures = [
  {
    voter: {
      __typename: Wallet.Cardano.VoterType.dRepKeyHash,
      credential: {
        hash: Wallet.Crypto.Hash28ByteBase16('c780b43ca9577ea3f28f1fbd39a4d13c3ad9df6987051f5167815974'),
        type: Wallet.Cardano.CredentialType.KeyHash
      }
    },
    votes: [
      {
        actionId: {
          actionIndex: 1,
          id: Wallet.Cardano.TransactionId('bb217abaca60fc0ca68c1555eca6a96d2478547818ae76ce6836133f3cc546e0')
        },
        votingProcedure: {
          // eslint-disable-next-line unicorn/no-null
          anchor: null,
          vote: Wallet.Cardano.Vote.yes
        }
      }
    ]
  },
  {
    voter: {
      __typename: Wallet.Cardano.VoterType.dRepKeyHash,
      credential: VOTER_CREDENTIAL
    } as Wallet.Cardano.DrepKeyHashVoter,
    votes: [
      // multiple voters
      {
        actionId: {
          actionIndex: 1,
          id: Wallet.Cardano.TransactionId('bb217abaca60fc0ca68c1555eca6a96d2478547818ae76ce6836133f3cc546e0')
        },
        votingProcedure: {
          // eslint-disable-next-line unicorn/no-null
          anchor: null,
          vote: Wallet.Cardano.Vote.abstain
        }
      },
      {
        actionId: {
          actionIndex: 1,
          id: Wallet.Cardano.TransactionId('bb217abaca60fc0ca68c1555eca6a96d2478547818ae76ce6836133f3cc546e0')
        },
        votingProcedure: {
          // eslint-disable-next-line unicorn/no-null
          anchor: null,
          vote: Wallet.Cardano.Vote.no
        }
      }
    ]
  }
];
