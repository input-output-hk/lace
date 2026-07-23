import { Buffer } from 'buffer';

import { Cardano, Serialization } from '@cardano-sdk/core';
import { TxInId, util } from '@cardano-sdk/key-management';
import { HexBlob } from '@cardano-sdk/util';
import { airGappedQrExchangeHook } from '@lace-contract/air-gapped-qr-exchange';
import {
  createInputResolver,
  deriveDRepKeyHash,
} from '@lace-contract/cardano-context';
import {
  ADA_TX_SIZE_LIMIT,
  buildTxHashSignRequest,
  buildTxSignRequest,
  KeystoneUrType,
  parseTxHashSignResponse,
  parseTxSignResponse,
  RequestId,
} from '@lace-lib/cardano-keystone-protocol';
import { HexBytes } from '@lace-lib/util';
import { from, map, switchMap } from 'rxjs';
import { v4 } from 'uuid';

import { KEYSTONE_REQUEST_ORIGIN } from '../../const';

import {
  fullDerivationPath,
  ROLE_DREP,
  ROLE_STAKE,
  xfpFromMasterFingerprint,
} from './keystone-paths';

import type { Cardano as CardanoTypes } from '@cardano-sdk/core';
import type {
  Bip32PublicKeyHex,
  Ed25519KeyHashHex,
  Ed25519PublicKeyHex,
  Ed25519SignatureHex,
} from '@cardano-sdk/crypto';
import type {
  GroupedAddress,
  TxInKeyPathMap,
} from '@cardano-sdk/key-management';
import type {
  AirGappedQrExchangeOptions,
  AirGappedQrExchangeResult,
} from '@lace-contract/air-gapped-qr-exchange';
import type {
  CardanoSignRequest,
  CardanoSignResult,
  CardanoTransactionSigner,
  MasterFingerprint,
} from '@lace-contract/cardano-context';
import type {
  BuiltRequest,
  TxExtraSigner,
  TxSigningInput,
  Xfp,
} from '@lace-lib/cardano-keystone-protocol';
import type { Observable } from 'rxjs';

export interface CardanoKeystoneTransactionSignerProps {
  accountIndex: number;
  chainId: CardanoTypes.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  masterFingerprint?: MasterFingerprint;
  knownAddresses: GroupedAddress[];
  utxo: CardanoTypes.Utxo[];
}

/**
 * Signs a Cardano transaction with an air-gapped Keystone by displaying the
 * unsigned tx as an animated 'cardano-sign-request' QR and scanning the
 * device's 'cardano-signature' reply. The host resolves which inputs and
 * extra signers the device owns; the device cannot fetch anything itself, so
 * every own input carries its amount and address for on-device display. The
 * reply's witness set is merged into the transaction, preserving any
 * witnesses it already carries (no private keys leave the device).
 *
 * Transactions at or above the firmware's ADA size limit cannot be parsed by
 * the device and fall back to hash signing: a 'cardano-sign-tx-hash-request'
 * carrying the transaction id, the owned signer paths, and the owned input
 * addresses. The exchange overlay shows the hash so the user can cross-check
 * it against the device screen, and the reply is the raw witness set CBOR.
 */
export class CardanoKeystoneTransactionSigner
  implements CardanoTransactionSigner
{
  readonly #props: CardanoKeystoneTransactionSignerProps;

  public constructor(props: CardanoKeystoneTransactionSignerProps) {
    this.#props = props;
  }

  public sign(request: CardanoSignRequest): Observable<CardanoSignResult> {
    return from(this.#buildRequest(request.serializedTx)).pipe(
      switchMap(({ tx, signRequest, requestId, txHash }) =>
        airGappedQrExchangeHook
          .trigger(this.#exchangeOptions(signRequest, txHash))
          .pipe(
            map(result =>
              this.#applyWitnessSet(
                tx,
                txHash === undefined
                  ? this.#verifiedWitnessSet(result, requestId)
                  : parseTxHashSignResponse(result).witnessSet,
              ),
            ),
          ),
      ),
    );
  }

  async #buildRequest(serializedTx: HexBytes): Promise<{
    tx: Serialization.Transaction;
    signRequest: BuiltRequest;
    requestId: RequestId;
    txHash?: string;
  }> {
    const tx = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(serializedTx),
    );
    const txBody = tx.body().toCore();

    const txInKeyPathMap = await util.createTxInKeyPathMap(
      txBody,
      this.#props.knownAddresses,
      createInputResolver(this.#props.utxo),
    );

    const xfp = xfpFromMasterFingerprint(this.#props.masterFingerprint);
    const dRepKeyHash = await deriveDRepKeyHash({
      accountIndex: this.#props.accountIndex,
      chainId: this.#props.chainId,
      extendedAccountPublicKey: this.#props.extendedAccountPublicKey,
    });
    const utxos = this.#buildSigningInputs(txBody, txInKeyPathMap, xfp);
    const extraSigners = this.#buildExtraSigners({
      txBody,
      txInKeyPathMap,
      xfp,
      dRepKeyHash,
    });

    const requestId = RequestId(v4());
    const signData = new Uint8Array(Buffer.from(serializedTx, 'hex'));

    if (signData.length >= ADA_TX_SIZE_LIMIT) {
      const txHash = tx.getId();
      const signRequest = buildTxHashSignRequest({
        requestId,
        txHash: new Uint8Array(Buffer.from(txHash, 'hex')),
        paths: [...utxos, ...extraSigners].map(({ path, xfp: pathXfp }) => ({
          path,
          xfp: pathXfp,
        })),
        addressList: utxos.map(({ address }) => address),
        origin: KEYSTONE_REQUEST_ORIGIN,
      });
      return { tx, signRequest, requestId, txHash };
    }

    const signRequest = buildTxSignRequest({
      requestId,
      signData,
      utxos,
      extraSigners,
      origin: KEYSTONE_REQUEST_ORIGIN,
    });

    return { tx, signRequest, requestId };
  }

  /**
   * Exchange options for the signing request. For hash signing the overlay
   * additionally shows the blind-signing instruction and the transaction id
   * as a detail line while the request QR is displayed, so the user can
   * cross-check the hash the device displays before approving; the scan
   * phase keeps the standard scan instruction.
   */
  #exchangeOptions(
    signRequest: BuiltRequest,
    txHash: string | undefined,
  ): AirGappedQrExchangeOptions {
    const options: AirGappedQrExchangeOptions = {
      request: {
        urType: signRequest.urType,
        cbor: signRequest.cbor,
      },
      expectedResponseType: KeystoneUrType.TxSignResponse,
    };
    return txHash === undefined
      ? options
      : {
          ...options,
          requestInstructionKey:
            'v2.air-gapped-qr-exchange.blind-signing.instruction',
          detail: txHash,
        };
  }

  /**
   * Parses a full tx signing reply and verifies the echoed request id. Hash
   * signing replies carry no request id (the raw witness set is the whole
   * body), so this check only applies to the full signing path.
   */
  #verifiedWitnessSet(
    result: AirGappedQrExchangeResult,
    requestId: RequestId,
  ): Uint8Array {
    const response = parseTxSignResponse(result);
    if (response.requestId !== requestId) {
      throw new Error(
        `Keystone returned a stale or mismatched response: expected request id ${requestId}, got ${response.requestId}`,
      );
    }
    return response.witnessSet;
  }

  /**
   * Own spend inputs the device must witness, each carrying the amount and
   * address of the consumed UTxO so the device can display totals and compute
   * the fee. Only tx.body.inputs are listed here; owned collateral inputs are
   * routed through extraSigners instead, matching the request shape Keystone
   * firmware is proven to accept.
   */
  #buildSigningInputs(
    txBody: CardanoTypes.TxBody,
    txInKeyPathMap: TxInKeyPathMap,
    xfp: Xfp,
  ): TxSigningInput[] {
    const seen = new Set<string>();
    const inputs: TxSigningInput[] = [];
    for (const input of txBody.inputs) {
      const id = TxInId(input);
      if (seen.has(id)) continue;
      const keyPath = txInKeyPathMap[id];
      if (keyPath === undefined) continue;
      seen.add(id);
      const resolved = this.#props.utxo.find(
        ([txIn]) => txIn.txId === input.txId && txIn.index === input.index,
      );
      if (resolved === undefined) {
        throw new Error(
          `Keystone signing input is missing from the wallet utxo set: ${input.txId}#${input.index}`,
        );
      }
      const [, txOut] = resolved;
      inputs.push({
        transactionHash: new Uint8Array(Buffer.from(input.txId, 'hex')),
        index: Number(input.index),
        amount: txOut.value.coins,
        address: txOut.address,
        path: fullDerivationPath(
          this.#props.accountIndex,
          keyPath.role,
          keyPath.index,
        ),
        xfp,
      });
    }
    return inputs;
  }

  /**
   * Non-spend-input key paths the tx still requires the device to sign with:
   * owned collateral inputs, the stake key for stake certificates/withdrawals,
   * the DRep key for DRep/voting certificates, plus required extra signers.
   * Uses the same ownSignatureKeyPaths the in-memory and Ledger/Trezor signers
   * rely on, then drops the paths already covered by the spend inputs so each
   * witness is requested once. Keystone identifies each extra signer by its
   * key hash.
   */
  #buildExtraSigners({
    txBody,
    txInKeyPathMap,
    xfp,
    dRepKeyHash,
  }: {
    txBody: CardanoTypes.TxBody;
    txInKeyPathMap: TxInKeyPathMap;
    xfp: Xfp;
    dRepKeyHash: Ed25519KeyHashHex;
  }): TxExtraSigner[] {
    const keyPaths = util.ownSignatureKeyPaths(
      txBody,
      this.#props.knownAddresses,
      txInKeyPathMap,
      dRepKeyHash,
    );
    const seen = new Set(
      txBody.inputs
        .map(input => txInKeyPathMap[TxInId(input)])
        .filter((path): path is NonNullable<typeof path> => path !== undefined)
        .map(({ role, index }) => `${role}.${index}`),
    );

    const extraSigners: TxExtraSigner[] = [];
    for (const { role, index } of keyPaths) {
      const key = `${role}.${index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      extraSigners.push({
        keyHash: this.#resolveKeyHash(role, index, dRepKeyHash),
        path: fullDerivationPath(this.#props.accountIndex, role, index),
        xfp,
      });
    }
    return extraSigners;
  }

  /**
   * Resolves the Ed25519 key hash for an extra signer path: the derived DRep
   * key hash for the DRep role, the reward account hash for the stake role,
   * and the payment credential of the matching known address otherwise.
   */
  #resolveKeyHash(
    role: number,
    index: number,
    dRepKeyHash: Ed25519KeyHashHex,
  ): Uint8Array {
    if (role === ROLE_DREP) {
      return new Uint8Array(Buffer.from(dRepKeyHash, 'hex'));
    }
    if (role === ROLE_STAKE) {
      const known = this.#props.knownAddresses.find(
        address =>
          address.rewardAccount !== undefined &&
          (address.stakeKeyDerivationPath?.index ?? 0) === index,
      );
      if (known === undefined) {
        throw new Error(
          `Keystone cannot resolve the stake key hash at index ${index}`,
        );
      }
      return new Uint8Array(
        Buffer.from(Cardano.RewardAccount.toHash(known.rewardAccount), 'hex'),
      );
    }
    const known = this.#props.knownAddresses.find(
      address => Number(address.type) === role && address.index === index,
    );
    const paymentKeyHash =
      known === undefined
        ? undefined
        : Cardano.Address.fromString(known.address)?.getProps().paymentPart
            ?.hash;
    if (paymentKeyHash === undefined) {
      throw new Error(
        `Keystone cannot resolve the payment key hash at role ${role}, index ${index}`,
      );
    }
    return new Uint8Array(Buffer.from(paymentKeyHash, 'hex'));
  }

  /**
   * Merges the device's CBOR witness set into the transaction. The device may
   * return only its own vkey witnesses, so any witnesses the transaction
   * already carries are preserved; a device witness for the same vkey replaces
   * the existing one.
   */
  #applyWitnessSet(
    tx: Serialization.Transaction,
    witnessSetCbor: Uint8Array,
  ): CardanoSignResult {
    const deviceWitnessSet = Serialization.TransactionWitnessSet.fromCbor(
      HexBlob.fromBytes(witnessSetCbor),
    );
    const deviceWitnesses = deviceWitnessSet.vkeys()?.values() ?? [];
    if (deviceWitnesses.length === 0) {
      throw new Error('Keystone returned no transaction witnesses');
    }

    const merged = new Map<
      Ed25519PublicKeyHex,
      [Ed25519PublicKeyHex, Ed25519SignatureHex]
    >();
    const witnessSet = tx.witnessSet();
    for (const witness of witnessSet.vkeys()?.values() ?? []) {
      merged.set(witness.vkey(), witness.toCore());
    }
    for (const witness of deviceWitnesses) {
      merged.set(witness.vkey(), witness.toCore());
    }
    witnessSet.setVkeys(
      Serialization.CborSet.fromCore(
        [...merged.values()],
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
      signatureCount: deviceWitnesses.length,
    };
  }
}
