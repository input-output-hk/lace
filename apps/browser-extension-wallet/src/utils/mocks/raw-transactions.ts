/* eslint-disable no-magic-numbers */
import { Wallet } from '@lace/cardano';
import { ConwayEraCertificatesTypes } from '@lace/core';
import { mockVotingProcedures } from './governance';
import { mockConwayCertificates } from './certificates';

export const body: Wallet.Cardano.HydratedTxBody = {
  fee: BigInt('168273'),
  outputs: [
    {
      address: Wallet.Cardano.PaymentAddress(
        'addr_test1qqplclydk8yhxl66ku2q2k869xkzxjtadumefazhcg2teewydv5nffw36jhxyf27hqldy5nwu9mwvrly047f9tqlru5st9mpv2'
      ),
      value: {
        coins: BigInt('3000000'),
        assets: new Map([
          [Wallet.Cardano.AssetId('6b8d07d69639e9413dd637a1a815a7323c69c86abbafb66dbfdb1aa7'), BigInt('3000000')]
        ]) as Wallet.Cardano.TokenMap
      }
    }
  ],
  inputs: [
    {
      index: 1,
      txId: Wallet.Cardano.TransactionId('e6eb1c8c806ae7f4d9fe148e9c23853607ffba692ef0a464688911ad3374a932'),
      address: Wallet.Cardano.PaymentAddress(
        'addr_test1qqplclydk8yhxl66ku2q2k869xkzxjtadumefazhcg2teewydv5nffw36jhxyf27hqldy5nwu9mwvrly047f9tqlru5st9mpv2'
      )
    }
  ]
};

export const partialBlockHeader: Wallet.Cardano.PartialBlockHeader = {
  blockNo: Wallet.Cardano.BlockNo(500),
  hash: Wallet.Cardano.BlockId('96fbe9b0d4930626fc87ea7f1b6360035e9b8a714e9514f1b836190e95edd59e'),
  slot: Wallet.Cardano.Slot(3000)
};

export const tx: Wallet.Cardano.HydratedTx = {
  id: Wallet.Cardano.TransactionId('e6eb1c8c806ae7f4d9fe148e9c23853607ffba692ef0a464688911ad3374a932'),
  index: 0,
  blockHeader: partialBlockHeader,
  body,
  txSize: 297,
  inputSource: Wallet.Cardano.InputSource.inputs,
  witness: {
    signatures: new Map()
  }
};

export const voteTx: Wallet.Cardano.HydratedTx = {
  ...tx,
  body: {
    ...tx.body,
    votingProcedures: mockVotingProcedures
  }
};

export const drepRegistrationTx: Wallet.Cardano.HydratedTx = {
  ...tx,
  body: {
    ...tx.body,
    certificates: [mockConwayCertificates[ConwayEraCertificatesTypes.RegisterDelegateRepresentative]]
  }
};

export const drepRetirementTx: Wallet.Cardano.HydratedTx = {
  ...tx,
  body: {
    ...tx.body,
    certificates: [mockConwayCertificates[ConwayEraCertificatesTypes.UnregisterDelegateRepresentative]]
  }
};

export const voteDelegationTx: Wallet.Cardano.HydratedTx = {
  ...tx,
  body: {
    ...tx.body,
    certificates: [mockConwayCertificates[ConwayEraCertificatesTypes.VoteDelegation]]
  }
};
