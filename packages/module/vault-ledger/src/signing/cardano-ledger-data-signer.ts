import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import { HexBlob } from '@cardano-sdk/util';
import { HexBytes } from '@lace-sdk/util';
import { from } from 'rxjs';
import { dummyLogger } from 'ts-log';

import { resolveLedgerDeviceDescriptor } from './resolve-device-descriptor';

import type { CardanoLedgerSignerFactoryDependencies } from './cardano-ledger-signer-factory';
import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoDataSigner,
  CardanoSignDataRequest,
  CardanoSignDataResult,
} from '@lace-contract/cardano-context';
import type { HardwareWalletLedger } from '@lace-contract/wallet-repo';
import type { Observable } from 'rxjs';

export interface CardanoLedgerDataSignerProps {
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  knownAddresses: GroupedAddress[];
  wallet: HardwareWalletLedger;
}

export class CardanoLedgerDataSigner implements CardanoDataSigner {
  readonly #props: CardanoLedgerDataSignerProps;
  readonly #dependencies: CardanoLedgerSignerFactoryDependencies;

  public constructor(
    props: CardanoLedgerDataSignerProps,
    dependencies: CardanoLedgerSignerFactoryDependencies,
  ) {
    this.#props = props;
    this.#dependencies = dependencies;
  }

  public signData(
    request: CardanoSignDataRequest,
  ): Observable<CardanoSignDataResult> {
    return from(this.#signData(request));
  }

  async #signData(
    request: CardanoSignDataRequest,
  ): Promise<CardanoSignDataResult> {
    const bip32Ed25519 = await SodiumBip32Ed25519.create();
    const descriptor = await resolveLedgerDeviceDescriptor(
      this.#props.wallet.walletId,
      this.#dependencies.resolveLegacyDevice,
    );
    const keyAgent = await this.#dependencies.transport.createKeyAgent(
      {
        descriptor,
        accountIndex: this.#props.accountIndex,
        chainId: this.#props.chainId,
        extendedAccountPublicKey: this.#props.extendedAccountPublicKey,
      },
      { bip32Ed25519, logger: dummyLogger },
    );

    try {
      const result = await keyAgent.signCip8Data({
        knownAddresses: this.#props.knownAddresses,
        signWith: request.signWith,
        payload: HexBlob(request.payload),
      });

      return {
        signature: HexBytes(result.signature),
        key: HexBytes(result.key),
      };
    } finally {
      await keyAgent.deviceConnection?.transport?.close();
    }
  }
}
