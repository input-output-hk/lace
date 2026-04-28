import { Serialization } from '@cardano-sdk/core';
import { SodiumBip32Ed25519 } from '@cardano-sdk/crypto';
import { TrezorKeyAgent } from '@cardano-sdk/hardware-trezor';
import {
  CommunicationType,
  KeyPurpose,
  util,
} from '@cardano-sdk/key-management';
import { createInputResolver } from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-sdk/util';
import TrezorConnect from '@trezor/connect-web';
import { from } from 'rxjs';
import { dummyLogger } from 'ts-log';

import { TREZOR_MANIFEST } from '../const';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type { GroupedAddress } from '@cardano-sdk/key-management';
import type {
  CardanoSignRequest,
  CardanoSignResult,
  CardanoTransactionSigner,
} from '@lace-contract/cardano-context';
import type { DerivationType } from '@lace-contract/onboarding-v2';
import type { Observable } from 'rxjs';

export interface CardanoTrezorTransactionSignerProps {
  accountIndex: number;
  chainId: Cardano.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  derivationType?: DerivationType;
  knownAddresses: GroupedAddress[];
  utxo: Cardano.Utxo[];
}

export class CardanoTrezorTransactionSigner
  implements CardanoTransactionSigner
{
  readonly #props: CardanoTrezorTransactionSignerProps;

  public constructor(props: CardanoTrezorTransactionSignerProps) {
    this.#props = props;
  }

  public sign(request: CardanoSignRequest): Observable<CardanoSignResult> {
    return from(this.#signTransaction(request.serializedTx));
  }

  async #signTransaction(serializedTx: HexBytes): Promise<CardanoSignResult> {
    const bip32Ed25519 = await SodiumBip32Ed25519.create();

    const trezorConfig = {
      communicationType: CommunicationType.Web,
      manifest: TREZOR_MANIFEST,
      lazyLoad: true,
      ...(this.#props.derivationType
        ? { derivationType: this.#props.derivationType }
        : {}),
    };

    await TrezorKeyAgent.initializeTrezorTransport(trezorConfig);

    try {
      const keyAgent = new TrezorKeyAgent(
        {
          chainId: this.#props.chainId,
          accountIndex: this.#props.accountIndex,
          extendedAccountPublicKey: this.#props.extendedAccountPublicKey,
          trezorConfig,
          purpose: KeyPurpose.STANDARD,
          isTrezorInitialized: true,
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
      TrezorConnect.dispose();
    }
  }
}
