import { Cardano, Serialization } from '@cardano-sdk/core';
import { Ed25519PublicKeyHex, Ed25519SignatureHex } from '@cardano-sdk/crypto';
import {
  TrezorKeyAgent,
  mapAuxiliaryData,
  mapCerts,
  mapRequiredSigners,
  mapTxIns,
  mapTxOuts,
  mapWithdrawals,
  toTxOut,
  type TrezorTxTransformerContext,
} from '@cardano-sdk/hardware-trezor';
import { util } from '@cardano-sdk/key-management';
import { createInputResolver } from '@lace-contract/cardano-context';
import { HexBytes } from '@lace-sdk/util';
import { from } from 'rxjs';

import { DERIVATION_TYPE_TO_TREZOR } from '../mobile/derivation-type';
import { getTrezorConnect } from '../mobile/trezor-connect-bridge';

import type { CardanoTrezorTransactionSignerProps } from './cardano-trezor-transaction-signer';
import type {
  CardanoSignRequest,
  CardanoSignResult,
  CardanoTransactionSigner,
} from '@lace-contract/cardano-context';
import type { Observable } from 'rxjs';

const ARRAY_LEGACY = 0;
const MAP_BABBAGE = 1;

// Replicates the relevant subset of `@cardano-sdk/hardware-trezor`'s
// `trezorTxTransformer`. The package's ESM build does not re-export the full
// transformer (only its sub-helpers), so we compose the same shape here from
// the publicly exported pieces. `additionalWitnessRequests` is omitted —
// multisig flows are not supported on mobile in this iteration.

// Mirrors the SDK's internal `mapTokenMap(_, isMint = true)` helper, which is
// not part of `@cardano-sdk/hardware-trezor`'s public surface. Canonical
// ordering matches Trezor's wire expectation: tokens by assetNameBytes length
// then bytewise; groups by policyId bytewise.
const compareAssetNameCanonically = (
  a: { assetNameBytes: string },
  b: { assetNameBytes: string },
) => {
  if (a.assetNameBytes.length === b.assetNameBytes.length) {
    return a.assetNameBytes > b.assetNameBytes ? 1 : -1;
  }
  return a.assetNameBytes.length > b.assetNameBytes.length ? 1 : -1;
};

const buildMintAssetGroups = (mint: Cardano.TokenMap) => {
  const byPolicy = new Map<
    string,
    Array<{ assetNameBytes: string; mintAmount: string }>
  >();
  for (const [assetId, value] of mint.entries()) {
    const policyId = Cardano.AssetId.getPolicyId(assetId);
    const assetNameBytes = Cardano.AssetId.getAssetName(assetId);
    if (!byPolicy.has(policyId)) byPolicy.set(policyId, []);
    byPolicy
      .get(policyId)!
      .push({ assetNameBytes, mintAmount: value.toString() });
  }

  const groups = [...byPolicy.entries()].map(([policyId, tokenAmounts]) => ({
    policyId,
    tokenAmounts: [...tokenAmounts].sort(compareAssetNameCanonically),
  }));
  groups.sort((a, b) => (a.policyId > b.policyId ? 1 : -1));
  return groups;
};

const buildTrezorTxParams = (
  body: Cardano.TxBody,
  context: TrezorTxTransformerContext,
) => ({
  auxiliaryData: body.auxiliaryDataHash
    ? mapAuxiliaryData(body.auxiliaryDataHash)
    : undefined,
  certificates: body.certificates
    ? mapCerts(body.certificates, context)
    : undefined,
  collateralInputs: body.collaterals
    ? mapTxIns(body.collaterals, context)
    : undefined,
  collateralReturn: body.collateralReturn
    ? toTxOut(
        { index: 0, isCollateral: true, txOut: body.collateralReturn },
        context,
      )
    : undefined,
  fee: body.fee.toString(),
  includeNetworkId: !!body.networkId,
  inputs: mapTxIns(body.inputs, context),
  mint: body.mint ? buildMintAssetGroups(body.mint) : undefined,
  networkId: context.chainId.networkId,
  outputs: mapTxOuts(body.outputs, context),
  protocolMagic: context.chainId.networkMagic,
  referenceInputs: body.referenceInputs?.map(input => ({
    prev_hash: input.txId,
    prev_index: Number(input.index),
  })),
  requiredSigners: body.requiredExtraSignatures
    ? mapRequiredSigners(body.requiredExtraSignatures, context)
    : undefined,
  scriptDataHash: body.scriptIntegrityHash?.toString(),
  tagCborSets: context.tagCborSets,
  totalCollateral: body.totalCollateral?.toString(),
  ttl: body.validityInterval?.invalidHereafter?.toString(),
  validityIntervalStart: body.validityInterval?.invalidBefore?.toString(),
  withdrawals: body.withdrawals
    ? mapWithdrawals(body.withdrawals, context)
    : undefined,
});

export class CardanoTrezorMobileTransactionSigner
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
    const tx = Serialization.Transaction.fromCbor(
      Serialization.TxCBOR(serializedTx),
    );
    const body = tx.body();
    const coreBody = body.toCore();

    const txInKeyPathMap = await util.createTxInKeyPathMap(
      coreBody,
      this.#props.knownAddresses,
      createInputResolver(this.#props.utxo),
    );

    const outputsFormat = body
      .outputs()
      .map(out => (out.isBabbageOutput() ? MAP_BABBAGE : ARRAY_LEGACY));
    const collateralReturnFormat = body.collateralReturn()?.isBabbageOutput()
      ? MAP_BABBAGE
      : ARRAY_LEGACY;

    const trezorTxData = buildTrezorTxParams(coreBody, {
      accountIndex: this.#props.accountIndex,
      chainId: this.#props.chainId,
      collateralReturnFormat,
      knownAddresses: this.#props.knownAddresses,
      outputsFormat,
      tagCborSets: body.hasTaggedSets(),
      txInKeyPathMap,
    });

    const signingMode = TrezorKeyAgent.matchSigningMode(
      trezorTxData as unknown as Parameters<
        typeof TrezorKeyAgent.matchSigningMode
      >[0],
    );

    const trezor = await getTrezorConnect();
    const result = await trezor.cardanoSignTransaction({
      ...trezorTxData,
      signingMode,
      ...(this.#props.derivationType
        ? {
            derivationType:
              DERIVATION_TYPE_TO_TREZOR[this.#props.derivationType],
          }
        : {}),
    });

    if (!result.success) {
      throw new Error(
        `Trezor cardanoSignTransaction failed: ${result.payload.error}`,
      );
    }

    const { hash, witnesses } = result.payload;
    const expectedHash = body.hash();
    if (hash !== String(expectedHash)) {
      throw new Error(
        `Trezor returned a different transaction hash: ${hash} (expected ${expectedHash})`,
      );
    }

    const signatures = new Map<Ed25519PublicKeyHex, Ed25519SignatureHex>(
      witnesses.map(witness => [
        Ed25519PublicKeyHex(witness.pubKey),
        Ed25519SignatureHex(witness.signature),
      ]),
    );

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
      body,
      witnessSet,
      tx.auxiliaryData(),
    );

    return {
      serializedTx: HexBytes(signedTx.toCbor()),
      signatureCount: signatures.size,
    };
  }
}
