import { Buffer } from 'buffer';

import { Serialization } from '@cardano-sdk/core';
import { TxInId, util } from '@cardano-sdk/key-management';
import { airGappedQrExchangeHook } from '@lace-contract/air-gapped-qr-exchange';
import {
  createInputResolver,
  deriveDRepKeyHash,
} from '@lace-contract/cardano-context';
import {
  buildTxSignRequest,
  CardanoUrType,
  parseTxSignResponse,
  RequestId,
} from '@lace-lib/cardano-seed-signer-protocol';
import { HexBytes } from '@lace-lib/util';
import { from, map, switchMap } from 'rxjs';
import { v4 } from 'uuid';

import {
  fullDerivationPath,
  xfpFromMasterFingerprint,
} from './seed-signer-paths';

import type { Cardano as CardanoTypes } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex, Ed25519KeyHashHex } from '@cardano-sdk/crypto';
import type {
  GroupedAddress,
  TxInKeyPathMap,
} from '@cardano-sdk/key-management';
import type {
  CardanoSignRequest,
  CardanoSignResult,
  CardanoTransactionSigner,
  MasterFingerprint,
} from '@lace-contract/cardano-context';
import type {
  ChangeOutput,
  ExtraSigner,
  ParsedVkeyWitness,
  SigningInput,
} from '@lace-lib/cardano-seed-signer-protocol';
import type { Observable } from 'rxjs';

export interface CardanoSeedSignerTransactionSignerProps {
  accountIndex: number;
  chainId: CardanoTypes.ChainId;
  extendedAccountPublicKey: Bip32PublicKeyHex;
  masterFingerprint?: MasterFingerprint;
  knownAddresses: GroupedAddress[];
  utxo: CardanoTypes.Utxo[];
}

/**
 * Signs a Cardano transaction with an air-gapped Seed Signer by displaying the
 * tx body as an animated 'cardano-tx-sig-req' QR and scanning the device's
 * 'cardano-tx-sig-res' witness set. The host resolves which inputs, change
 * outputs, and extra signers the device owns; the device re-derives keys from
 * those paths and returns vkey witnesses (no private keys leave the device).
 */
export class CardanoSeedSignerTransactionSigner
  implements CardanoTransactionSigner
{
  readonly #props: CardanoSeedSignerTransactionSignerProps;

  public constructor(props: CardanoSeedSignerTransactionSignerProps) {
    this.#props = props;
  }

  public sign(request: CardanoSignRequest): Observable<CardanoSignResult> {
    return from(this.#buildRequest(request.serializedTx)).pipe(
      switchMap(({ tx, signRequest, requestId }) =>
        airGappedQrExchangeHook
          .trigger({
            request: {
              urType: signRequest.urType,
              cbor: signRequest.cbor,
            },
            expectedResponseType: CardanoUrType.TxSignResponse,
          })
          .pipe(
            map(result => {
              const response = parseTxSignResponse(result.cbor);
              if (response.requestId !== requestId) {
                throw new Error(
                  `Seed signer returned a stale or mismatched response: expected request id ${requestId}, got ${response.requestId}`,
                );
              }
              return this.#applyWitnesses(tx, response.witnesses);
            }),
          ),
      ),
    );
  }

  async #buildRequest(serializedTx: HexBytes): Promise<{
    tx: Serialization.Transaction;
    signRequest: { urType: string; cbor: Uint8Array };
    requestId: RequestId;
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
    const signingInputs = this.#buildSigningInputs(txBody, txInKeyPathMap, xfp);
    const changeOutputs = this.#buildChangeOutputs(txBody, xfp);
    const extraSigners = this.#buildExtraSigners({
      txBody,
      txInKeyPathMap,
      xfp,
      dRepKeyHash,
    });
    const collateralReturnPath = this.#buildCollateralReturnPath(txBody, xfp);

    const requestId = RequestId(v4());
    const signRequest = buildTxSignRequest({
      serializedTxBody: Buffer.from(tx.body().toCbor(), 'hex'),
      signingInputs,
      changeOutputs,
      extraSigners,
      network: this.#props.chainId.networkId,
      requestId,
      collateralReturnPath,
    });

    return { tx, signRequest, requestId };
  }

  /**
   * Non-input key paths the tx still requires the device to sign with -- the
   * stake key for stake certificates/withdrawals, the DRep key for DRep/voting
   * certificates, plus required extra signers. Uses the same ownSignatureKeyPaths
   * the in-memory and Ledger/Trezor signers rely on, then drops the paths
   * already covered by signingInputs so each witness is requested once.
   */
  #buildExtraSigners({
    txBody,
    txInKeyPathMap,
    xfp,
    dRepKeyHash,
  }: {
    txBody: CardanoTypes.TxBody;
    txInKeyPathMap: TxInKeyPathMap;
    xfp: ReturnType<typeof xfpFromMasterFingerprint>;
    dRepKeyHash: Ed25519KeyHashHex;
  }): ExtraSigner[] {
    const keyPaths = util.ownSignatureKeyPaths(
      txBody,
      this.#props.knownAddresses,
      txInKeyPathMap,
      dRepKeyHash,
    );
    const seen = new Set(
      Object.values(txInKeyPathMap)
        .filter((path): path is NonNullable<typeof path> => path !== undefined)
        .map(({ role, index }) => `${role}.${index}`),
    );

    const extraSigners: ExtraSigner[] = [];
    for (const { role, index } of keyPaths) {
      const key = `${role}.${index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      extraSigners.push({
        xfp,
        path: fullDerivationPath(this.#props.accountIndex, role, index),
      });
    }
    return extraSigners;
  }

  #buildSigningInputs(
    txBody: CardanoTypes.TxBody,
    txInKeyPathMap: TxInKeyPathMap,
    xfp: ReturnType<typeof xfpFromMasterFingerprint>,
  ): SigningInput[] {
    // Collateral inputs are owned UTxOs that still need a vkey witness, even
    // when the spend inputs are script-locked (Plutus).
    const seen = new Set<string>();
    const inputs: SigningInput[] = [];
    for (const input of [...txBody.inputs, ...(txBody.collaterals ?? [])]) {
      const id = TxInId(input);
      if (seen.has(id)) continue;
      const keyPath = txInKeyPathMap[id];
      if (keyPath === undefined) continue;
      seen.add(id);
      inputs.push({
        txHash: Buffer.from(input.txId, 'hex'),
        index: Number(input.index),
        xfp,
        path: fullDerivationPath(
          this.#props.accountIndex,
          keyPath.role,
          keyPath.index,
        ),
      });
    }
    return inputs;
  }

  /**
   * Derivation path proving the collateral return output pays back to this
   * wallet, so the device can badge it as a verified own address. Omitted when
   * the output is absent or not ours (the device then shows it as external),
   * and when no master fingerprint is known -- the device rejects a
   * collateral_return_path whose xfp is not exactly 4 bytes.
   */
  #buildCollateralReturnPath(
    txBody: CardanoTypes.TxBody,
    xfp: ReturnType<typeof xfpFromMasterFingerprint>,
  ): ExtraSigner | undefined {
    if (txBody.collateralReturn === undefined || xfp.length === 0) {
      return undefined;
    }
    const known = this.#props.knownAddresses.find(
      addr => addr.address === txBody.collateralReturn?.address,
    );
    if (known === undefined) return undefined;
    return {
      xfp,
      path: fullDerivationPath(
        this.#props.accountIndex,
        known.type,
        known.index,
      ),
    };
  }

  #buildChangeOutputs(
    txBody: CardanoTypes.TxBody,
    xfp: ReturnType<typeof xfpFromMasterFingerprint>,
  ): ChangeOutput[] {
    const changeOutputs: ChangeOutput[] = [];
    txBody.outputs.forEach((output, index) => {
      const known = this.#props.knownAddresses.find(
        addr => addr.address === output.address,
      );
      if (known === undefined) return;
      changeOutputs.push({
        index,
        xfp,
        path: fullDerivationPath(
          this.#props.accountIndex,
          known.type,
          known.index,
        ),
      });
    });
    return changeOutputs;
  }

  #applyWitnesses(
    tx: Serialization.Transaction,
    witnesses: readonly ParsedVkeyWitness[],
  ): CardanoSignResult {
    if (witnesses.length === 0) {
      throw new Error('Seed signer returned no transaction witnesses');
    }

    const witnessSet = tx.witnessSet();
    witnessSet.setVkeys(
      Serialization.CborSet.fromCore(
        witnesses.map(witness => [witness.vkey, witness.signature]),
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
      signatureCount: witnesses.length,
    };
  }
}
