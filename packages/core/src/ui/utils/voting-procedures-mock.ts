import { Wallet } from '@lace/cardano';

export const mockVotingProcedures = [
  {
    voter: {
      __typename: Wallet.Cardano.VoterType.dRepKeyHash,
      credential: {
        type: Wallet.Cardano.CredentialType.KeyHash,
        hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCrede1').toString('hex'))
      }
    },
    votes: [
      {
        actionId: {
          id: Wallet.Cardano.TransactionId('724a0a88b9470a714fc5bf84daf5851fa259a9b89e1a5453f6f5cd6595ad9820'),
          actionIndex: 0
        },
        votingProcedure: {
          vote: Wallet.Cardano.Vote.yes,
          anchor: {
            url: 'anchorUrl',
            dataHash: Wallet.Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanc1').toString('hex'))
          }
        }
      }
    ]
  },
  {
    voter: {
      __typename: Wallet.Cardano.VoterType.ccHotKeyHash,
      credential: {
        type: Wallet.Cardano.CredentialType.KeyHash,
        hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from('dRepCredentialHashdRepCrede2').toString('hex'))
      }
    },
    votes: [
      {
        actionId: {
          id: Wallet.Cardano.TransactionId('55555a88b9470a714fc5bf84daf5851fa259a9b89e1a5453f6f5cd6595ad9820'),
          actionIndex: 0
        },
        votingProcedure: {
          vote: Wallet.Cardano.Vote.yes,
          anchor: {
            url: 'anchorUrl',
            dataHash: Wallet.Crypto.Hash32ByteBase16(Buffer.from('anchorDataHashanchorDataHashanc2').toString('hex'))
          }
        }
      }
    ]
  }
];
