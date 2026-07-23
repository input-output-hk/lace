import { Cardano, Serialization } from '@cardano-sdk/core';
import { computeMinimumCoinQuantity } from '@cardano-sdk/tx-construction';

import { LOVELACE_FOR_REGISTRATION } from '../constants';
import {
  Err as Error_,
  Ok,
  type NightDesignationError,
  type Result,
} from '../errors';
import {
  dataVoidCbor,
  dustActionBurnCbor,
  dustActionCreateCbor,
  dustMappingDatumToCbor,
  getDustGeneratorPaymentAddress,
  getDustGeneratorRewardAccount,
  getDustGeneratorScriptHash,
  getDustMappingNftAssetId,
  getDustMappingNftPolicyId,
} from '../plutus';
import { getDustGeneratorScriptCbor } from '../scripts';
import { MIDNIGHT_DUST_ADDRESS_MAX_BYTES } from '../value-objects/midnight-coin-pubkey.vo';

import type {
  BuildNightDesignationTxParams,
  NightDesignationTxBlueprint,
} from './types';
import type { HexBlob } from '@cardano-sdk/util';

const NFT_ASSET_NAME = Cardano.AssetName('');

// Min-utxo floor for the script output, computed dynamically from
// the protocol's `coinsPerUtxoByte` parameter and the actual output
// shape (script address + 1 mapping NFT + inline DustMappingDatum).
// We never go below `LOVELACE_FOR_REGISTRATION` — that constant
// remains as a hard floor for cross-implementation byte-equivalence
// with the reference dApp, even if a future protocol parameter shift
// makes the dynamic minimum drop. (The validator doesn't enforce a
// specific lovelace amount on the output, only that it clears the
// protocol floor — so going above is always safe; going below would
// have phase-1 reject the tx.)
const computeScriptOutputLovelace = ({
  scriptAddress,
  nftAsset,
  datumCbor,
  coinsPerUtxoByte,
}: {
  scriptAddress: Cardano.PaymentAddress;
  nftAsset: Cardano.AssetId;
  datumCbor: HexBlob;
  coinsPerUtxoByte: number;
}): bigint => {
  const datum = Serialization.PlutusData.fromCbor(datumCbor).toCore();
  const representativeOutput: Cardano.TxOut = {
    address: scriptAddress,
    value: {
      // Placeholder coin field — the helper computes the floor over
      // the rest of the output's serialised shape, then we use that
      // as the final value.
      coins: LOVELACE_FOR_REGISTRATION,
      assets: new Map([[nftAsset, 1n]]),
    },
    datum,
  };
  const minCoin =
    computeMinimumCoinQuantity(coinsPerUtxoByte)(representativeOutput);
  return minCoin < LOVELACE_FOR_REGISTRATION
    ? LOVELACE_FOR_REGISTRATION
    : minCoin;
};

// =====================================================================
// buildNightDesignationTxBlueprint — Phase 1 deterministic primitive
// assembler.
// =====================================================================
// Returns the static parts of the tx that don't depend on coin
// selection, fee calculation, or ex-units evaluation. The Phase 2
// hoist consumes this blueprint and composes a balanced
// `Serialization.Transaction` from it. The Phase 1 lib does NOT call
// the network and does NOT produce a CBOR-encoded tx — callers
// integrating this for sign + submit must fill in those pieces.
//
// The validation here is deliberately minimal and exhaustive of the
// shape the validator enforces on-chain:
//
//   1. cnightUtxos must be non-empty (the Aiken `list.any(inputs,
//      ...)` rotation check).
//   2. dustPubkey must be <= 33 bytes (the Aiken `length_of_bytearray
//      (dust_address) <= 33` check). Construction via `MidnightCoinPubkey
//      (bytes)` already enforces 32 bytes exactly — this is a belt-and-
//      braces re-check for direct callers who skip the constructor.
//   3. For update + deregister, a registration UTxO must be provided
//      (no shape to derive it from at runtime — caller resolves via
//      the script-address scan documented in `useCNightDesignation`).
//
// Network mismatch (e.g. mainnet account + testnet UTxOs) is NOT
// caught here — the lib trusts the caller to pass coherent inputs.
// The Carbon UI layer is responsible for ensuring the active network
// of the account matches the lib's `network` argument.
// =====================================================================

export const buildNightDesignationTxBlueprint = (
  params: BuildNightDesignationTxParams,
): Result<NightDesignationTxBlueprint, NightDesignationError> => {
  if (params.cnightUtxos.length === 0) {
    return Error_({
      code: 'no-cnight',
      message: 'No cNIGHT in this account.',
    });
  }

  const scriptAddress = getDustGeneratorPaymentAddress(params.network);
  const scriptRewardAccount = getDustGeneratorRewardAccount(params.network);
  const nftPolicyId = getDustMappingNftPolicyId(params.network);
  const nftAsset = getDustMappingNftAssetId(params.network);
  const scriptCbor = getDustGeneratorScriptCbor(params.network);
  const requiredSigners = {
    paymentKeyHash: params.paymentKeyHash,
    stakeKeyHash: params.stakeKeyHash,
  };

  if (params.action.kind === 'register') {
    if (params.action.dustPubkey.length > MIDNIGHT_DUST_ADDRESS_MAX_BYTES) {
      return Error_({
        code: 'dust-address-too-long',
        message: `dust_address exceeds the on-chain ${MIDNIGHT_DUST_ADDRESS_MAX_BYTES}-byte limit enforced by the validator.`,
        actualBytes: params.action.dustPubkey.length,
        maxBytes: MIDNIGHT_DUST_ADDRESS_MAX_BYTES,
      });
    }

    const datumCbor = dustMappingDatumToCbor({
      cWallet: { kind: 'verificationKey', stakeKeyHash: params.stakeKeyHash },
      dustAddress: params.action.dustPubkey,
    });

    return Ok({
      network: params.network,
      scriptAddress,
      scriptRewardAccount,
      dustMappingNftAssetId: nftAsset,
      forcedInputs: params.cnightUtxos,
      scriptOutput: {
        address: scriptAddress,
        lovelace: computeScriptOutputLovelace({
          scriptAddress,
          nftAsset,
          datumCbor,
          coinsPerUtxoByte: params.coinsPerUtxoByte,
        }),
        nftAsset,
        nftQuantity: 1n,
        inlineDatumCbor: datumCbor,
      },
      mint: {
        policyId: nftPolicyId,
        assetName: NFT_ASSET_NAME,
        quantity: 1n,
        redeemerCbor: dustActionCreateCbor(),
      },
      spendRedeemer: null,
      withdrawal: null,
      requiredSigners,
      scriptCbor,
    });
  }

  if (params.action.kind === 'update') {
    if (params.action.dustPubkey.length > MIDNIGHT_DUST_ADDRESS_MAX_BYTES) {
      return Error_({
        code: 'dust-address-too-long',
        message: `dust_address exceeds the on-chain ${MIDNIGHT_DUST_ADDRESS_MAX_BYTES}-byte limit enforced by the validator.`,
        actualBytes: params.action.dustPubkey.length,
        maxBytes: MIDNIGHT_DUST_ADDRESS_MAX_BYTES,
      });
    }

    const datumCbor = dustMappingDatumToCbor({
      cWallet: { kind: 'verificationKey', stakeKeyHash: params.stakeKeyHash },
      dustAddress: params.action.dustPubkey,
    });

    return Ok({
      network: params.network,
      scriptAddress,
      scriptRewardAccount,
      dustMappingNftAssetId: nftAsset,
      forcedInputs: [...params.cnightUtxos, params.action.registrationUtxo],
      scriptOutput: {
        address: scriptAddress,
        lovelace: computeScriptOutputLovelace({
          scriptAddress,
          nftAsset,
          datumCbor,
          coinsPerUtxoByte: params.coinsPerUtxoByte,
        }),
        nftAsset,
        nftQuantity: 1n,
        inlineDatumCbor: datumCbor,
      },
      mint: null,
      spendRedeemer: {
        registrationUtxo: params.action.registrationUtxo,
        redeemerCbor: dataVoidCbor(),
      },
      withdrawal: {
        rewardAccount: scriptRewardAccount,
        lovelace: params.action.scriptWithdrawableLovelace,
        redeemerCbor: dataVoidCbor(),
      },
      requiredSigners,
      scriptCbor,
    });
  }

  // deregister
  return Ok({
    network: params.network,
    scriptAddress,
    scriptRewardAccount,
    dustMappingNftAssetId: nftAsset,
    forcedInputs: [...params.cnightUtxos, params.action.registrationUtxo],
    scriptOutput: null,
    mint: {
      policyId: nftPolicyId,
      assetName: NFT_ASSET_NAME,
      quantity: -1n,
      redeemerCbor: dustActionBurnCbor(),
    },
    spendRedeemer: {
      registrationUtxo: params.action.registrationUtxo,
      redeemerCbor: dataVoidCbor(),
    },
    withdrawal: null,
    requiredSigners,
    scriptCbor,
  });
};

// Re-export so callers can inspect the script hash without going
// through the blueprint shape (Phase 2 uses this for tx-body
// `script_data_hash` computation).
export { getDustGeneratorScriptHash };
