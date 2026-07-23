import { Serialization } from '@cardano-sdk/core';
import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import {
  InMemoryKeyAgent,
  KeyPurpose,
  util,
} from '@cardano-sdk/key-management';
import {
  createInputResolver,
  type CardanoInMemorySigningDependencies,
  type SignInMemoryTransactionProps,
  type SigningError,
} from '@lace-contract/cardano-context';
import { SecretBox } from '@lace-lib/core';
import { ByteArray, Err, Ok } from '@lace-lib/util';
import { catchError, forkJoin, from, map, mergeMap, of } from 'rxjs';

import type { LaceInit } from '@lace-contract/module';

export const initializeDependencies: LaceInit<
  CardanoInMemorySigningDependencies
> = async (_, { logger }) => ({
  cardanoInMemorySigning: {
    signTransaction: (props: SignInMemoryTransactionProps) =>
      forkJoin([
        from(SodiumBip32Ed25519.create()),
        from(
          util.createTxInKeyPathMap(
            props.tx.body().toCore(),
            props.knownAddresses,
            createInputResolver(props.utxo),
          ),
        ),
      ]).pipe(
        mergeMap(([bip32Ed25519, txInKeyPathMap]) => {
          const encryptedRootPrivateKeyBytes = ByteArray.fromHex(
            props.encryptedRootPrivateKey,
          );
          const keyAgent = new InMemoryKeyAgent(
            {
              accountIndex: props.accountIndex,
              chainId: props.chainId,
              encryptedRootPrivateKeyBytes: [...encryptedRootPrivateKeyBytes],
              extendedAccountPublicKey: props.extendedAccountPublicKey,
              getPassphrase: async () => props.authSecret,
              purpose: KeyPurpose.STANDARD,
            },
            {
              bip32Ed25519,
              logger,
              rootPrivateKeyEncryption: SecretBox.isSealed(
                encryptedRootPrivateKeyBytes,
              )
                ? { encrypt: SecretBox.seal, decrypt: SecretBox.open }
                : undefined,
            },
          );

          return from(
            keyAgent.signTransaction(props.tx.body(), {
              knownAddresses: props.knownAddresses,
              txInKeyPathMap,
              scripts: props.tx.toCore().witness.scripts,
            }),
          ).pipe(
            map(signatures => {
              const witnessSet = props.tx.witnessSet();
              witnessSet.setVkeys(
                Serialization.CborSet.fromCore(
                  [...signatures.entries()],
                  Serialization.VkeyWitness.fromCore,
                ),
              );
              props.tx.setWitnessSet(witnessSet);
              return Ok(props.tx);
            }),
          );
        }),
        catchError((error: Error) =>
          of(
            Err<SigningError>({
              code: 'SIGNING_FAILED',
              message: error.message,
            }),
          ),
        ),
      ),
  },
});
