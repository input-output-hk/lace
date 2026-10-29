import { TokenColor } from '@lace-contract/passport';
import { HexBytes } from '@lace-lib/util';

import { isLaceRecord } from './envelopes';

import type { Ledger } from './acc-module';
import type { IndexerClient } from '../infra/indexer';
import type { ShieldedCoin, ShieldedHolding } from '@lace-contract/passport';
import type * as LedgerV9 from '@midnightntwrk/ledger-v9';

/**
 * Opens the given inbox entries with the account encryption secrets, one
 * result per entry in order, null for an entry that does not open. The
 * walk calls it once, with every coin entry, so an implementation backed
 * by a key ceremony prompts once.
 */
export type OpenInboxEntries = (
  entries: Uint8Array[],
) => Promise<(ShieldedCoin | null)[]>;

/**
 * The slice of the ledger binding the walk recomputes commitments and
 * nullifiers with.
 */
export type LedgerZswap = Pick<
  typeof LedgerV9,
  'ZswapChainState' | 'ZswapInput' | 'ZswapOffer' | 'ZswapOutput'
>;

export type InboxWalkProps = {
  /** The account address, the recipient every held coin was committed to. */
  address: string;
  ledgerState: Pick<Ledger, 'inbox_count' | 'inbox'>;
  indexer: Pick<
    IndexerClient,
    'enumerateContractActions' | 'queryShieldedEvents'
  >;
  openEntries: OpenInboxEntries;
  /** Ledger binding loader; defaults to the vendored ledger-v9 module. */
  loadLedger?: () => Promise<LedgerZswap>;
};

/**
 * What an inbox walk found: every unspent coin the account holds that
 * chain data confirms, the inbox entry each holding was read from in the
 * same order, which a key rotation re-encrypts, and how many entries were
 * passed over because they did not open, described a coin the chain never
 * created for the account, or could not be read at all. A coin the
 * account has spent is neither a holding nor counted as passed over.
 */
export type InboxWalk = {
  holdings: ShieldedHolding[];
  holdingEntries: Uint8Array[];
  skippedEntries: number;
};

type Candidate = {
  coin: ShieldedCoin;
  info: LedgerV9.ShieldedCoinInfo;
  commitment: string;
  entry: Uint8Array;
};

/**
 * What the chain recorded for the account: the tree index of every
 * shielded output it received, by commitment, and the nullifier of every
 * shielded coin the same transactions spent.
 */
type ChainHistory = {
  outputs: Map<string, bigint>;
  nullifiers: Set<string>;
};

const SCRATCH_BLOCK_TIME = new Date(0);

const defaultLoadLedger = async (): Promise<LedgerZswap> =>
  import('@midnightntwrk/ledger-v9');

/** The entries the contract holds, in inbox order, the Lace records included. */
export const inboxEntries = (
  ledgerState: InboxWalkProps['ledgerState'],
): Uint8Array[] => {
  const entries: Uint8Array[] = [];
  for (let ordinal = 0n; ordinal < ledgerState.inbox_count; ordinal += 1n) {
    if (ledgerState.inbox.member(ordinal)) {
      entries.push(ledgerState.inbox.lookup(ordinal));
    }
  }
  return entries;
};

/**
 * The commitment the chain carries for a coin the account received,
 * recomputed with the ledger's own output construction: a contract-owned
 * output of this coin towards the account address, which is exactly what
 * a depositor builds and the contract claims. A description the ledger
 * refuses to commit to is no candidate.
 */
const toCandidate = (
  { ZswapOutput }: LedgerZswap,
  address: string,
  { coin, entry }: { coin: ShieldedCoin; entry: Uint8Array },
): Candidate | null => {
  const info: LedgerV9.ShieldedCoinInfo = {
    type: HexBytes.fromByteArray(coin.color),
    nonce: HexBytes.fromByteArray(coin.nonce),
    value: coin.value,
  };
  try {
    const output = ZswapOutput.newContractOwned(info, undefined, address);
    return { coin, info, commitment: output.commitment.toLowerCase(), entry };
  } catch {
    return null;
  }
};

/**
 * The nullifier each held coin's spend reveals, computed with the ledger's
 * own input construction: a contract-owned input of the coin from the
 * account, exactly what the contract builds when it spends one. A
 * contract-owned nullifier binds the coin and the account address alone,
 * never the coin's position, so the inputs are built over a scratch
 * commitment tree holding just these coins rather than the chain's tree.
 */
const coinNullifiers = (
  { ZswapChainState, ZswapInput, ZswapOffer, ZswapOutput }: LedgerZswap,
  address: string,
  held: Candidate[],
): string[] => {
  const tree = held
    .reduce(
      (state, { info }) =>
        state.tryApply(
          ZswapOffer.fromOutput(
            ZswapOutput.newContractOwned(info, undefined, address),
            info.type,
            info.value,
          ),
        )[0],
      new ZswapChainState(),
    )
    .postBlockUpdate(SCRATCH_BLOCK_TIME, 0n);
  return held.map(({ info }, position) =>
    ZswapInput.newContractOwned(
      { ...info, mt_index: BigInt(position) },
      undefined,
      address,
      tree,
    ).nullifier.toLowerCase(),
  );
};

/**
 * The shielded outputs the chain created for the account and the
 * nullifiers it recorded, read from the ledger events of the transactions
 * that acted on the contract. A deposit is one such action, so its
 * transaction is among them; so is every spend of a coin the account
 * holds, because only the contract's own call can spend it.
 */
const chainHistory = async (
  address: string,
  indexer: InboxWalkProps['indexer'],
): Promise<ChainHistory> => {
  const actions = await indexer.enumerateContractActions(address);
  const hashes = [...new Set(actions.map(action => action.txHash))];
  const events = await Promise.all(
    hashes.map(async hash => indexer.queryShieldedEvents(hash)),
  );
  const recipient = address.toLowerCase();
  return {
    outputs: new Map(
      events
        .flatMap(({ outputs }) => outputs)
        .filter(output => output.contractAddress === recipient)
        .map(output => [output.commitment, output.index]),
    ),
    nullifiers: new Set(events.flatMap(({ nullifiers }) => nullifiers)),
  };
};

/**
 * Walks the account's inbox the way the custody standard prescribes:
 * every entry other than the Lace records, which hold the account keys
 * and the grant bookkeeping rather than coins, is opened with the
 * encryption secrets, each coin that opens is verified by recomputing
 * its commitment and finding it among the outputs the chain created for
 * the account, and the index that output took in the commitment tree is
 * captured with it. A coin whose nullifier the same history recorded has
 * been spent and is left out; nullifiers of other parties' inputs never
 * match, since a contract-owned nullifier binds the account address.
 * Anyone can append any bytes to the inbox, so an entry that does not open, or opens to a coin
 * the chain never created for this account, is skipped as noise and
 * counted, never raised. Two entries describing the same coin, as a
 * re-encryption after a key rotation leaves behind, yield one holding,
 * read from the first entry that described it. An empty inbox, or one
 * with nothing that opens, is answered without loading the ledger or
 * reading the chain's history. A ledger binding that fails to load is a
 * failure of the walk itself, not of any entry, so it is raised rather
 * than reported as an inbox of noise.
 */
export const walkInbox = async ({
  address,
  ledgerState,
  indexer,
  openEntries,
  loadLedger = defaultLoadLedger,
}: InboxWalkProps): Promise<InboxWalk> => {
  const entries = inboxEntries(ledgerState).filter(
    entry => !isLaceRecord(entry),
  );
  const nothing = (skippedEntries: number): InboxWalk => ({
    holdings: [],
    holdingEntries: [],
    skippedEntries,
  });
  if (entries.length === 0) return nothing(0);
  const coins = await openEntries(entries);
  if (coins.every(coin => coin === null)) return nothing(entries.length);
  const ledger = await loadLedger();
  const candidates = coins.map(
    (coin, ordinal) =>
      coin && toCandidate(ledger, address, { coin, entry: entries[ordinal] }),
  );
  if (candidates.every(candidate => candidate === null)) {
    return nothing(entries.length);
  }
  const { outputs, nullifiers } = await chainHistory(address, indexer);
  const held = new Map<string, { candidate: Candidate; index: bigint }>();
  let skippedEntries = 0;
  for (const candidate of candidates) {
    const index = candidate ? outputs.get(candidate.commitment) : undefined;
    if (!candidate || index === undefined) {
      skippedEntries += 1;
      continue;
    }
    if (!held.has(candidate.commitment)) {
      held.set(candidate.commitment, { candidate, index });
    }
  }
  const confirmed = [...held.values()];
  const spent =
    nullifiers.size === 0
      ? confirmed.map(() => false)
      : coinNullifiers(
          ledger,
          address,
          confirmed.map(({ candidate }) => candidate),
        ).map(nullifier => nullifiers.has(nullifier));
  const unspent = confirmed.filter((_, position) => !spent[position]);
  return {
    holdings: unspent.map(({ candidate, index }) => ({
      color: TokenColor(HexBytes.fromByteArray(candidate.coin.color)),
      value: candidate.coin.value.toString(),
      commitment: candidate.commitment,
      index: Number(index),
    })),
    holdingEntries: unspent.map(({ candidate }) => candidate.entry),
    skippedEntries,
  };
};
