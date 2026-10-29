import { Cardano, Serialization } from '@cardano-sdk/core';
import {
  CardanoAccountId,
  CardanoNetworkId,
} from '@lace-contract/cardano-context';
import { hashEd25519PublicKey } from '@lace-lib/core';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it } from 'vitest';

// Test-only import of the account the words-based signing tests sign for.
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  address,
  extendedAccountPublicKey,
  knownAddresses,
  serializedTx,
  utxo,
} from '../../../../packages/contract/cardano-context/test/signing/sign-with-words.fixtures';
import { CardanoLazyInMemorySignerFactory } from '../../src/cardano-lazy-in-memory-signer-factory';
import { createCardanoCustodyAccountEntity } from '../../src/custody/cardano-custody-account-entity';
import { signCardanoTx } from '../../src/sign-cardano-tx';

import {
  createCustodyTestWallet,
  creatorBinding,
  record,
  words,
} from './custody-fixtures';

import type { WalletWithCardanoSigning } from '../../src/sign-cardano-tx';
import type { AnyWallet, WalletId } from '@lace-contract/wallet-repo';

const PREPROD_MAGIC = Cardano.NetworkMagics.Preprod;
const lazyWalletId = 'lazy-wallet' as WalletId;
const lazyAccountId = CardanoAccountId(lazyWalletId, 0, PREPROD_MAGIC);

const lazyWallet = {
  type: 'LazyInMemory',
  walletId: lazyWalletId,
  metadata: { name: 'Passkey', order: 0 },
  blockchainSpecific: {},
  accounts: [
    {
      accountId: lazyAccountId,
      walletId: lazyWalletId,
      accountType: 'LazyInMemory',
      blockchainName: 'Cardano',
      blockchainNetworkId: CardanoNetworkId(PREPROD_MAGIC),
      networkType: 'testnet',
      metadata: { name: 'Passkey' },
      blockchainSpecific: {
        accountIndex: 0,
        chainId: Cardano.ChainIds.Preprod,
        extendedAccountPublicKey,
      },
    },
  ],
} as unknown as AnyWallet;

const signingWallet = async () => {
  const { entity } = await createCardanoCustodyAccountEntity(
    createCustodyTestWallet().wallet,
    { record, device: creatorBinding(), name: 'Treasury' },
  );
  const [known] = knownAddresses;
  return {
    custodyAccountId: entity.accounts[0].accountId,
    wallet: {
      stateObservables: {
        wallets: { selectAll$: new BehaviorSubject([lazyWallet, entity]) },
        network: {
          selectAllActiveNetworkIds$: new BehaviorSubject([
            CardanoNetworkId(PREPROD_MAGIC),
          ]),
        },
        addresses: {
          selectAllAddresses$: new BehaviorSubject([
            {
              accountId: lazyAccountId,
              address,
              blockchainName: 'Cardano',
              data: { ...known, networkMagic: PREPROD_MAGIC },
            },
            {
              accountId: entity.accounts[0].accountId,
              address: record.address,
              blockchainName: 'Cardano',
            },
          ]),
        },
        cardanoContext: {
          selectCollateralOwnershipUtxos$: new BehaviorSubject({
            [lazyAccountId]: utxo,
          }),
        },
      },
      _loadModules: async () => [
        new CardanoLazyInMemorySignerFactory({
          withMnemonicWords: async use => use(words),
        }),
      ],
    } as unknown as WalletWithCardanoSigning,
  };
};

describe('signCardanoTx with a custody account in the wallet', () => {
  it('still signs with the only signable account when no account is named', async () => {
    const { wallet } = await signingWallet();

    const signed = await signCardanoTx(wallet, { serializedTx });

    const { serializedTx: signedTx, signatureCount } = signed.unwrap();
    expect(signatureCount).toBe(1);
    const [[vkey]] =
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(signedTx))
        .witnessSet()
        .vkeys()
        ?.toCore() ?? [];
    const paymentKeyHash = Cardano.Address.fromBech32(address)
      .asBase()
      ?.getPaymentCredential().hash;
    expect(hashEd25519PublicKey(vkey)).toBe(paymentKeyHash);
  });

  it('never signs as a custody account', async () => {
    const { wallet, custodyAccountId } = await signingWallet();

    const signed = await signCardanoTx(wallet, {
      serializedTx,
      accountId: custodyAccountId,
    });

    expect(signed.isErr() && signed.error.message).toContain('not found');
  });
});
