import { CardanoInMemoryTransactionSigner } from '@lace-contract/cardano-context';

import { mnemonicKeyAgent$ } from '../../cardano/signing';

import type { SignerConfig } from '../../cardano/signing';
import type { CardanoTransactionSignerContext } from '@lace-contract/cardano-context';

/**
 * A signerFactory keyed from the run's mnemonic. Injected as a dependency so the
 * real signSweepTx runs (its context assembly, auth wiring, and cbor round-trip)
 * rather than being replaced by a signTxFunction seam. The signing itself is the
 * production CardanoInMemoryTransactionSigner.
 */
export const buildSignerFactory = (signer: SignerConfig) => ({
  createTransactionSigner: (context: CardanoTransactionSignerContext) =>
    new CardanoInMemoryTransactionSigner({
      withKeyAgent$: mnemonicKeyAgent$(signer),
      knownAddresses: context.knownAddresses,
      utxo: context.utxo,
      auth: context.auth,
    }),
});
