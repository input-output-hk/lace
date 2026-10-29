import { HexBytes } from '@lace-lib/util';
import { x25519 } from '@noble/curves/ed25519.js';
import { describe, expect, it, vi } from 'vitest';

import {
  sealDeviceEnvelope,
  sealDeviceRegistration,
} from '../../src/acc/envelopes';
import { openInboxEntry, sealInboxEntry } from '../../src/acc/inbox';
import { walkInbox } from '../../src/acc/inbox-walk';

import { AccountSim } from './account-sim';

import type {
  InboxWalkProps,
  OpenInboxEntries,
} from '../../src/acc/inbox-walk';
import type {
  ContractActionRecord,
  ShieldedTransactionEvents,
} from '../../src/infra/indexer';
import type { ShieldedCoin } from '@lace-contract/passport';

const coin = (value: bigint): ShieldedCoin => ({
  nonce: crypto.getRandomValues(new Uint8Array(32)),
  color: crypto.getRandomValues(new Uint8Array(32)),
  value,
});

const action = (
  txHash: string,
  entryPoint = 'deposit_shielded',
): ContractActionRecord => ({
  kind: 'ContractCall',
  entryPoint,
  txHash,
  identifiers: [`${txHash}-id`],
  blockHeight: 1,
});

/**
 * An account with a known encryption key over the simulated contract,
 * an opener holding the matching secret, and an indexer whose history is
 * whatever the test deposited and spent: each deposit lands in its own
 * transaction whose one shielded output carries the commitment the
 * contract claimed, at the next tree index, and each spend in its own
 * transaction whose one input carries the nullifier the contract claimed.
 * A deposit also carries the nullifier of an unrelated user coin, as the
 * depositor's own coin that pays for it does, unless it is made with
 * `userInput` off.
 */
const setup = async () => {
  const secretKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(secretKey);
  const sim = await AccountSim.create({ encKey: publicKey });
  const eventsByTx = new Map<string, ShieldedTransactionEvents>();
  const actions: ContractActionRecord[] = [];
  let nextIndex = 10n;

  const deposit = async (
    deposited: ShieldedCoin,
    { userInput = true }: { userInput?: boolean } = {},
  ) => {
    const commitment = await sim.deposit(
      deposited,
      await sealInboxEntry(publicKey, deposited),
    );
    const txHash = `tx-${actions.length}`;
    actions.push(action(txHash));
    const index = nextIndex;
    nextIndex += 1n;
    eventsByTx.set(txHash, {
      outputs: [
        {
          commitment,
          contractAddress: HexBytes.fromByteArray(sim.address),
          index,
        },
      ],
      nullifiers: userInput
        ? [HexBytes.fromByteArray(crypto.getRandomValues(new Uint8Array(32)))]
        : [],
    });
    return { commitment, index: Number(index) };
  };
  const spend = async (spent: ShieldedCoin, { index }: { index: number }) => {
    const nullifier = await sim.withdrawShielded(
      { ...spent, mtIndex: BigInt(index) },
      crypto.getRandomValues(new Uint8Array(32)),
    );
    const txHash = `tx-${actions.length}`;
    actions.push(action(txHash, 'withdraw_shielded_with_jubjub'));
    eventsByTx.set(txHash, { outputs: [], nullifiers: [nullifier] });
    return nullifier;
  };
  const appendEntry = async (entry: Uint8Array) => {
    await sim.call('deposit_shielded', coin(1n), entry);
  };
  const openEntries: OpenInboxEntries = vi.fn(async (entries: Uint8Array[]) =>
    Promise.all(entries.map(async entry => openInboxEntry(secretKey, entry))),
  );
  const indexer: InboxWalkProps['indexer'] = {
    enumerateContractActions: vi.fn(async () => actions),
    queryShieldedEvents: vi.fn(
      async (txHash: string) =>
        eventsByTx.get(txHash) ?? { outputs: [], nullifiers: [] },
    ),
  };
  const walk = async (overrides: Partial<InboxWalkProps> = {}) =>
    walkInbox({
      address: HexBytes.fromByteArray(sim.address),
      ledgerState: sim.ledger(),
      indexer,
      openEntries,
      ...overrides,
    });

  return {
    sim,
    publicKey,
    deposit,
    spend,
    appendEntry,
    openEntries,
    indexer,
    walk,
  };
};

const holdingOf = (
  deposited: ShieldedCoin,
  { commitment, index }: { commitment: string; index: number },
) => ({
  color: HexBytes.fromByteArray(deposited.color),
  value: deposited.value.toString(),
  commitment,
  index,
});

describe('walkInbox', () => {
  it('returns the coins whose commitment the chain created for the account, with their tree index', async () => {
    const { deposit, walk } = await setup();
    const first = coin(5n);
    const second = coin(2n ** 64n - 1n);
    const firstDeposit = await deposit(first);
    const secondDeposit = await deposit(second);

    await expect(walk()).resolves.toMatchObject({
      holdings: [
        holdingOf(first, firstDeposit),
        holdingOf(second, secondDeposit),
      ],
      skippedEntries: 0,
    });
  });

  it('hands back the inbox entry each holding was read from, in holding order', async () => {
    const { deposit, appendEntry, walk, sim } = await setup();
    await appendEntry(crypto.getRandomValues(new Uint8Array(192)));
    await deposit(coin(1n));
    await deposit(coin(2n));

    const { holdings, holdingEntries } = await walk();

    expect(holdings).toHaveLength(2);
    expect(holdingEntries).toEqual([
      sim.ledger().inbox.lookup(1n),
      sim.ledger().inbox.lookup(2n),
    ]);
  });

  it('recomputes each commitment exactly as the contract claimed it', async () => {
    const { deposit, walk } = await setup();
    const deposited = coin(9n);
    const { commitment } = await deposit(deposited);

    const { holdings } = await walk();

    expect(holdings[0]?.commitment).toBe(commitment);
    expect(commitment).toMatch(/^[\da-f]{64}$/);
  });

  it('opens every entry in one call, so the secret is derived once', async () => {
    const { deposit, openEntries, walk, sim } = await setup();
    await deposit(coin(1n));
    await deposit(coin(2n));

    await walk();

    expect(openEntries).toHaveBeenCalledOnce();
    expect(openEntries).toHaveBeenCalledWith([
      sim.ledger().inbox.lookup(0n),
      sim.ledger().inbox.lookup(1n),
    ]);
  });

  it('skips entries sealed towards another key, tampered with, or of another version, and counts them', async () => {
    const { deposit, appendEntry, publicKey, walk } = await setup();
    const foreign = await sealInboxEntry(
      x25519.getPublicKey(x25519.utils.randomSecretKey()),
      coin(3n),
    );
    const tampered = await sealInboxEntry(publicKey, coin(4n));
    tampered[70] ^= 0xff;
    const wrongVersion = await sealInboxEntry(publicKey, coin(4n));
    wrongVersion[0] = 0x02;
    await appendEntry(foreign);
    const kept = coin(6n);
    const keptDeposit = await deposit(kept);
    await appendEntry(tampered);
    await appendEntry(wrongVersion);
    await appendEntry(crypto.getRandomValues(new Uint8Array(192)));

    await expect(walk()).resolves.toMatchObject({
      holdings: [holdingOf(kept, keptDeposit)],
      skippedEntries: 4,
    });
  });

  it('passes over the Lace records, neither opening them as coins nor counting them', async () => {
    const { deposit, appendEntry, openEntries, walk, publicKey } =
      await setup();
    const held = coin(4n);
    const deposited = await deposit(held);
    const rosterKey = crypto.getRandomValues(new Uint8Array(32));
    await appendEntry(
      await sealDeviceEnvelope(publicKey, {
        secret: x25519.utils.randomSecretKey(),
        rosterKey,
      }),
    );
    await appendEntry(
      await sealDeviceRegistration(rosterKey, {
        readerPublicKey: HexBytes.fromByteArray(publicKey),
        devicePublicKey: 'd1'.repeat(32),
      }),
    );

    await expect(walk()).resolves.toMatchObject({
      holdings: [holdingOf(held, deposited)],
      skippedEntries: 0,
    });
    expect(openEntries).toHaveBeenCalledOnce();
    expect(vi.mocked(openEntries).mock.calls[0][0]).toHaveLength(1);
  });

  it('skips an entry that opens to a coin the chain never created for the account', async () => {
    const { deposit, appendEntry, publicKey, walk } = await setup();
    const kept = coin(6n);
    const keptDeposit = await deposit(kept);
    await appendEntry(await sealInboxEntry(publicKey, coin(7n)));

    await expect(walk()).resolves.toMatchObject({
      holdings: [holdingOf(kept, keptDeposit)],
      skippedEntries: 1,
    });
  });

  it('ignores an output of the same commitment that another contract received', async () => {
    const { deposit, indexer, walk } = await setup();
    const { commitment, index } = await deposit(coin(6n));
    vi.mocked(indexer.queryShieldedEvents).mockResolvedValue({
      outputs: [
        { commitment, contractAddress: 'ff'.repeat(32), index: BigInt(index) },
      ],
      nullifiers: [],
    });

    await expect(walk()).resolves.toEqual({
      holdings: [],
      holdingEntries: [],
      skippedEntries: 1,
    });
  });

  it('ignores an output the same transaction created for a user', async () => {
    const { deposit, indexer, walk } = await setup();
    const { commitment, index } = await deposit(coin(6n));
    vi.mocked(indexer.queryShieldedEvents).mockResolvedValue({
      outputs: [{ commitment, index: BigInt(index) }],
      nullifiers: [],
    });

    await expect(walk()).resolves.toEqual({
      holdings: [],
      holdingEntries: [],
      skippedEntries: 1,
    });
  });

  it('yields one holding for a coin two entries describe', async () => {
    const { deposit, appendEntry, publicKey, walk } = await setup();
    const kept = coin(6n);
    const keptDeposit = await deposit(kept);
    await appendEntry(await sealInboxEntry(publicKey, kept));

    await expect(walk()).resolves.toMatchObject({
      holdings: [holdingOf(kept, keptDeposit)],
      skippedEntries: 0,
    });
  });

  it('leaves out a coin the account has spent, with the entry it was read from', async () => {
    const { deposit, spend, walk, sim } = await setup();
    const spent = coin(5n);
    const kept = coin(8n);
    const spentDeposit = await deposit(spent);
    const keptDeposit = await deposit(kept);
    await spend(spent, spentDeposit);

    await expect(walk()).resolves.toEqual({
      holdings: [holdingOf(kept, keptDeposit)],
      holdingEntries: [sim.ledger().inbox.lookup(1n)],
      skippedEntries: 0,
    });
  });

  it('leaves out a spent coin however many entries describe it', async () => {
    const { deposit, spend, appendEntry, publicKey, walk } = await setup();
    const spent = coin(5n);
    const spentDeposit = await deposit(spent);
    await appendEntry(await sealInboxEntry(publicKey, spent));
    await spend(spent, spentDeposit);

    await expect(walk()).resolves.toEqual({
      holdings: [],
      holdingEntries: [],
      skippedEntries: 0,
    });
  });

  it('keeps every coin when the recorded nullifiers, such as those of a depositor, belong to no coin of the account', async () => {
    const { deposit, walk } = await setup();
    const kept = coin(6n);
    const keptDeposit = await deposit(kept);

    await expect(walk()).resolves.toMatchObject({
      holdings: [holdingOf(kept, keptDeposit)],
      skippedEntries: 0,
    });
  });

  it('computes no nullifier when the history records no spend', async () => {
    const { deposit, walk } = await setup();
    await deposit(coin(1n), { userInput: false });
    const ledger = await import('@midnightntwrk/ledger-v9');
    const newContractOwned = vi.fn(ledger.ZswapInput.newContractOwned);
    const loadLedger = vi.fn(async () => ({
      ...ledger,
      ZswapInput: { ...ledger.ZswapInput, newContractOwned },
    })) as unknown as NonNullable<InboxWalkProps['loadLedger']>;

    await expect(walk({ loadLedger })).resolves.toMatchObject({
      skippedEntries: 0,
    });
    expect(newContractOwned).not.toHaveBeenCalled();
  });

  it('reads each transaction of the history once, however many actions it carries', async () => {
    const { deposit, indexer, walk } = await setup();
    await deposit(coin(1n));
    vi.mocked(indexer.enumerateContractActions).mockResolvedValue([
      action('tx-0'),
      action('tx-0'),
    ]);

    await walk();

    expect(indexer.queryShieldedEvents).toHaveBeenCalledExactlyOnceWith('tx-0');
  });

  it('answers an empty inbox without opening anything or reading the history', async () => {
    const { openEntries, indexer, walk } = await setup();

    await expect(walk()).resolves.toEqual({
      holdings: [],
      holdingEntries: [],
      skippedEntries: 0,
    });
    expect(openEntries).not.toHaveBeenCalled();
    expect(indexer.enumerateContractActions).not.toHaveBeenCalled();
  });

  it('answers an inbox with nothing that opens without loading the ledger or reading the history', async () => {
    const { appendEntry, indexer, walk } = await setup();
    await appendEntry(crypto.getRandomValues(new Uint8Array(192)));
    await appendEntry(new Uint8Array(192));
    const loadLedger = vi.fn<NonNullable<InboxWalkProps['loadLedger']>>();

    await expect(walk({ loadLedger })).resolves.toEqual({
      holdings: [],
      holdingEntries: [],
      skippedEntries: 2,
    });
    expect(loadLedger).not.toHaveBeenCalled();
    expect(indexer.enumerateContractActions).not.toHaveBeenCalled();
  });

  it('loads the ledger once for every entry that opens', async () => {
    const { deposit, walk } = await setup();
    const first = coin(1n);
    const second = coin(2n);
    const firstDeposit = await deposit(first);
    const secondDeposit = await deposit(second);
    const loadLedger = vi.fn(async () => import('@midnightntwrk/ledger-v9'));

    await expect(walk({ loadLedger })).resolves.toMatchObject({
      holdings: [
        holdingOf(first, firstDeposit),
        holdingOf(second, secondDeposit),
      ],
      skippedEntries: 0,
    });
    expect(loadLedger).toHaveBeenCalledOnce();
  });

  it('raises a ledger that fails to load instead of reporting an inbox of noise', async () => {
    const { deposit, indexer, walk } = await setup();
    await deposit(coin(1n));
    const loadLedger = vi.fn(async () => {
      throw new Error('ledger unavailable');
    });

    await expect(walk({ loadLedger })).rejects.toThrow('ledger unavailable');
    expect(indexer.enumerateContractActions).not.toHaveBeenCalled();
  });

  it('skips an entry whose coin the ledger refuses to commit to', async () => {
    const { deposit, appendEntry, openEntries, walk } = await setup();
    await appendEntry(crypto.getRandomValues(new Uint8Array(192)));
    const kept = coin(6n);
    const keptDeposit = await deposit(kept);
    vi.mocked(openEntries).mockResolvedValueOnce([
      { ...kept, color: new Uint8Array(3) },
      kept,
    ]);

    await expect(walk()).resolves.toMatchObject({
      holdings: [holdingOf(kept, keptDeposit)],
      skippedEntries: 1,
    });
  });

  it('answers an inbox whose every coin the ledger refuses without reading the history', async () => {
    const { deposit, indexer, openEntries, walk } = await setup();
    const kept = coin(6n);
    await deposit(kept);
    vi.mocked(openEntries).mockResolvedValueOnce([
      { ...kept, color: new Uint8Array(3) },
    ]);

    await expect(walk()).resolves.toEqual({
      holdings: [],
      holdingEntries: [],
      skippedEntries: 1,
    });
    expect(indexer.enumerateContractActions).not.toHaveBeenCalled();
  });

  it('passes an indexer failure through, since it is the chain read that failed, not an entry', async () => {
    const { deposit, indexer, walk } = await setup();
    await deposit(coin(1n));
    vi.mocked(indexer.enumerateContractActions).mockRejectedValue(
      new Error('indexer down'),
    );

    await expect(walk()).rejects.toThrow('indexer down');
  });
});
