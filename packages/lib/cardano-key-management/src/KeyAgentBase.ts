import { blake2b } from '@lace-lib/cardano-crypto';

import { Bip32Account } from './Bip32Account';
import { KeyPurpose } from './types';

import type { Cip8SignDataContext } from './cip8';
import type {
  AccountAddressDerivationPath,
  AccountKeyDerivationPath,
  GroupedAddress,
  KeyAgent,
  KeyAgentDependencies,
  SerializableKeyAgentData,
  SignBlobResult,
  SignTransactionContext,
  SignTransactionOptions,
} from './types';
import type { Cardano, Serialization } from '@lace-lib/cardano-core';
import type * as Crypto from '@lace-lib/cardano-crypto';
import type { Cip30DataSignature } from '@lace-lib/cardano-dapp-connector';
import type { HexBlob } from '@lace-lib/util/common';

export abstract class KeyAgentBase implements KeyAgent {
  readonly #serializableData: SerializableKeyAgentData;
  readonly #bip32Ed25519: Crypto.Bip32Ed25519;
  readonly #account: Bip32Account;

  get serializableData(): SerializableKeyAgentData {
    return this.#serializableData;
  }
  get extendedAccountPublicKey(): Crypto.Bip32PublicKeyHex {
    return this.serializableData.extendedAccountPublicKey;
  }
  get chainId(): Cardano.ChainId {
    return this.serializableData.chainId;
  }
  get accountIndex(): number {
    return this.serializableData.accountIndex;
  }
  get bip32Ed25519(): Crypto.Bip32Ed25519 {
    return this.#bip32Ed25519;
  }

  get purpose(): KeyPurpose {
    return this.serializableData.purpose || KeyPurpose.STANDARD;
  }

  abstract signBlob(
    derivationPath: AccountKeyDerivationPath,
    blob: HexBlob,
  ): Promise<SignBlobResult>;
  abstract signCip8Data(
    context: Cip8SignDataContext,
  ): Promise<Cip30DataSignature>;
  abstract exportRootPrivateKey(): Promise<Crypto.Bip32PrivateKeyHex>;
  abstract signTransaction(
    txBody: Serialization.TransactionBody,
    context: SignTransactionContext,
    signTransactionOptions?: SignTransactionOptions,
  ): Promise<Cardano.Signatures>;

  constructor(
    serializableData: SerializableKeyAgentData,
    { bip32Ed25519 }: KeyAgentDependencies,
  ) {
    this.#serializableData = serializableData;
    this.#bip32Ed25519 = bip32Ed25519;
    this.#account = new Bip32Account(serializableData, {
      bip32Ed25519,
      blake2b,
    });
  }

  /** See https://github.com/cardano-foundation/CIPs/tree/master/CIP-1852#specification */
  async deriveAddress(
    paymentKeyDerivationPath: AccountAddressDerivationPath,
    stakeKeyDerivationIndex: number,
  ): Promise<GroupedAddress> {
    return this.#account.deriveAddress(
      paymentKeyDerivationPath,
      stakeKeyDerivationIndex,
    );
  }

  async derivePublicKey(
    derivationPath: AccountKeyDerivationPath,
  ): Promise<Crypto.Ed25519PublicKeyHex> {
    return this.#account.derivePublicKey(derivationPath);
  }
}
