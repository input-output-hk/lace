import { Cardano, Serialization } from '@cardano-sdk/core';
import { minAdaRequired } from '@cardano-sdk/tx-construction';
import {
  custodyRecipientFromAddress,
  parseCustodyRequestedGrantScope,
  serializeCustodyRequestedGrantScope,
} from '@lace-lib/cardano-custody';

import { failCustodyBuild } from './build-failure';

import type { CardanoCustodyGrantScopeRequest } from '@lace-contract/cardano-context';
import type {
  CustodyAccountIdentity,
  CustodyGrantRequest,
} from '@lace-lib/cardano-custody';

const outputProblem = (
  output: Cardano.TxOut,
  identity: CustodyAccountIdentity,
  coinsPerUtxoByte: number,
): string | undefined => {
  const address = Cardano.Address.fromString(output.address);
  if (address?.getNetworkId() !== identity.chainId.networkId) {
    return 'is not an address on the account network';
  }
  // The ledger cannot pass a Byron output to a Plutus script, so every
  // custody transaction that paid one would fail evaluation.
  if (address.getType() === Cardano.AddressType.Byron) {
    return 'is a Byron address, which a Plutus transaction cannot pay';
  }
  if (address.toBech32() === identity.address) return 'pays the account itself';
  const accountPolicy = identity.contractVersion.accountValidatorHash;
  if (
    [...(output.value.assets?.keys() ?? [])].some(
      assetId =>
        (Cardano.AssetId.getPolicyId(assetId) as string) === accountPolicy,
    )
  ) {
    return 'carries a custody account token';
  }
  return output.value.coins < minAdaRequired(output, BigInt(coinsPerUtxoByte))
    ? 'holds less than its minimum ADA'
    : undefined;
};

/**
 * Checks the outputs an owner or a grantee asks the account to pay. Each
 * goes to a Shelley address on the account's network other than the
 * account itself, carries no token of a custody account and holds its
 * minimum ADA: the build never tops a requested amount up from account
 * funds.
 */
export const checkRequestedOutputs = (
  outputs: readonly Cardano.TxOut[],
  identity: CustodyAccountIdentity,
  coinsPerUtxoByte: number,
): void => {
  for (const [outputIndex, output] of outputs.entries()) {
    const problem = outputProblem(output, identity, coinsPerUtxoByte);
    if (problem) {
      failCustodyBuild({
        code: 'invalid-operation',
        reason: 'invalid-output',
        message: `Output ${outputIndex} ${problem}`,
      });
    }
  }
};

const invalidMetadata = (message: string): never =>
  failCustodyBuild({
    code: 'invalid-operation',
    reason: 'invalid-metadata',
    message,
  });

/** The largest metadata label the ledger encodes: a 64-bit unsigned integer. */
const MAX_METADATA_LABEL = 2n ** 64n - 1n;

/**
 * The metadata an owner asks the transaction to carry: a map of labels to
 * metadata the ledger accepts, which its serialization checks: text and
 * bytes hold at most 64 bytes each. An empty map carries nothing.
 */
export const checkRequestedMetadata = (
  metadata: unknown,
): Cardano.TxMetadata | undefined => {
  if (metadata === undefined) return undefined;
  if (!(metadata instanceof Map)) {
    return invalidMetadata('The metadata must be a map of labels to metadata');
  }
  if (metadata.size === 0) return undefined;
  for (const label of metadata.keys()) {
    if (typeof label !== 'bigint' || label < 0n || label > MAX_METADATA_LABEL) {
      return invalidMetadata(
        `Metadata label ${String(label)} is not a 64-bit unsigned integer`,
      );
    }
  }
  try {
    Serialization.AuxiliaryData.fromCore({ blob: metadata });
  } catch (error) {
    return invalidMetadata(
      `The metadata cannot be encoded: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  return metadata;
};

const invalidScope = (message: string): never =>
  failCustodyBuild({
    code: 'invalid-operation',
    reason: 'grant-scope',
    message,
  });

/**
 * The grant a scope request asks to issue in `slot`. The request goes
 * through the library's strict requested-scope parser, the one the signer
 * applies to `requestedScopes`, so Lace refuses a scope the signer would
 * refuse as malformed; its recipients, which must be on the account's
 * network, become Plutus addresses.
 */
export const grantRequestOf = (
  {
    scope: request,
    slot,
  }: { scope: CardanoCustodyGrantScopeRequest; slot: bigint },
  { chainId }: CustodyAccountIdentity,
  now: number,
): CustodyGrantRequest => {
  let serialized: unknown;
  try {
    serialized = serializeCustodyRequestedGrantScope({ ...request, slot });
  } catch {
    return invalidScope('scope: not a grant scope');
  }
  const parsed = parseCustodyRequestedGrantScope(serialized);
  if (!parsed.ok) {
    return invalidScope(
      [parsed.error.field, parsed.error.reason].filter(Boolean).join(': '),
    );
  }
  const { grantee, recipients, ...scope } = parsed.value;
  return {
    grantee,
    now,
    scope: {
      asset: scope.asset,
      perCallCap: scope.perCallCap,
      cap: scope.cap,
      lovelacePerCallCap: scope.lovelacePerCallCap,
      lovelaceCap: scope.lovelaceCap,
      expiresAt: scope.expiresAt,
      recipients: recipients.map(text => {
        const address = Cardano.Address.fromBech32(text);
        const recipient = custodyRecipientFromAddress(address);
        return recipient.ok && address.getNetworkId() === chainId.networkId
          ? recipient.value
          : invalidScope(`recipients: ${text} is not on the account network`);
      }),
    },
  };
};

/** A bech32 stake pool id, refused as an invalid operation when malformed. */
export const poolIdOf = (poolId: string): Cardano.PoolId => {
  try {
    return Cardano.PoolId(poolId);
  } catch {
    return failCustodyBuild({
      code: 'invalid-operation',
      reason: 'invalid-pool-id',
      message: `Invalid stake pool id ${poolId}`,
    });
  }
};
