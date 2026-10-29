import { Cardano } from '@cardano-sdk/core';
import { firstValueFrom, from, of, throwError } from 'rxjs';

import { CardanoInMemoryDataSigner } from './cardano-in-memory-data-signer';
import { CardanoInMemoryTransactionSigner } from './cardano-in-memory-transaction-signer';
import {
  createCardanoKeyAgentFromMnemonic,
  deriveDRepKeyHash,
} from './cardano-key-agent';

import type {
  CardanoKeyAgent,
  CardanoSignDataRequest,
  CardanoSignDataResult,
  CardanoSignRequest,
  CardanoSignResult,
} from './types';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type { SignerAuth } from '@lace-contract/signer';

/** The words derive a different account key than the one being signed for. */
export class AccountKeyMismatchError extends Error {
  public readonly code = 'account-key-mismatch' as const;
  public constructor() {
    super('The mnemonic does not derive the expected account key.');
    this.name = 'AccountKeyMismatchError';
  }
}

/** The account the words must derive and the addresses it owns. */
export type SignWithWordsAccount = {
  words: readonly string[];
  knownAddresses: GroupedAddress[];
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
};

export type SignCardanoTransactionWithWordsProps = CardanoSignRequest &
  SignWithWordsAccount & {
    utxo: Cardano.Utxo[];
  };

export type SignCardanoDataWithWordsProps = CardanoSignDataRequest &
  SignWithWordsAccount;

export type DeriveCardanoAccountPublicKeyFromWordsProps = {
  words: readonly string[];
  accountIndex: number;
};

/**
 * The caller already holds the words, so the auth prompt is a formality and
 * no auth secret exists to access.
 */
const WORDS_AUTH: SignerAuth = {
  authenticate: () => of(true),
  accessAuthSecret: () =>
    throwError(
      () => new Error('Signing from mnemonic words has no auth secret.'),
    ),
};

/**
 * Runs `use` with a key agent built from the words for one sign call and
 * disposes it afterwards. The derived account key
 * must match the expected one, so words that belong to another wallet
 * never sign.
 */
const withKeyAgentFromWords = async <T>(
  {
    words,
    accountIndex,
    chainId,
    extendedAccountPublicKey,
  }: SignWithWordsAccount,
  use: (keyAgent: CardanoKeyAgent) => Promise<T>,
): Promise<T> => {
  const keyAgent = await createCardanoKeyAgentFromMnemonic({
    accountIndex,
    chainId,
    mnemonicWords: [...words],
  });
  try {
    if (keyAgent.extendedAccountPublicKey !== extendedAccountPublicKey) {
      throw new AccountKeyMismatchError();
    }
    return await use(keyAgent);
  } finally {
    keyAgent.dispose?.();
  }
};

/**
 * The extended public key of one account of the words, the same key the
 * in-memory wallet stores for that account. The key does not depend on the
 * network, so it is derived over mainnet as the wallet derives it. The agent is
 * disposed before the key is returned.
 */
export const deriveCardanoAccountPublicKeyFromWords = async ({
  words,
  accountIndex,
}: DeriveCardanoAccountPublicKeyFromWordsProps): Promise<Bip32PublicKeyHex> => {
  const keyAgent = await createCardanoKeyAgentFromMnemonic({
    accountIndex,
    chainId: Cardano.ChainIds.Mainnet,
    mnemonicWords: [...words],
  });
  try {
    return keyAgent.extendedAccountPublicKey;
  } finally {
    keyAgent.dispose?.();
  }
};

/**
 * Signs one transaction with a key agent built from mnemonic words. Produces
 * the same witnesses as the in-memory transaction signer over the same
 * account.
 */
export const signCardanoTransactionWithWords = async ({
  serializedTx,
  utxo,
  ...account
}: SignCardanoTransactionWithWordsProps): Promise<CardanoSignResult> =>
  withKeyAgentFromWords(account, async keyAgent =>
    firstValueFrom(
      new CardanoInMemoryTransactionSigner({
        withKeyAgent$: use => use(keyAgent),
        knownAddresses: account.knownAddresses,
        utxo,
        auth: WORDS_AUTH,
      }).sign({ serializedTx }),
    ),
  );

/**
 * Signs CIP-8 data with a key agent built from mnemonic words. Produces the
 * same signature as the in-memory data signer over the same account.
 */
export const signCardanoDataWithWords = async ({
  signWith,
  payload,
  ...account
}: SignCardanoDataWithWordsProps): Promise<CardanoSignDataResult> =>
  withKeyAgentFromWords(account, async keyAgent =>
    firstValueFrom(
      new CardanoInMemoryDataSigner({
        withKeyAgent$: use => use(keyAgent),
        dRepKeyHash$: from(
          deriveDRepKeyHash({
            accountIndex: account.accountIndex,
            chainId: account.chainId,
            extendedAccountPublicKey: account.extendedAccountPublicKey,
          }),
        ),
        knownAddresses: account.knownAddresses,
        auth: WORDS_AUTH,
      }).signData({ signWith, payload }),
    ),
  );
