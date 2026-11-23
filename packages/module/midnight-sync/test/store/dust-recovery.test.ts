import { createServer } from 'node:http';
import { createRequire } from 'node:module';

import * as ledgerV8 from '@midnightntwrk/ledger-v8';
import * as ledgerV9 from '@midnightntwrk/ledger-v9';
import {
  InMemoryTransactionHistoryStorage,
  mergeWalletEntries,
  WalletEntrySchema,
} from '@midnightntwrk/wallet-sdk';
import { SyncService } from '@midnightntwrk/wallet-sdk/dust/v2';
import { ProtocolVersion } from '@midnightntwrk/wallet-sdk-abstractions';
import { Effect, Option } from 'effect';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createDustWallet } from '../../src/store/dust-sync';

import type { DefaultDustConfiguration } from '@midnightntwrk/wallet-sdk/dust';
import type { AddressInfo } from 'node:net';
import type WebSocket from 'ws';

const boundary = ProtocolVersion.ProtocolVersion(2_000_000n);
const v8 = ProtocolVersion.ProtocolVersion(1_000_000n);
const fixture = {
  entries: [] as { id: number; protocolVersion: number }[],
  genesisVersion: v8,
  isUnavailable: false,
  genesisQueries: 0,
  eventQueries: [] as (number | null)[],
  indexerAddress: '',
};
// Real SDK transports and boundary search against synthetic metadata only.
// This fixture does not model ledger replay, funds, or spendability.
const server = createServer((_request, response) => {
  fixture.genesisQueries++;
  response.setHeader('Content-Type', 'application/json');
  response.end(
    JSON.stringify({
      data: {
        block: {
          protocolVersion: Number(fixture.genesisVersion),
          height: 1,
          hash: '00'.repeat(32),
          timestamp: 1_000,
          ledgerParameters: Buffer.from(
            ledgerV9.LedgerParameters.initialParameters().serialize(),
          ).toString('hex'),
          zswapEndIndex: 0,
          dustCommitmentEndIndex: 0,
          dustGenerationEndIndex: 0,
          dustCommitmentMerkleTreeRoot: '00',
          dustGenerationMerkleTreeRoot: '00',
        },
      },
    }),
  );
});
const { Server } = createRequire(import.meta.url)('ws') as typeof WebSocket;
const websocket = new Server({
  server,
  handleProtocols: (protocols: Set<string> | string[]) =>
    Array.from(protocols).includes('graphql-transport-ws') &&
    'graphql-transport-ws',
});
websocket.on('connection', socket =>
  socket.on('message', raw => {
    if (!Buffer.isBuffer(raw)) throw new Error('Expected JSON message bytes');
    const message = JSON.parse(raw.toString('utf8')) as
      | {
          type: 'subscribe';
          id: string;
          payload: { variables: { id?: number | null } };
        }
      | { type: 'connection_init' };

    if (message.type === 'connection_init')
      socket.send(JSON.stringify({ type: 'connection_ack' }));
    if (message.type !== 'subscribe') return;
    const id = message.payload.variables.id ?? null;
    fixture.eventQueries.push(id);
    const event = fixture.entries.find(event => event.id >= (id ?? 0));
    if (fixture.isUnavailable)
      socket.send(
        JSON.stringify({
          type: 'error',
          id: message.id,
          payload: [{ message: 'fixture unavailable' }],
        }),
      );
    else {
      if (event)
        socket.send(
          JSON.stringify({
            type: 'next',
            id: message.id,
            payload: {
              data: {
                dustLedgerEvents: {
                  ...event,
                  maxId: fixture.entries.at(-1)!.id,
                },
              },
            },
          }),
        );
      socket.send(JSON.stringify({ type: 'complete', id: message.id }));
    }
  }),
);
const config = (): DefaultDustConfiguration => ({
  networkId: 'undeployed',
  forks: { v9: boundary },
  indexerClientConnection: { indexerHttpUrl: fixture.indexerAddress },
  costParameters: { additionalFeeOverhead: 0n, feeBlocksMargin: 0 },
  txHistoryStorage: new InMemoryTransactionHistoryStorage(
    WalletEntrySchema,
    mergeWalletEntries,
  ),
});
const startSnapshot = async (filtered = false, fresh = true) => {
  const network = {
    indexerAddress: fixture.indexerAddress,
    nodeAddress: 'http://127.0.0.1:9944',
    proofServer: { kind: 'in-process' as const },
  };
  const factory = createDustWallet(
    config(),
    filtered
      ? {
          ...network,
          filteredDustSyncIndexer: fixture.indexerAddress,
          isFilteredDustSyncRolloutEnabled: true,
        }
      : network,
    fresh,
  );
  const wallet = await factory.startWithSeed(new Uint8Array(32).fill(2));
  try {
    return JSON.parse(await wallet.serializeState()) as {
      protocolVersion: string;
      offset: string;
      syncKind: string;
    };
  } finally {
    await wallet.stop();
  }
};

describe('fresh Dust recovery with an isolated HTTP/WebSocket indexer fixture', () => {
  beforeAll(async () => {
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    fixture.indexerAddress = `http://127.0.0.1:${
      (server.address() as AddressInfo).port
    }/graphql`;
  });
  afterAll(async () => {
    for (const client of websocket.clients) client.terminate();
    await new Promise<void>(resolve => {
      websocket.close(() => {
        resolve();
      });
    });
    await new Promise<void>(resolve =>
      server.close(() => {
        resolve();
      }),
    );
  });
  beforeEach(() => {
    fixture.genesisVersion = v8;
    fixture.genesisQueries = 0;
    fixture.eventQueries = [];
    fixture.isUnavailable = false;
    fixture.entries = [
      { id: 2, protocolVersion: Number(v8) },
      { id: 10, protocolVersion: Number(v8) },
      { id: 21, protocolVersion: Number(boundary) },
      { id: 40, protocolVersion: Number(boundary) },
    ];
  });
  it('finds the exact boundary despite gaps in shared event IDs', async () => {
    const start = await Effect.runPromise(
      SyncService.findDustTimelineStart(config(), boundary),
    );
    expect(fixture.eventQueries.length).toBeGreaterThan(2);
    expect(Option.getOrNull(start)).toEqual({ cursor: 10n, version: boundary });
  });
  it('starts event recovery immediately before the first v9 Dust event', async () => {
    const snapshot = await startSnapshot();
    expect(snapshot.protocolVersion).toBe(String(boundary));
    expect(snapshot.offset).toBe('10');
    expect(snapshot.syncKind).toBe('events');
    expect(fixture.genesisQueries).toBe(0);
  });
  it('uses the same boundary discovery for the filtered composition', async () => {
    const snapshot = await startSnapshot(true);
    expect(snapshot.protocolVersion).toBe(String(boundary));
    expect(snapshot.offset).toBe('10');
  });
  it.each([2_000_000, 2_001_000])(
    'syncs on protocol %s and after its version increases without changing the flag',
    async protocolVersion => {
      fixture.genesisVersion = ProtocolVersion.ProtocolVersion(
        BigInt(protocolVersion),
      );
      fixture.entries = [{ id: 1, protocolVersion }];
      const seed = new Uint8Array(32).fill(3);
      const keys = {
        v8: ledgerV8.DustSecretKey.fromSeed(seed),
        v9: ledgerV9.DustSecretKey.fromSeed(seed),
      };
      const wallet = await createDustWallet(
        config(),
        {
          indexerAddress: fixture.indexerAddress,
          nodeAddress: 'http://127.0.0.1:9944',
          proofServer: { kind: 'in-process' },
          filteredDustSyncIndexer: fixture.indexerAddress,
          isFilteredDustSyncRolloutEnabled: true,
        },
        true,
      ).startWithSeed(seed);
      try {
        await wallet.stepSync(keys);
        expect(JSON.parse(await wallet.serializeState())).toMatchObject({
          syncKind: 'projections',
          offset: '1',
        });
        expect(fixture.genesisQueries).toBe(2);
        fixture.genesisVersion = ProtocolVersion.ProtocolVersion(
          BigInt(protocolVersion + 1),
        );
        await wallet.stepSync(keys);
        expect(JSON.parse(await wallet.serializeState())).toMatchObject({
          syncKind: 'projections',
          offset: '1',
        });
        expect(fixture.genesisQueries).toBe(3);
      } finally {
        await wallet.stop();
        keys.v8.clear();
        keys.v9.clear();
      }
    },
  );
  it.each([false, true])(
    'keeps ordinary startup on v8-only chains with filtering %s',
    async filtered => {
      fixture.entries = [
        { id: 2, protocolVersion: Number(v8) },
        { id: 40, protocolVersion: Number(v8) },
      ];
      expect((await startSnapshot(filtered)).protocolVersion).toBe(String(v8));
      expect(fixture.genesisQueries).toBe(1);
    },
  );
  it('starts a v9-native chain from genesis without skipping its first event', async () => {
    fixture.genesisVersion = boundary;
    fixture.entries = [{ id: 1, protocolVersion: Number(boundary) }];
    const snapshot = await startSnapshot();
    expect(snapshot.protocolVersion).toBe(String(boundary));
    expect(snapshot.offset).toBe('0');
  });
  it('falls back to ordinary startup when boundary discovery fails', async () => {
    fixture.isUnavailable = true;
    const snapshot = await startSnapshot();
    expect(snapshot.protocolVersion).toBe(String(v8));
    expect(snapshot.offset).toBe('0');
  });
  it('does not search old Dust history when preparing a cached restore', async () => {
    await startSnapshot(false, false);
    expect(fixture.eventQueries).toEqual([]);
  });
});
