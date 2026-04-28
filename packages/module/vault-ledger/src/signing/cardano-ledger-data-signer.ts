import { Cardano } from '@cardano-sdk/core';
import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import { LedgerKeyAgent } from '@cardano-sdk/hardware-ledger';
import { CommunicationType, KeyPurpose } from '@cardano-sdk/key-management';
import { HexBlob } from '@cardano-sdk/util';
import { HexBytes } from '@lace-sdk/util';
import { from } from 'rxjs';
import { dummyLogger } from 'ts-log';

import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoDataSigner,
  CardanoSignDataRequest,
  CardanoSignDataResult,
} from '@lace-contract/cardano-context';
import type { Observable } from 'rxjs';

export interface CardanoLedgerDataSignerProps {
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  knownAddresses: GroupedAddress[];
}

export class CardanoLedgerDataSigner implements CardanoDataSigner {
  readonly #props: CardanoLedgerDataSignerProps;

  public constructor(props: CardanoLedgerDataSignerProps) {
    this.#props = props;
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
    const deviceConnection = await LedgerKeyAgent.establishDeviceConnection(
      CommunicationType.Web,
    );
    const keyAgent = new LedgerKeyAgent(
      {
        accountIndex: this.#props.accountIndex,
        chainId: this.#props.chainId,
        communicationType: CommunicationType.Web,
        deviceConnection,
        extendedAccountPublicKey: this.#props.extendedAccountPublicKey,
        purpose: KeyPurpose.STANDARD,
      },
      { bip32Ed25519, logger: dummyLogger },
    );

    try {
      const result = await keyAgent.signCip8Data({
        knownAddresses: this.#props.knownAddresses,
        signWith: Cardano.PaymentAddress(request.signWith),
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
