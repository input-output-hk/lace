import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createIndexerClient } from '../../src/infra/indexer';

const ledgerMocks = vi.hoisted(() => ({
  deserialize: vi.fn(),
}));

vi.mock('@midnightntwrk/ledger-v9', () => ({
  Event: { deserialize: ledgerMocks.deserialize },
}));

import type {
  IndexerFetch,
  IndexerPublicData,
  IndexerSocket,
} from '../../src/infra/indexer';

const indexerUrl = 'http://localhost:8088/api/v4/graphql';
const indexerWsUrl = 'ws://localhost:8088/api/v4/graphql/ws';
const address = '0x00aabb';

type SocketListener = (event: { data?: unknown; message?: string }) => void;

class FakeSocket implements IndexerSocket {
  public readonly sent: string[] = [];
  public closeCount = 0;

  private readonly listeners = new Map<string, SocketListener[]>();

  public constructor(readonly url: string, readonly protocol: string) {}

  public addEventListener(type: string, listener: SocketListener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(): void {
    this.closeCount += 1;
  }

  public emit(type: string, event: { data?: unknown; message?: string }): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  public emitMessage(payload: unknown): void {
    this.emit('message', { data: JSON.stringify(payload) });
  }
}

const rawAction = (hash: string, entryPoint?: string) => ({
  __typename: entryPoint
    ? ('ContractCall' as const)
    : ('ContractDeploy' as const),
  entryPoint,
  transaction: {
    hash,
    identifiers: [`${hash}-id`],
    block: { height: 7 },
    zswapStartIndex: 1,
    zswapEndIndex: 2,
  },
});

const frontierResponse = (action: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: async () => ({ data: { contractAction: action } }),
});

const record = (hash: string, entryPoint?: string) => ({
  kind: entryPoint ? 'ContractCall' : 'ContractDeploy',
  entryPoint,
  txHash: hash,
  identifiers: [`${hash}-id`],
  blockHeight: 7,
  startIndex: 1,
  endIndex: 2,
});

describe('createIndexerClient', () => {
  describe('queryContractState', () => {
    it('returns the parsed state from the injected provider, created once', async () => {
      const state = { data: 'parsed-ledger-state' };
      const provider: IndexerPublicData = {
        queryContractState: vi.fn(async () => state),
      } as unknown as IndexerPublicData;
      const createPublicDataProvider = vi.fn(async () => provider);
      const client = createIndexerClient({
        indexerUrl,
        indexerWsUrl,
        createPublicDataProvider,
      });

      await expect(client.queryContractState(address)).resolves.toBe(state);
      await expect(client.queryContractState(address)).resolves.toBe(state);
      expect(provider.queryContractState).toHaveBeenCalledWith(address);
      expect(createPublicDataProvider).toHaveBeenCalledTimes(1);
    });
  });

  describe('enumerateContractActions', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    type Harness = {
      client: ReturnType<typeof createIndexerClient>;
      sockets: FakeSocket[];
      fetchHttp: ReturnType<typeof vi.fn>;
    };

    const harness = (frontier: unknown): Harness => {
      const sockets: FakeSocket[] = [];
      const fetchHttp = vi.fn(async () => frontierResponse(frontier));
      const client = createIndexerClient({
        indexerUrl,
        indexerWsUrl,
        fetchHttp: fetchHttp as unknown as IndexerFetch,
        createSocket: (url, protocol) => {
          const socket = new FakeSocket(url, protocol);
          sockets.push(socket);
          return socket;
        },
      });
      return { client, sockets, fetchHttp };
    };

    const openAndSubscribe = async (harnessed: Harness) => {
      await vi.advanceTimersByTimeAsync(0);
      const [socket] = harnessed.sockets;
      socket.emit('open', {});
      socket.emitMessage({ type: 'connection_ack' });
      return socket;
    };

    it('replays the history in order and closes the socket after the frontier drain', async () => {
      const harnessed = harness(rawAction('tx-2', 'add_device_with_jubjub'));
      const replay = harnessed.client.enumerateContractActions(address);
      const socket = await openAndSubscribe(harnessed);

      expect(socket.url).toBe(indexerWsUrl);
      expect(socket.protocol).toBe('graphql-transport-ws');
      const init = JSON.parse(socket.sent[0]) as { type: string };
      expect(init.type).toBe('connection_init');
      const subscribe = JSON.parse(socket.sent[1]) as {
        type: string;
        payload: { variables: { address: string } };
      };
      expect(subscribe.type).toBe('subscribe');
      expect(subscribe.payload.variables.address).toBe('00aabb');

      socket.emitMessage({
        type: 'next',
        payload: { data: { contractActions: rawAction('tx-1') } },
      });
      socket.emitMessage({
        type: 'next',
        payload: {
          data: {
            contractActions: rawAction('tx-2', 'add_device_with_jubjub'),
          },
        },
      });
      await vi.advanceTimersByTimeAsync(500);

      await expect(replay).resolves.toEqual([
        record('tx-1'),
        record('tx-2', 'add_device_with_jubjub'),
      ]);
      expect(socket.closeCount).toBe(1);
    });

    it('collects same-transaction siblings arriving during the drain window', async () => {
      const harnessed = harness(rawAction('tx-1'));
      const replay = harnessed.client.enumerateContractActions(address);
      const socket = await openAndSubscribe(harnessed);

      socket.emitMessage({
        type: 'next',
        payload: { data: { contractActions: rawAction('tx-1') } },
      });
      socket.emitMessage({
        type: 'next',
        payload: {
          data: { contractActions: rawAction('tx-1', 'activate_with_jubjub') },
        },
      });
      await vi.advanceTimersByTimeAsync(500);

      await expect(replay).resolves.toEqual([
        record('tx-1'),
        record('tx-1', 'activate_with_jubjub'),
      ]);
    });

    it('resolves with an empty history without opening a socket when the address has no actions', async () => {
      const harnessed = harness(null);

      await expect(
        harnessed.client.enumerateContractActions(address),
      ).resolves.toEqual([]);
      expect(harnessed.sockets).toHaveLength(0);
    });

    it('resolves with what was replayed when the server completes the subscription', async () => {
      const harnessed = harness(rawAction('tx-2'));
      const replay = harnessed.client.enumerateContractActions(address);
      const socket = await openAndSubscribe(harnessed);

      socket.emitMessage({
        type: 'next',
        payload: { data: { contractActions: rawAction('tx-1') } },
      });
      socket.emitMessage({ type: 'complete' });

      await expect(replay).resolves.toEqual([record('tx-1')]);
      expect(socket.closeCount).toBe(1);
    });

    it('rejects and closes the socket on a subscription error message', async () => {
      const harnessed = harness(rawAction('tx-1'));
      const replay = harnessed.client.enumerateContractActions(address);
      const socket = await openAndSubscribe(harnessed);
      const assertion = expect(replay).rejects.toThrow(
        'contractActions subscription',
      );

      socket.emitMessage({ type: 'error', payload: { message: 'boom' } });

      await assertion;
      expect(socket.closeCount).toBe(1);
    });

    it('rejects and closes the socket when the replay times out', async () => {
      const harnessed = harness(rawAction('tx-1'));
      const replay = harnessed.client.enumerateContractActions(address, {
        timeoutMs: 1000,
      });
      const socket = await openAndSubscribe(harnessed);
      const assertion = expect(replay).rejects.toThrow(
        'timed out after 1000ms',
      );

      await vi.advanceTimersByTimeAsync(1000);

      await assertion;
      expect(socket.closeCount).toBe(1);
    });

    it('rejects when the frontier query returns GraphQL errors', async () => {
      const fetchHttp = vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ errors: [{ message: 'unknown address' }] }),
      }));
      const client = createIndexerClient({
        indexerUrl,
        indexerWsUrl,
        fetchHttp: fetchHttp as unknown as IndexerFetch,
        createSocket: () => {
          throw new Error('unexpected socket');
        },
      });

      await expect(client.enumerateContractActions(address)).rejects.toThrow(
        'unknown address',
      );
    });

    it('rejects when the frontier query fails at the HTTP level', async () => {
      const fetchHttp = vi.fn(async () => ({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        json: async () => ({}),
      }));
      const client = createIndexerClient({
        indexerUrl,
        indexerWsUrl,
        fetchHttp: fetchHttp as unknown as IndexerFetch,
      });

      await expect(client.enumerateContractActions(address)).rejects.toThrow(
        'HTTP 502',
      );
    });
  });
});

describe('createIndexerClient: queryShieldedEvents', () => {
  const txHash = 'ab'.repeat(32);
  const rawEvents = ['0102', '0304', '0506', '0708'];
  const contract = 'CD'.repeat(32);
  const commitment = 'EF'.repeat(32);

  const eventsResponse = (events: { raw: string }[] | undefined) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      data: {
        transactions:
          events === undefined
            ? []
            : [{ hash: txHash, zswapLedgerEvents: events }],
      },
    }),
  });

  const clientOver = (fetchHttp: ReturnType<typeof vi.fn>) =>
    createIndexerClient({
      indexerUrl,
      indexerWsUrl,
      fetchHttp: fetchHttp as unknown as IndexerFetch,
    });

  beforeEach(() => {
    ledgerMocks.deserialize.mockReset();
  });

  it('asks for the ledger events of the transaction by hash and keeps the shielded outputs and spent nullifiers, lowercased', async () => {
    const fetchHttp = vi.fn(async () =>
      eventsResponse(rawEvents.map(raw => ({ raw }))),
    );
    ledgerMocks.deserialize
      .mockReturnValueOnce({
        content: {
          tag: 'zswapInput',
          nullifier: 'AB'.repeat(32),
          contract: undefined,
        },
      })
      .mockReturnValueOnce({
        content: { tag: 'zswapOutput', commitment, contract, mtIndex: 7n },
      })
      .mockReturnValueOnce({
        content: {
          tag: 'zswapOutput',
          commitment: '11'.repeat(32),
          contract: undefined,
          mtIndex: 8n,
        },
      })
      .mockReturnValueOnce({
        content: { tag: 'contractLog', address: contract },
      });

    await expect(
      clientOver(fetchHttp).queryShieldedEvents(`0x${txHash}`),
    ).resolves.toEqual({
      outputs: [
        {
          commitment: commitment.toLowerCase(),
          contractAddress: contract.toLowerCase(),
          index: 7n,
        },
        { commitment: '11'.repeat(32), index: 8n },
      ],
      nullifiers: ['ab'.repeat(32)],
    });

    expect(
      ledgerMocks.deserialize.mock.calls.map(call => call[0] as Uint8Array),
    ).toEqual(
      rawEvents.map(raw =>
        Uint8Array.from(raw.match(/.{2}/g)!, pair => Number.parseInt(pair, 16)),
      ),
    );
    const [url, init] = fetchHttp.mock.calls[0] as unknown as [
      string,
      { body: string },
    ];
    expect(url).toBe(indexerUrl);
    const body = JSON.parse(init.body) as { query: string; variables: unknown };
    expect(body.variables).toEqual({ offset: { hash: txHash } });
    expect(body.query).toContain('zswapLedgerEvents { raw }');
  });

  it('answers no events for a transaction the indexer does not know, without touching the ledger', async () => {
    const fetchHttp = vi.fn(async () => eventsResponse(undefined));

    await expect(
      clientOver(fetchHttp).queryShieldedEvents(txHash),
    ).resolves.toEqual({ outputs: [], nullifiers: [] });
    expect(ledgerMocks.deserialize).not.toHaveBeenCalled();
  });

  it('rejects when the query returns GraphQL errors', async () => {
    const fetchHttp = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ errors: [{ message: 'unknown transaction' }] }),
    }));

    await expect(
      clientOver(fetchHttp).queryShieldedEvents(txHash),
    ).rejects.toThrow(
      'transactions query: [{"message":"unknown transaction"}]',
    );
  });

  it('rejects when the query fails at the HTTP level', async () => {
    const fetchHttp = vi.fn(async () => ({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => ({}),
    }));

    await expect(
      clientOver(fetchHttp).queryShieldedEvents(txHash),
    ).rejects.toThrow('transactions query failed: HTTP 502 Bad Gateway');
  });

  it('passes an event the ledger cannot read through as the failure it is', async () => {
    const fetchHttp = vi.fn(async () => eventsResponse([{ raw: '0102' }]));
    ledgerMocks.deserialize.mockImplementation(() => {
      throw new Error('Unable to deserialize Event.');
    });

    await expect(
      clientOver(fetchHttp).queryShieldedEvents(txHash),
    ).rejects.toThrow('Unable to deserialize Event.');
  });

  it.each(['zz', '010', '01 02'])(
    'refuses an event that is not hex (%s) before the ledger reads it',
    async raw => {
      const fetchHttp = vi.fn(async () => eventsResponse([{ raw }]));

      await expect(
        clientOver(fetchHttp).queryShieldedEvents(txHash),
      ).rejects.toThrow('transactions query: ledger event is not hex');
      expect(ledgerMocks.deserialize).not.toHaveBeenCalled();
    },
  );
});
