import { Serialization } from '@cardano-sdk/core';
import {
  CardanoInMemoryTransactionSigner,
  createCardanoKeyAgentFromMnemonic,
} from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-lib/util';
import { EMPTY, firstValueFrom, from, of, switchMap } from 'rxjs';

import type { DerivedAccount } from './account';
import type { Cardano } from '@cardano-sdk/core';
import type { SignerAuth } from '@lace-contract/signer';
import type { Observable } from 'rxjs';

// The mnemonic path hands the key agent to the signer directly, so the auth
// secret is never reached, and authenticate always confirms.
const testAuth: SignerAuth = {
  authenticate: () => of(true),
  accessAuthSecret: <T>(): Observable<T> => EMPTY,
};

export type SignerConfig = {
  mnemonic: string[];
  chainId: Cardano.ChainId;
  accountIndex: number;
};

type WithKeyAgent = ConstructorParameters<
  typeof CardanoInMemoryTransactionSigner
>[0]['withKeyAgent$'];

/**
 * Builds the signer's withKeyAgent$ from a mnemonic, deriving the in-memory key
 * agent on subscription. Shared by signTx and the injected signerFactory.
 */
export const mnemonicKeyAgent$ =
  ({ mnemonic, chainId, accountIndex }: SignerConfig): WithKeyAgent =>
  use =>
    from(
      createCardanoKeyAgentFromMnemonic({
        accountIndex,
        chainId,
        mnemonicWords: mnemonic,
      }),
    ).pipe(switchMap(use));

type SigningKey = Pick<
  DerivedAccount,
  'accountIndex' | 'chainId' | 'knownAddresses' | 'mnemonic'
>;

/**
 * Signs a transaction with the production CardanoInMemoryTransactionSigner,
 * keying it from the mnemonic.
 */
export const signTx = async (
  { mnemonic, accountIndex, chainId, knownAddresses }: SigningKey,
  tx: Serialization.Transaction,
  utxo: Cardano.Utxo[],
): Promise<Serialization.Transaction> => {
  const signer = new CardanoInMemoryTransactionSigner({
    withKeyAgent$: mnemonicKeyAgent$({ mnemonic, chainId, accountIndex }),
    knownAddresses,
    utxo,
    auth: testAuth,
  });
  const { serializedTx } = await firstValueFrom(
    signer.sign({ serializedTx: HexBytes(tx.toCbor()) }),
  );
  return Serialization.Transaction.fromCbor(Serialization.TxCBOR(serializedTx));
};
