import { Serialization } from '@cardano-sdk/core';
import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import { LedgerKeyAgent } from '@cardano-sdk/hardware-ledger';
import {
  CommunicationType,
  KeyPurpose,
  util,
} from '@cardano-sdk/key-management';
import { createInputResolver } from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-sdk/util';
import { from } from 'rxjs';
import { dummyLogger } from 'ts-log';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoSignRequest,
  CardanoSignResult,
  CardanoTransactionSigner,
} from '@lace-contract/cardano-context';
import type { Observable } from 'rxjs';

export interface CardanoLedgerTransactionSignerProps {
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  knownAddresses: GroupedAddress[];
  utxo: Cardano.Utxo[];
}

export class CardanoLedgerTransactionSigner
  implements CardanoTransactionSigner
{
  readonly #props: CardanoLedgerTransactionSignerProps;

  public constructor(props: CardanoLedgerTransactionSignerProps) {
    this.#props = props;
  }

  public sign(request: CardanoSignRequest): Observable<CardanoSignResult> {
    return from(this.#signTransaction(request.serializedTx));
  }

  async #signTransaction(serializedTx: HexBytes): Promise<CardanoSignResult> {
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

    const tx = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(serializedTx),
    );

    const txInKeyPathMap = await util.createTxInKeyPathMap(
      tx.body().toCore(),
      this.#props.knownAddresses,
      createInputResolver(this.#props.utxo),
    );

    try {
      const signatures = await keyAgent.signTransaction(tx.body(), {
        knownAddresses: this.#props.knownAddresses,
        txInKeyPathMap,
      });

      const witnessSet = tx.witnessSet();
      witnessSet.setVkeys(
        Serialization.CborSet.fromCore(
          [...signatures.entries()] as Parameters<
            typeof Serialization.VkeyWitness.fromCore
          >[0][],
          Serialization.VkeyWitness.fromCore,
        ),
      );

      const signedTx = new Serialization.Transaction(
        tx.body(),
        witnessSet,
        tx.auxiliaryData(),
      );

      return {
        serializedTx: HexBytes(signedTx.toCbor()),
        signatureCount: signatures.size,
      };
    } finally {
      await keyAgent.deviceConnection?.transport?.close();
    }
  }
}
