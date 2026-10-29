import { Cardano } from '@cardano-sdk/core';
import { Hash28ByteBase16 } from '@cardano-sdk/crypto';
import { minAdaRequired } from '@cardano-sdk/tx-construction';
import {
  custodyGrantLiveness,
  custodyRecipientToAddress,
  isCustodyLovelaceAsset,
} from '@lace-lib/cardano-custody';

import { CARDANO_CUSTODY_DEFAULT_GRANT_FEE_BOUND } from './build-transaction';

import type {
  CustodyAccountState,
  CustodyGrant,
  CustodyGrantUtxo,
  CustodyScope,
} from '@lace-lib/cardano-custody';

/**
 * Where a grant stands for its agent:
 *
 * - `pending`: a submitted operation the wallet has not seen settle issues
 *   it. The chain does not hold it yet.
 * - `live`: confirmed, current and able to pay at least the smallest spend.
 * - `exhausted`: confirmed and current, but its remaining caps are below
 *   the smallest spend, so the agent can no longer pay out.
 * - `expired`: confirmed and current, but its expiry is at or before the
 *   chain tip's time.
 * - `revoked`: its slot is in the confirmed revoked list.
 * - `superseded`: a confirmed revoke-all raised the generation past it.
 * - `revoking`: confirmed, but a submitted operation that has not settled
 *   revokes it, alone or with every grant.
 * - `sweeping`: a submitted operation that has not settled burns its token
 *   and frees its lovelace.
 *
 * A grant counts toward the account's outstanding grants from its issue
 * until a sweep burns it, whatever its status.
 */
export type CardanoCustodyGrantStatus =
  | 'exhausted'
  | 'expired'
  | 'live'
  | 'pending'
  | 'revoked'
  | 'revoking'
  | 'superseded'
  | 'sweeping';

/** A grant UTxO of a custody account with where its grant stands. */
export type CardanoCustodyGrantWithStatus = CustodyGrantUtxo & {
  readonly status: CardanoCustodyGrantStatus;
};

/** A control state with the grant UTxOs seen beside it. */
type CardanoCustodyGrantView = {
  readonly state: CustodyAccountState;
  readonly grants: readonly CustodyGrantUtxo[];
};

type GrantSpendPricing = {
  readonly protocolParameters: Pick<
    Cardano.ProtocolParameters,
    'coinsPerUtxoByte'
  >;
  /** The network recipient addresses are spelled on. */
  readonly networkId: Cardano.NetworkId;
  /** The fee bound of the spend; the default grant fee bound when absent. */
  readonly feeBound?: bigint;
};

/**
 * Any key hash: an unrestricted grant pays out to any address, and an
 * enterprise key address makes the smallest output.
 */
const ANY_KEY_HASH = Hash28ByteBase16('00'.repeat(28));

/** The addresses a grant may pay out to, or one standing for any address. */
const payoutAddressesOf = (
  { recipients }: CustodyScope,
  networkId: Cardano.NetworkId,
): Cardano.PaymentAddress[] => {
  if (recipients.length === 0) {
    return [
      Cardano.EnterpriseAddress.fromCredentials(networkId, {
        type: Cardano.CredentialType.KeyHash,
        hash: ANY_KEY_HASH,
      })
        .toAddress()
        .toBech32() as Cardano.PaymentAddress,
    ];
  }
  return recipients.flatMap(recipient => {
    const address = custodyRecipientToAddress(recipient, networkId);
    return address.ok
      ? [address.value.toBech32() as Cardano.PaymentAddress]
      : [];
  });
};

/** The scope's token, or undefined when its policy id or name is malformed. */
const tokenOf = ({ asset }: CustodyScope): Cardano.AssetId | undefined => {
  try {
    return Cardano.AssetId.fromParts(
      Cardano.PolicyId(asset.policyId),
      Cardano.AssetName(asset.assetName),
    );
  } catch {
    return undefined;
  }
};

const smallerOf = (a: bigint, b: bigint): bigint => (a < b ? a : b);

/**
 * Whether a grant scope can no longer pay the smallest spend. That spend
 * is one output to the cheapest address the grant allows, holding the
 * ledger minimum lovelace, plus the fee bound. A lovelace grant draws both
 * from its lovelace caps (`cap`, `perCallCap`). A token grant draws one
 * token from its token caps and the lovelace from `lovelaceCap` and
 * `lovelacePerCallCap`. A grant with no address it can pay is exhausted.
 */
export const isCardanoCustodyGrantExhausted = (
  scope: CustodyScope,
  {
    protocolParameters,
    networkId,
    feeBound = CARDANO_CUSTODY_DEFAULT_GRANT_FEE_BOUND,
  }: GrantSpendPricing,
): boolean => {
  const isLovelace = isCustodyLovelaceAsset(scope.asset);
  const token = isLovelace ? undefined : tokenOf(scope);
  if (!isLovelace && !token) return true;
  const addresses = payoutAddressesOf(scope, networkId);
  if (addresses.length === 0) return true;
  const coinsPerUtxoByte = BigInt(protocolParameters.coinsPerUtxoByte);
  const smallestOutput = addresses
    .map(address =>
      minAdaRequired(
        {
          address,
          value: {
            coins: 0n,
            ...(token && { assets: new Map([[token, 1n]]) }),
          },
        },
        coinsPerUtxoByte,
      ),
    )
    .reduce(smallerOf);
  const smallestLovelaceSpend = smallestOutput + feeBound;
  if (isLovelace) {
    return smallerOf(scope.cap, scope.perCallCap) < smallestLovelaceSpend;
  }
  return (
    smallerOf(scope.cap, scope.perCallCap) < 1n ||
    smallerOf(scope.lovelaceCap, scope.lovelacePerCallCap) <
      smallestLovelaceSpend
  );
};

const bySlot = (
  { grant: a }: CustodyGrantUtxo,
  { grant: b }: CustodyGrantUtxo,
): number => (a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : 0);

/** The states and time a grant both views hold is judged by. */
type ConfirmedGrantContext = GrantSpendPricing & {
  readonly confirmed: CustodyAccountState;
  readonly inFlight: CustodyAccountState;
  readonly now: number;
};

/**
 * The status of a grant the confirmed view holds and the in-flight view
 * keeps. `grant` is its in-flight version: an unsettled grant spend lowers
 * its caps and changes nothing else.
 */
const confirmedGrantStatus = (
  grant: CustodyGrant,
  { confirmed, inFlight, now, ...pricing }: ConfirmedGrantContext,
): CardanoCustodyGrantStatus => {
  const liveness = custodyGrantLiveness(grant, confirmed, now);
  if (liveness === 'revoked' || liveness === 'superseded') return liveness;
  // The confirmed state has not caught up with the grant yet.
  if (liveness === 'future-generation') return 'pending';
  const next = custodyGrantLiveness(grant, inFlight, now);
  if (next === 'revoked' || next === 'superseded') return 'revoking';
  if (liveness === 'expired') return 'expired';
  return isCardanoCustodyGrantExhausted(grant.scope, pricing)
    ? 'exhausted'
    : 'live';
};

/**
 * The status of every grant UTxO of a custody account, in slot order.
 * `inFlight` is the account after the submitted operations that have not
 * settled; `confirmed` is the account on chain, absent while it has no
 * confirmed control state. A grant is known by its slot, which no grant
 * ever reuses. `now` is POSIX milliseconds: the time of the chain tip.
 *
 * A grant only the in-flight view holds is `pending`, and one only the
 * confirmed view holds is `sweeping`. A grant both hold is judged against
 * the confirmed state, and is `revoking` when the in-flight state kills it.
 * Its listed version is the in-flight one, so an unsettled grant spend
 * shows its lowered caps at once.
 */
export const classifyCardanoCustodyGrants = ({
  confirmed,
  inFlight,
  now,
  protocolParameters,
  networkId,
}: Omit<GrantSpendPricing, 'feeBound'> & {
  confirmed: CardanoCustodyGrantView | undefined;
  inFlight: CardanoCustodyGrantView;
  now: number;
}): CardanoCustodyGrantWithStatus[] => {
  const confirmedSlots = new Set(
    confirmed?.grants.map(({ grant }) => grant.slot),
  );
  const inFlightSlots = new Set(inFlight.grants.map(({ grant }) => grant.slot));
  const kept = inFlight.grants.map(
    (grantUtxo): CardanoCustodyGrantWithStatus => ({
      ...grantUtxo,
      status:
        confirmed && confirmedSlots.has(grantUtxo.grant.slot)
          ? confirmedGrantStatus(grantUtxo.grant, {
              confirmed: confirmed.state,
              inFlight: inFlight.state,
              now,
              protocolParameters,
              networkId,
            })
          : 'pending',
    }),
  );
  const swept = (confirmed?.grants ?? [])
    .filter(({ grant }) => !inFlightSlots.has(grant.slot))
    .map(
      (grantUtxo): CardanoCustodyGrantWithStatus => ({
        ...grantUtxo,
        status: 'sweeping',
      }),
    );
  return [...kept, ...swept].sort(bySlot);
};
