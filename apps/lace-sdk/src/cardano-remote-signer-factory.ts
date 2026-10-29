import { withCollateralOwnershipGuard } from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-lib/util';
import { defer, from, map } from 'rxjs';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  CardanoBip32AccountProps,
  CardanoDataSigner,
  CardanoSignDataResult,
  CardanoSignerContext,
  CardanoSignerFactory,
  CardanoSignResult,
  CardanoTransactionSigner,
  CardanoTransactionSignerContext,
} from '@lace-contract/cardano-context';
import type {
  AnyAccount,
  LazyInMemoryWalletAccount,
} from '@lace-contract/wallet-repo';
import type { SignerClient } from '@lace-lib/passkey';

/** The part of the signer client that carries sign requests. */
export type RemoteSignerRequester = Pick<SignerClient, 'request'>;

/** The options of the {@link CardanoRemoteSignerFactory} constructor. */
export type CardanoRemoteSignerFactoryProps = {
  /**
   * The signer client every sign request goes through, such as one
   * `createSignerClient` returns.
   */
  client: RemoteSignerRequester;
};

/** The signer answered a request with a result of the wrong shape. */
export class RemoteSignerResultError extends Error {
  public constructor() {
    super('The signer returned a malformed result.');
    this.name = 'RemoteSignerResultError';
  }
}

type RemoteAccountProps = {
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseSignResult = (result: unknown): CardanoSignResult => {
  if (
    !isRecord(result) ||
    typeof result.serializedTx !== 'string' ||
    typeof result.signatureCount !== 'number'
  ) {
    throw new RemoteSignerResultError();
  }
  return {
    serializedTx: HexBytes(result.serializedTx),
    signatureCount: result.signatureCount,
  };
};

const parseSignDataResult = (result: unknown): CardanoSignDataResult => {
  if (
    !isRecord(result) ||
    typeof result.signature !== 'string' ||
    typeof result.key !== 'string'
  ) {
    throw new RemoteSignerResultError();
  }
  return { signature: HexBytes(result.signature), key: HexBytes(result.key) };
};

/**
 * Signer factory for {@link WalletType.LazyInMemory} Cardano accounts whose
 * passkey lives with the Lace signer page. Each sign request travels to the
 * signer with the transaction and the public account data, and only the
 * signed transaction or signature comes back; the mnemonic never reaches
 * the dApp. Consent is the Approve click inside the signer, so no local
 * authentication prompt runs.
 */
export class CardanoRemoteSignerFactory implements CardanoSignerFactory {
  readonly #client: RemoteSignerRequester;

  public constructor(props: CardanoRemoteSignerFactoryProps) {
    this.#client = props.client;
  }

  public canSign(account: AnyAccount): boolean {
    return (
      account.accountType === 'LazyInMemory' &&
      account.blockchainName === 'Cardano'
    );
  }

  public createTransactionSigner(
    context: CardanoTransactionSignerContext,
  ): CardanoTransactionSigner {
    const { knownAddresses, utxo } = context;
    const account = this.#resolveAccountProps(context);

    return withCollateralOwnershipGuard(
      {
        sign: ({ serializedTx }) =>
          defer(() =>
            from(
              this.#client.request('sign-cardano-tx', {
                serializedTx,
                knownAddresses,
                utxo,
                ...account,
              }),
            ),
          ).pipe(map(parseSignResult)),
      },
      context,
    );
  }

  public createDataSigner(context: CardanoSignerContext): CardanoDataSigner {
    const { knownAddresses } = context;
    const account = this.#resolveAccountProps(context);

    return {
      signData: ({ signWith, payload }) =>
        defer(() =>
          from(
            this.#client.request('sign-cardano-data', {
              signWith,
              payload,
              knownAddresses,
              ...account,
            }),
          ),
        ).pipe(map(parseSignDataResult)),
    };
  }

  /** Reads the public account data the signer needs from the context. */
  #resolveAccountProps(context: CardanoSignerContext): RemoteAccountProps {
    const account = context.wallet.accounts.find(
      a => a.accountId === context.accountId,
    );
    if (!account || !this.canSign(account)) {
      throw new Error(
        `CardanoRemoteSignerFactory does not support account type: ${
          account?.accountType ?? 'unknown'
        }`,
      );
    }
    const { accountIndex, chainId, extendedAccountPublicKey } = (
      account as LazyInMemoryWalletAccount<CardanoBip32AccountProps>
    ).blockchainSpecific;
    return {
      accountIndex,
      chainId: {
        networkId: chainId.networkId,
        networkMagic: chainId.networkMagic,
      },
      extendedAccountPublicKey,
    };
  }
}
