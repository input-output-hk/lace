import { Wallet } from '@lace/cardano';

const getCredential = (hash: string) => ({
  type: Wallet.Cardano.CredentialType.KeyHash,
  hash: Wallet.Crypto.Hash28ByteBase16(Buffer.from(hash).toString('hex'))
});

const getVotes = (txId: string, anchorHash: string) => [
  {
    actionId: {
      id: Wallet.Cardano.TransactionId(txId),
      actionIndex: 0
    },
    votingProcedure: {
      vote: Wallet.Cardano.Vote.yes,
      anchor: {
        url: 'anchorUrl',
        dataHash: Wallet.Crypto.Hash32ByteBase16(Buffer.from(anchorHash).toString('hex'))
      }
    }
  }
];

export const mockVotingProcedures = [
  {
    voter: {
      __typename: Wallet.Cardano.VoterType.dRepKeyHash,
      credential: getCredential('dRepCredentialHashdRepCrede1')
    },
    votes: getVotes(
      '724a0a88b9470a714fc5bf84daf5851fa259a9b89e1a5453f6f5cd6595ad9820',
      'anchorDataHashanchorDataHashanc1'
    )
  },
  {
    voter: {
      __typename: Wallet.Cardano.VoterType.ccHotKeyHash,
      credential: getCredential('dRepCredentialHashdRepCrede2')
    },
    votes: getVotes(
      '55555a88b9470a714fc5bf84daf5851fa259a9b89e1a5453f6f5cd6595ad9820',
      'anchorDataHashanchorDataHashanc2'
    )
  }
];
