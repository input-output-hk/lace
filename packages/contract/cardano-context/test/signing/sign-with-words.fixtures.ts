import { Cardano, Serialization } from '@cardano-sdk/core';
import { AddressType } from '@cardano-sdk/key-management';
import { HexBytes } from '@lace-lib/util';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';

/** A preprod account and a transaction it can sign, shared by the words-based signing tests. */
export const words =
  'fame coconut utility print giraffe common twin evil alone exclude great echo since cart erode noise icon repair amused drip awake coral hat unveil'.split(
    ' ',
  );

export const extendedAccountPublicKey =
  '928f23856ef3f6edc6adc14d7fb39b15cfb985b9bb038755158cf2ad6cdd8281d601bb8f919e2feb0183b1462a59fce5c7acde2cf10ccd10e213d02ff0d0a7a7' as Bip32PublicKeyHex;

export const address = Cardano.PaymentAddress(
  'addr_test1qp0np478uj3lpl5ffk72m9t89rrgplcmxq6rz8lhk3yxeadwylevelqjsja5ucxf7kq6as840xtphdkr56t97fzhy7zqzmtjwh',
);

const rewardAccount = Cardano.RewardAccount.fromCredential(
  Cardano.Address.fromBech32(address).asBase()!.getStakeCredential(),
  Cardano.NetworkId.Testnet,
);

export const knownAddresses: GroupedAddress[] = [
  {
    type: AddressType.External,
    index: 0,
    networkId: Cardano.NetworkId.Testnet,
    accountIndex: 0,
    address,
    rewardAccount,
    stakeKeyDerivationPath: { role: 2, index: 0 },
  },
];

export const serializedTx = HexBytes(
  Serialization.Transaction.fromCore({
    id: Cardano.TransactionId('ef'.repeat(32)),
    body: {
      inputs: [{ txId: Cardano.TransactionId('cd'.repeat(32)), index: 0 }],
      outputs: [{ address, value: { coins: 1_000_000n } }],
      fee: 170_000n,
    },
    witness: { signatures: new Map() },
  }).toCbor(),
);

export const utxo: Cardano.Utxo[] = [
  [
    { txId: Cardano.TransactionId('cd'.repeat(32)), index: 0, address },
    { address, value: { coins: 5_000_000n } },
  ],
];

const baseAddress = Cardano.Address.fromBech32(address).asBase()!;
const mainnetAddress = Cardano.PaymentAddress(
  Cardano.BaseAddress.fromCredentials(
    Cardano.NetworkId.Mainnet,
    baseAddress.getPaymentCredential(),
    baseAddress.getStakeCredential(),
  )
    .toAddress()
    .toBech32(),
);

export const mainnet = {
  chainId: Cardano.ChainIds.Mainnet,
  knownAddresses: knownAddresses.map(known => ({
    ...known,
    address: mainnetAddress,
    networkId: Cardano.NetworkId.Mainnet,
    rewardAccount: Cardano.RewardAccount.fromCredential(
      baseAddress.getStakeCredential(),
      Cardano.NetworkId.Mainnet,
    ),
  })),
  serializedTx: HexBytes(
    Serialization.Transaction.fromCore({
      id: Cardano.TransactionId('ef'.repeat(32)),
      body: {
        inputs: [{ txId: Cardano.TransactionId('cd'.repeat(32)), index: 0 }],
        outputs: [{ address: mainnetAddress, value: { coins: 1_000_000n } }],
        fee: 170_000n,
        networkId: Cardano.NetworkId.Mainnet,
      },
      witness: { signatures: new Map() },
    }).toCbor(),
  ),
  utxo: utxo.map(
    ([input, output]): Cardano.Utxo => [
      { ...input, address: mainnetAddress },
      { ...output, address: mainnetAddress },
    ],
  ),
  signWith: mainnetAddress,
  payload: 'deadbeef',
};
