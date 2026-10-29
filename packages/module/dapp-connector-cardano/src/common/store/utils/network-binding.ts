import { Cardano, Serialization } from '@cardano-sdk/core';
import { HexBlob } from '@cardano-sdk/util';

/**
 * What one network-bearing element of a transaction body says about the network
 * it targets. `'unreadable'` is a distinct answer from "no such element": an
 * address we cannot decode is a thing we failed to classify, and this rule
 * treats a failure to classify as a reason to refuse, never as silence.
 */
type NetworkEvidence = Cardano.NetworkId | 'unreadable';
type NetworkLabel = 'mainnet' | 'testnet' | null;

const evidenceOfAddress = (address: string): NetworkEvidence => {
  const networkId = Cardano.Address.fromString(address)?.getNetworkId();
  return networkId ?? 'unreadable';
};

/**
 * Every network id the body states, from every element that carries one.
 *
 * Completeness matters in ONE direction: a field left unread cannot make the
 * rule refuse a good transaction, but it can cost a veto — an attacker who
 * hides the payoff in an unread field and leaves a same-network decoy in a read
 * one would pass. Adding a network-bearing field to this walk is therefore a
 * security fix; removing one is a regression.
 *
 * Inputs, reference inputs and collateral inputs carry no network: an outpoint
 * is a transaction id and an index. Bare credentials (required signers, voters,
 * guards, most certificates' stake credentials) carry none either — a payment
 * credential is the same 28 bytes on every network, which is the whole reason
 * this rule has to exist.
 */
const networkEvidence = (
  body: Cardano.SubTransactionBody | Cardano.TxBody,
): NetworkEvidence[] => {
  const evidence: NetworkEvidence[] = [];

  if (body.networkId !== undefined) evidence.push(body.networkId);

  for (const output of body.outputs)
    evidence.push(evidenceOfAddress(output.address));

  // Collateral is a top-level concept; SubTransactionBody omits it.
  if ('collateralReturn' in body && body.collateralReturn)
    evidence.push(evidenceOfAddress(body.collateralReturn.address));

  for (const withdrawal of [
    ...(body.withdrawals ?? []),
    ...(body.directDeposits ?? []),
  ])
    evidence.push(evidenceOfAddress(withdrawal.stakeAddress));

  for (const proposal of body.proposalProcedures ?? []) {
    evidence.push(evidenceOfAddress(proposal.rewardAccount));
    // A proposal's own rewardAccount only says where its DEPOSIT comes back.
    // A treasury withdrawal additionally names who gets PAID, and those are
    // the accounts an attacker cares about — reading only the deposit-return
    // account leaves a same-network decoy sitting in front of them.
    const { governanceAction } = proposal;
    const treasuryWithdrawals =
      governanceAction.__typename ===
      Cardano.GovernanceActionType.treasury_withdrawals_action
        ? governanceAction.withdrawals
        : [];
    evidence.push(
      ...Array.from(treasuryWithdrawals, withdrawal =>
        evidenceOfAddress(withdrawal.rewardAccount),
      ),
    );
  }

  for (const certificate of body.certificates ?? []) {
    if (certificate.__typename !== Cardano.CertificateType.PoolRegistration)
      continue;
    const { owners, rewardAccount } = certificate.poolParameters;
    evidence.push(evidenceOfAddress(rewardAccount));
    // Owners cannot disagree with the pool reward account, and are walked
    // anyway so the loop need not be re-added if that changes: on the wire an
    // owner is a bare key hash, and PoolParams.toCore synthesises each owner
    // reward account using the POOL reward account network id. Not a second,
    // independent source of evidence.
    evidence.push(...owners.map(evidenceOfAddress));
  }

  // A sub transaction carries its own outputs, withdrawals, certificates and
  // proposals, and a witness over the parent covers all of them. One level of
  // recursion is the whole depth, and the DECODER is what guarantees it, not
  // the type: SubTransactionBody.js holds
  // TOP_LEVEL_ONLY_KEYS = {2, 13, 16, 17, 23} and throws UnknownField for any
  // of them inside a sub body. Key 23 is `subTransactions`, so depth 2 cannot
  // exist in bytes at all — a stronger guarantee than a TypeScript `Omit`,
  // which says nothing about the wire.
  if ('subTransactions' in body)
    for (const sub of body.subTransactions ?? [])
      evidence.push(...networkEvidence(sub.body));

  return evidence;
};

/**
 * Every outpoint the body spends, a sub transaction's own inputs included —
 * the same one level of recursion, and the same decoder guarantee, as
 * {@link networkEvidence}.
 */
const spentOutpoints = (
  body: Cardano.SubTransactionBody | Cardano.TxBody,
): Cardano.TxIn[] => {
  const spent = [...body.inputs];
  if ('subTransactions' in body)
    for (const sub of body.subTransactions ?? [])
      spent.push(...spentOutpoints(sub.body));
  return spent;
};

/**
 * Whether every outpoint the body spends is a UTxO the wallet owns on the
 * active network — the one piece of POSITIVE evidence still available to a
 * body that names no network anywhere.
 *
 * An outpoint exists only in the UTxO set of the chain whose history produced
 * it, and the transaction that produced this one paid an address tagged for
 * this network, so no other chain can hold the same id. A body spending only
 * such outpoints is unusable elsewhere however silent its own fields are.
 *
 * An empty input set answers false, never vacuously true: a body that spends
 * nothing is bound by nothing.
 */
const everyInputIsOwn = (
  body: Cardano.TxBody,
  ownUtxoReferences: ReadonlySet<string>,
): boolean => {
  const spent = spentOutpoints(body);
  return (
    spent.length > 0 &&
    spent.every(({ txId, index }) => ownUtxoReferences.has(`${txId}#${index}`))
  );
};

/** The fail-closed default: a caller holding no ownership evidence supplies
 * none, and a body that states no network stays refused. */
const NO_OWN_UTXO_REFS: ReadonlySet<string> = new Set();

/**
 * What a caller reports in place of ownership evidence when the body's own
 * cbor states an integer key twice: the bytes carry TWO readings, a signature
 * commits to the bytes while the decoder hands the wallet a single reading of
 * its own choosing, and nothing entitles a wallet to prefer that one.
 */
export const UNREADABLE_BYTES = 'unreadable-bytes' as const;

/**
 * What a caller could establish about the bytes behind a decoded body: the
 * outpoints it can vouch for, or that those bytes cannot be read to one
 * transaction at all.
 */
type OwnUtxoEvidence = ReadonlySet<string> | typeof UNREADABLE_BYTES;

/**
 * The INTEGER key a cbor map entry states, or `null` for a key of any other
 * type — either way leaving the reader on that entry's value.
 *
 * Only an integer key can hide a second reading worth refusing, because only
 * it is a structural field number whose two values may differ. A repeated key
 * of any other type — a policy id in `mint`, a reward account in `withdrawals`
 * — is the same value stated twice, so it cannot name two networks, and
 * treating it as ambiguous would refuse transactions CSL itself emits.
 *
 * Integers compare by VALUE, not by encoding: `00` and `1800` both state key
 * 0, and a decoder resolving last-wins keeps one of them either way.
 */
const integerMapKey = (reader: Serialization.CborReader): bigint | null => {
  const state = reader.peekState();
  if (
    state === Serialization.CborReaderState.UnsignedInteger ||
    state === Serialization.CborReaderState.NegativeInteger
  )
    return reader.readInt();
  reader.skipValue();
  return null;
};

/**
 * How deep the walk follows a body's nesting before refusing outright.
 *
 * The deepest legitimate body measures twelve — a sub transaction's proposal
 * carrying a parameter change carrying cost models — so nothing honest comes
 * near 64. The bound is stated rather than left to the JS stack because the
 * three stacks run on different engines: a native stack limit would make the
 * same bytes refuse on one product and sign on another.
 */
const MAX_CBOR_DEPTH = 64;

type CborAmbiguity = boolean | 'depth-limit';

const mapEntriesDuplicateKeys = (
  reader: Serialization.CborReader,
  depth: number,
): CborAmbiguity => {
  const size = reader.readStartMap();
  const stated = new Set<bigint>();
  for (let read = 0; size === null || read < size; read += 1) {
    if (reader.peekState() === Serialization.CborReaderState.EndMap) break;
    const key = integerMapKey(reader);
    if (key !== null) {
      if (stated.has(key)) return true;
      stated.add(key);
    }
    const nested = mapStatesDuplicateKeys(reader, depth + 1);
    if (nested) return nested;
  }
  reader.readEndMap();
  return false;
};

/**
 * Whether any cbor map reachable from the reader's next item states an
 * integer key twice, leaving the reader positioned after that item.
 *
 * Descends through maps, arrays and tags but NEVER through a byte string, and
 * that is what makes it safe over a whole body: everything a dApp authors
 * freely in there — an inline datum, a reference script — is tag-24-wrapped
 * BYTES, and a Plutus data map is an association list in which a repeated key
 * is legal. Reading into one would refuse honest transactions.
 */
const mapStatesDuplicateKeys = (
  reader: Serialization.CborReader,
  depth: number,
): CborAmbiguity => {
  if (depth > MAX_CBOR_DEPTH) return 'depth-limit';
  const state = reader.peekState();

  if (state === Serialization.CborReaderState.StartMap) {
    return mapEntriesDuplicateKeys(reader, depth);
  }

  if (state === Serialization.CborReaderState.StartArray) {
    const size = reader.readStartArray();
    for (let read = 0; size === null || read < size; read += 1) {
      if (reader.peekState() === Serialization.CborReaderState.EndArray) break;
      const nested = mapStatesDuplicateKeys(reader, depth + 1);
      if (nested) return nested;
    }
    reader.readEndArray();
    return false;
  }

  // A tag is a transparent wrapper, not a value: descending through it is what
  // keeps Conway's tag-258 set-encoded fields visible to the walk rather than
  // opaque — `subTransactions` among them, so this carries the rule's depth.
  if (state === Serialization.CborReaderState.Tag) {
    reader.readTag();
    return mapStatesDuplicateKeys(reader, depth + 1);
  }

  reader.skipValue();
  return false;
};

/**
 * Whether the transaction body's cbor states an integer key twice, at any
 * depth the walk above reaches. Bytes that will not parse answer true: the
 * fail-closed direction.
 * Exceeding the depth bound returns `'depth-limit'` so callers can refuse
 * before the SDK decoder traverses the entire deeply nested body.
 *
 * Only a caller holding the cbor can ask: the decoder has already thrown one
 * of the two readings away, so a decoded body cannot answer it. Such a caller
 * reports {@link UNREADABLE_BYTES} in place of ownership evidence.
 */
export const bodyStatesDuplicateKeys = (txCbor: string): CborAmbiguity => {
  try {
    const reader = new Serialization.CborReader(HexBlob(txCbor));
    reader.readStartArray();
    return mapStatesDuplicateKeys(reader, 0);
  } catch {
    return true;
  }
};

/**
 * Why a body is not bound to a network.
 *
 * THREE causes, not two, because there are three inputs: an element that names
 * another network, no element naming any, and an element we could not read at
 * all. Collapsing the third into either of the others makes the prompt state
 * something false — "targets a different network" when nothing was legible, or
 * "does not say which network" about bytes that plainly do.
 */
export type NetworkBindingRefusal =
  | 'states-no-network'
  | 'states-other-network'
  | 'states-unreadable-element';

/**
 * Why the body is not bound to `networkId`, or `null` when it is — the
 * question a signing path must answer `null` to before it contributes a
 * witness.
 *
 * Stated positively on purpose. A signature commits to a transaction body hash
 * and to nothing else: it names no chain, and an account's payment credential
 * is identical on every network, so a witness minted for a testnet-connected
 * dApp spends the same account's mainnet coin. Detecting "this looks like
 * another network" would have to be complete over every shape an attacker can
 * build; requiring proof of THIS network instead makes an unrecognised shape
 * refuse by default.
 *
 * ORDER IS THE COPY, not the safety — every answer refuses. An observed
 * conflict is reported ahead of an unreadable element because it is the more
 * specific and more actionable fact; an unreadable element alone is reported
 * as exactly that, never as a conflict nobody saw. Bytes with two readings
 * are reported ahead of both, for the opposite reason: naming the network one
 * of those readings gives would be a claim the bytes do not support.
 *
 * `networkId` is not enough on its own to check: the field is optional and
 * absent from most real transactions, so a rule reading only it is bypassed by
 * leaving it out.
 *
 * `ownUtxoReferences` carries the other direction of proof — see
 * {@link everyInputIsOwn} — or {@link UNREADABLE_BYTES}, which is the caller
 * saying the bytes have no single reading, and which refuses outright.
 *
 * KNOWN RESIDUAL: `networkId` is one bit — mainnet vs any testnet — so a
 * preprod body passes while the wallet serves preview. Address tags and the
 * body's own `networkId` field both carry only that bit. `ownUtxoReferences`
 * does separate the two testnets, but only for a body that states no network
 * at all; one that names a testnet never reaches that arm. It is also why
 * {@link statedNetworkLabel} will not name a specific testnet.
 */
export const networkBindingRefusal = (
  body: Cardano.TxBody,
  networkId: Cardano.NetworkId,
  ownUtxoReferences: OwnUtxoEvidence = NO_OWN_UTXO_REFS,
): NetworkBindingRefusal | null => {
  if (ownUtxoReferences === UNREADABLE_BYTES)
    return 'states-unreadable-element';
  const evidence = networkEvidence(body);
  if (evidence.length === 0)
    return everyInputIsOwn(body, ownUtxoReferences)
      ? null
      : 'states-no-network';
  if (evidence.every(stated => stated === networkId)) return null;
  if (evidence.some(stated => stated !== 'unreadable' && stated !== networkId))
    return 'states-other-network';
  return 'states-unreadable-element';
};

/**
 * Which network the body's DISAGREEING elements name, at the only resolution
 * this rule has.
 *
 * `null` unless the cause is `'states-other-network'`, and a DISCRIMINANT
 * rather than a phrase: an address tag and the body's `networkId` field both
 * carry one bit — mainnet or not — so naming preprod or preview here would be
 * a claim the bytes do not support, and returning English would put a
 * hard-coded word inside a localised sentence. The WALLET's side is known
 * exactly and is named exactly; the transaction's is not, and the copy must
 * not pretend otherwise.
 */
export const statedNetworkLabel = (
  body: Cardano.TxBody,
  networkId: Cardano.NetworkId,
): NetworkLabel => {
  const disagreeing = networkEvidence(body).filter(
    stated => stated !== 'unreadable' && stated !== networkId,
  );
  if (disagreeing.length === 0) return null;
  return disagreeing.includes(Cardano.NetworkId.Mainnet)
    ? 'mainnet'
    : 'testnet';
};

/**
 * {@link networkBindingRefusal} over the wire format, for the signing paths
 * that hold only the CBOR, with `'undecodable'` for bytes that will not parse.
 *
 * A fourth answer rather than folding into `'states-no-network'`: truncate a
 * mainnet transaction by one byte and it still plainly contains a mainnet
 * address, so telling its author it "does not state which network it is for"
 * sends them to add a field that will not help. What is wrong is the bytes.
 */
export const cborNetworkBindingRefusal = (
  txCbor: string,
  networkId: Cardano.NetworkId,
  ownUtxoReferences?: ReadonlySet<string>,
): NetworkBindingRefusal | 'undecodable' | null => {
  try {
    const ambiguity = bodyStatesDuplicateKeys(txCbor);
    if (ambiguity === 'depth-limit') return 'states-unreadable-element';
    return networkBindingRefusal(
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor)).toCore()
        .body,
      networkId,
      ambiguity ? UNREADABLE_BYTES : ownUtxoReferences,
    );
  } catch {
    return 'undecodable';
  }
};

/**
 * {@link statedNetworkLabel} over the wire format. `null` for bytes that will
 * not parse — the `'undecodable'` message names no network, so there is
 * nothing for it to say.
 */
export const cborStatedNetworkLabel = (
  txCbor: string,
  networkId: Cardano.NetworkId,
): NetworkLabel => {
  try {
    if (bodyStatesDuplicateKeys(txCbor) === 'depth-limit') return null;
    return statedNetworkLabel(
      Serialization.Transaction.fromCbor(Serialization.TxCBOR(txCbor)).toCore()
        .body,
      networkId,
    );
  } catch {
    return null;
  }
};

/**
 * A user-facing name for the network the WALLET is on. Exact, unlike the
 * transaction's side: the served account carries its magic, so there is no
 * reason to be vague about it. An unrecognised magic is named by its number
 * rather than guessed at.
 *
 * Read off the SDK's reverse enum so a network the SDK learns about is named
 * here without a second list to keep in step.
 */
export const cardanoNetworkName = (networkMagic: number): string =>
  Cardano.NetworkMagics[networkMagic]?.toLowerCase() ??
  `network ${networkMagic}`;

/**
 * The CIP-30 refusal text for each cause, so the signing paths that share this
 * rule cannot drift apart in what they tell the dApp. The prompt the user sees
 * is rendered separately, from its own locale catalogue.
 *
 * Both networks are named where they are known: a user must be able to see
 * that the transaction targets one network while the wallet is on another,
 * and a sentence naming neither cannot do that.
 */
export const networkBindingRefusalMessage = (
  cause: NetworkBindingRefusal | 'undecodable',
  {
    statedNetwork,
    walletNetwork,
  }: {
    statedNetwork: NetworkLabel;
    walletNetwork: string;
  },
): string => {
  switch (cause) {
    case 'states-no-network':
      return `The transaction does not state which network it is for, and this account is on ${walletNetwork}.`;
    case 'states-other-network':
      return `The transaction targets ${
        statedNetwork === 'testnet'
          ? 'a testnet'
          : statedNetwork ?? 'a different network'
      }, but this account is on ${walletNetwork}.`;
    case 'states-unreadable-element':
      return `Part of the transaction could not be read, so the wallet cannot confirm it belongs to ${walletNetwork}.`;
    case 'undecodable':
      return 'The transaction could not be decoded.';
  }
};
