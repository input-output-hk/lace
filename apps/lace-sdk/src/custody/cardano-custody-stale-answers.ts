import { Cardano, Serialization } from '@cardano-sdk/core';
import { outpointKey } from '@lace-contract/cardano-context';
import { parseCustodyAccountTokenName } from '@lace-lib/cardano-custody';

import {
  CardanoCustodyFundContentionError,
  CardanoCustodyRewardBalanceChangedError,
  CardanoCustodyStaleControlError,
  CardanoCustodyStaleGrantError,
} from './cardano-custody-errors';
import { CardanoCustodySponsorError } from './cardano-custody-sponsor';

/** What the inputs of a custody transaction are to its account. */
type CustodyInputRoles = {
  /** Spent or referenced UTxOs that hold the state NFT. */
  readonly controls: readonly Cardano.TxIn[];
  /** Spent UTxOs that hold a grant token, with the grant's slot. */
  readonly grants: readonly { input: Cardano.TxIn; slot: bigint }[];
  /** Every other spent UTxO at the account address. */
  readonly funds: readonly Cardano.TxIn[];
};

/** The account token in an output at the account address, if any. */
const accountTokenOf = (
  output: Cardano.TxOut,
  { policyId, stakeScriptHash }: { policyId: string; stakeScriptHash: string },
) => {
  for (const [assetId, quantity] of output.value.assets ?? []) {
    if (quantity <= 0n || Cardano.AssetId.getPolicyId(assetId) !== policyId) {
      continue;
    }
    const name = parseCustodyAccountTokenName(
      Cardano.AssetId.getAssetName(assetId),
    );
    if (name?.stakeScriptHash === stakeScriptHash) return name;
  }
  return undefined;
};

/**
 * Sorts the spent and referenced inputs of a custody transaction at
 * `address` by what they hold. Inputs `resolvedInputs` does not resolve, or
 * that sit elsewhere, are left out.
 */
export const custodyInputRolesOf = (
  transaction: string,
  resolvedInputs: readonly Cardano.Utxo[],
  address: Cardano.PaymentAddress,
): CustodyInputRoles => {
  const base = Cardano.Address.fromBech32(address).asBase();
  const body = Serialization.Transaction.fromCbor(
    Serialization.TxCBOR(transaction),
  )
    .body()
    .toCore();
  const outputs = new Map(
    resolvedInputs.map(([input, output]) => [outpointKey(input), output]),
  );
  const account = base && {
    policyId: base.getPaymentCredential().hash,
    stakeScriptHash: base.getStakeCredential().hash,
  };
  const controls: Cardano.TxIn[] = [];
  const grants: { input: Cardano.TxIn; slot: bigint }[] = [];
  const funds: Cardano.TxIn[] = [];
  const sort = (input: Cardano.TxIn, isSpent: boolean) => {
    const output = outputs.get(outpointKey(input));
    if (!account || output?.address !== address) return;
    const token = accountTokenOf(output, account);
    if (token?.kind === 'state-nft') controls.push(input);
    else if (!isSpent) return;
    else if (token?.kind === 'grant') grants.push({ input, slot: token.slot });
    else funds.push(input);
  };
  for (const input of body.inputs) sort(input, true);
  for (const input of body.referenceInputs ?? []) sort(input, false);
  return { controls, grants, funds };
};

/**
 * The error for inputs the chain no longer holds: the control UTxO first,
 * since replacing it stops every spend built on it, then a grant UTxO, then
 * funds. When no account input is named, the control UTxO is the likely
 * cause; a transaction without one, such as a creation, gets none.
 */
const staleInputsError = (
  roles: CustodyInputRoles,
  named: readonly Cardano.TxIn[],
): Error | undefined => {
  const isNamed = (input: Cardano.TxIn) =>
    named.some(candidate => outpointKey(candidate) === outpointKey(input));
  if (roles.controls.some(isNamed))
    return new CardanoCustodyStaleControlError();
  const grant = roles.grants.find(({ input }) => isNamed(input));
  if (grant) return new CardanoCustodyStaleGrantError(grant.slot);
  const funds = roles.funds.filter(isNamed);
  if (funds.length > 0) return new CardanoCustodyFundContentionError(funds);
  return roles.controls.length > 0
    ? new CardanoCustodyStaleControlError()
    : undefined;
};

/**
 * The error for a referenced control UTxO that no input operates: the
 * spend's one grant UTxO is gone, or, without a single grant input, the
 * transaction is no spend this account can rebuild from its grant.
 */
const staleGrantOf = ({ grants }: CustodyInputRoles): Error =>
  grants.length === 1
    ? new CardanoCustodyStaleGrantError(grants[0].slot)
    : new CardanoCustodyStaleControlError();

const ORPHAN_GRANT = /whose control UTxO is neither spent nor referenced/;
const UNOPERATED_CONTROL =
  /is the control UTxO of account \S+, which no input operates/;
const NO_ACCOUNT_INPUT = /^No input is an account control or grant UTxO/;
const BROKEN_CREATION = /^An account creation /;
const UNKNOWN_INPUT = /^Input (\S+) is not an unspent output the chain knows/;
const UNKNOWN_REFERENCE_INPUT =
  /^Reference input (\S+) is not an unspent output the chain knows/;

/** A `txHash#index` reference, as the sponsor writes one. */
const txInOf = (reference: string): Cardano.TxIn[] => {
  const [txId, index] = reference.split('#');
  return /^[\da-f]{64}$/i.test(txId) && /^\d+$/.test(index ?? '')
    ? [
        {
          txId: Cardano.TransactionId(txId.toLowerCase()),
          index: Number(index),
        },
      ]
    : [];
};

/**
 * The typed error for a fee sponsor refusal that means an input of the
 * transaction is no longer on chain, or undefined for any other refusal.
 * Lace checks the same rules over the inputs it resolved before it asks the
 * sponsor, so a refusal under them comes from an input the sponsor could not
 * resolve. The sponsor reads the account before anything else, so a spent
 * account input shows up as a broken account transaction:
 *
 * - a grant UTxO whose control UTxO is not present: the control UTxO was
 *   replaced;
 * - a referenced control UTxO that no input operates: the grant UTxO was
 *   spent;
 * - no account input left, which the sponsor reads as a creation: the
 *   control UTxO, or both, were spent. A mint or a burn of account tokens
 *   then reads as a broken creation.
 *
 * A spent fund UTxO shows up as a shortfall of what the remaining inputs
 * supply to outputs away from the account, or, when they still cover them,
 * as an input the chain does not know. A referenced control UTxO the chain
 * does not know is stale too; any other reference input, such as one that
 * holds a contract script, is not the account's to rebuild.
 */
export const staleSponsorRefusalOf = (
  error: unknown,
  roles: CustodyInputRoles,
): Error | undefined => {
  if (
    !(error instanceof CardanoCustodySponsorError) ||
    error.code !== 'invalid_transaction' ||
    error.rule === undefined
  ) {
    return undefined;
  }
  const detail = error.detail ?? '';
  switch (error.rule) {
    case 'account_transaction':
      if (roles.controls.length === 0) return undefined;
      if (ORPHAN_GRANT.test(detail) || NO_ACCOUNT_INPUT.test(detail)) {
        return new CardanoCustodyStaleControlError();
      }
      if (UNOPERATED_CONTROL.test(detail)) return staleGrantOf(roles);
      return BROKEN_CREATION.test(detail)
        ? new CardanoCustodyStaleControlError()
        : undefined;
    case 'no_sponsor_value_elsewhere':
      return roles.funds.length > 0
        ? new CardanoCustodyFundContentionError(
            roles.funds.length === 1 ? roles.funds : [],
          )
        : undefined;
    case 'evaluates': {
      const unknownInput = UNKNOWN_INPUT.exec(detail);
      if (unknownInput) {
        return staleInputsError(roles, txInOf(unknownInput[1]));
      }
      const unknownReference = UNKNOWN_REFERENCE_INPUT.exec(detail);
      return unknownReference &&
        txInOf(unknownReference[1]).some(reference =>
          roles.controls.some(
            control => outpointKey(control) === outpointKey(reference),
          ),
        )
        ? new CardanoCustodyStaleControlError()
        : undefined;
    }
    default:
      return undefined;
  }
};

/**
 * The node's names for inputs it does not hold: the ledger's own and
 * Ogmios's.
 */
const BAD_INPUTS = /BadInputsUTxO|UnknownOutputReferences/i;

/**
 * Whether an input appears in a refusal. The ledger prints an input as
 * `TxIn (TxId {unTxId = SafeHash "<id>"}) (TxIx <index>)` and Ogmios as
 * `{"transaction":{"id":"<id>"},"index":<index>}`. When the id appears in
 * neither shape, the id alone counts.
 */
const mentionsInput = (message: string, { txId, index }: Cardano.TxIn) => {
  if (!message.includes(txId)) return false;
  const indexed = new RegExp(
    `${txId}\\W{0,16}(?:TxIx\\W*(?:unTxIx\\W*)?|index\\W{0,4})(\\d+)`,
    'gi',
  );
  const indices = [...message.matchAll(indexed)].map(([, found]) =>
    Number(found),
  );
  return indices.length === 0 || indices.includes(index);
};

/**
 * Names the ledger gives a withdrawal of less than the whole balance of its
 * reward account.
 */
const INCOMPLETE_WITHDRAWALS = /WithdrawalsNotInRewards|IncompleteWithdrawals/i;

/**
 * The typed error for a submission the node refused because inputs of the
 * transaction are no longer on chain, or because a reward balance it
 * withdraws changed, or undefined for any other refusal.
 */
export const staleSubmissionErrorOf = (
  error: Error,
  roles: CustodyInputRoles,
): Error | undefined => {
  const message = error.message.toLowerCase();
  const stale =
    BAD_INPUTS.test(message) &&
    staleInputsError(
      roles,
      [
        ...roles.controls,
        ...roles.grants.map(({ input }) => input),
        ...roles.funds,
      ].filter(input => mentionsInput(message, input)),
    );
  if (stale) return stale;
  return INCOMPLETE_WITHDRAWALS.test(message)
    ? new CardanoCustodyRewardBalanceChangedError()
    : undefined;
};

/**
 * The ledger's and Ogmios's names for a registration of a stake credential
 * that is already registered.
 */
const ALREADY_REGISTERED =
  /StakeKeyRegisteredDELEG|StakeKeyAlreadyRegistered|CredentialAlreadyRegistered/i;

/** Whether the node refused a submission for registering a registered credential. */
export const isAlreadyRegisteredRefusal = (error: Error): boolean =>
  ALREADY_REGISTERED.test(error.message);
