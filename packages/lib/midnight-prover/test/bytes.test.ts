import { describe, expect, it } from 'vitest';

import {
  CHUNK_BYTES,
  createByteClient,
  createByteStore,
  digest,
  hex,
} from '../src/bytes';
import { createProverClient } from '../src/client';
import { createProofJobs } from '../src/jobs';

import type { ProverCommand, ProverReply } from '../src/protocol';

const json = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const base = { owner: 'document-a', job: 'request-a' };
const setup = (maxBytes = 1024) => {
  let time = 0;
  const store = createByteStore({
    maxBytes,
    now: () => time,
    retentionMs: 100,
  });
  const client = createByteClient(async operation =>
    store.handle(json(operation), base.owner, base.job),
  );
  return {
    store,
    client,
    expire: () => {
      time += 101;
      store.sweep();
    },
  };
};

describe('bounded immutable proof bytes', () => {
  it('reuses identical content and notices mutation of the original buffer', async () => {
    const { store, client } = setup();
    const source = new Uint8Array([1, 2, 3]);
    const first = await client.upload(source);
    const second = await client.upload(source);
    expect(second.id).toBe(first.id);
    source[0] = 9;
    const changed = await client.upload(source);
    expect(changed.id).not.toBe(first.id);
    expect(await client.download(first)).toEqual(new Uint8Array([1, 2, 3]));
    expect(store.pin(base.owner, base.job, [first])[0]).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });
  it('rejects wrong-owner handles, incomplete uploads, invalid order and corrupt content', async () => {
    const { store } = setup();
    const source = new Uint8Array([1, 2]);
    const { ref } = await store.handle(
      { operation: 'upload', size: 2, digest: await digest(source) },
      base.owner,
      base.job,
    );
    await expect(
      store.handle({ operation: 'commit', ref: ref.id }, base.owner, base.job),
    ).rejects.toThrow('Incomplete');
    expect(() => store.pin(base.owner, base.job, [ref])).toThrow('Invalid');
    await expect(
      store.handle(
        { operation: 'chunk', ref: ref.id, offset: 1, hex: '01' },
        base.owner,
        base.job,
      ),
    ).rejects.toThrow('Out-of-order');
    await expect(
      store.handle(
        { operation: 'chunk', ref: ref.id, offset: 0, hex: '0102' },
        'foreign',
        base.job,
      ),
    ).rejects.toThrow('no longer available');
    await store.handle(
      { operation: 'chunk', ref: ref.id, offset: 0, hex: '0103' },
      base.owner,
      base.job,
    );
    await expect(
      store.handle({ operation: 'commit', ref: ref.id }, base.owner, base.job),
    ).rejects.toThrow('integrity');
    expect(store.isActive()).toBe(false);
  });
  it('reserves declared bytes, never evicts active inputs, and evicts released content', async () => {
    const { store, client, expire } = setup(4);
    const ref = await client.upload(new Uint8Array([1, 2, 3, 4]));
    store.pin(base.owner, base.job, [ref]);
    expire();
    await expect(client.upload(new Uint8Array([5]))).rejects.toThrow(
      'budget is busy',
    );
    store.release(base.owner, base.job);
    await expect(client.upload(new Uint8Array([5]))).resolves.toMatchObject({
      size: 1,
    });
    await expect(client.upload(new Uint8Array(5))).rejects.toThrow(
      'memory limit',
    );
  });
  it('expires abandoned uploads, including a client lost before commit', async () => {
    const { store, client, expire } = setup(4);
    const pending = await store.handle(
      { operation: 'upload', size: 4, digest: await digest(new Uint8Array(4)) },
      base.owner,
      base.job,
    );
    await expect(client.upload(new Uint8Array([1]))).rejects.toThrow(
      'budget is busy',
    );
    expire();
    await expect(
      store.handle(
        { operation: 'commit', ref: pending.ref.id },
        base.owner,
        base.job,
      ),
    ).rejects.toThrow('no longer available');
    expect(store.isActive()).toBe(false);
    await expect(client.upload(new Uint8Array(4))).resolves.toMatchObject({
      size: 4,
    });
  });
  it('bounds concurrent uploads and rejects chunks above the wire limit', async () => {
    const store = createByteStore({ maxUploads: 1 });
    const hash = await digest(new Uint8Array(CHUNK_BYTES + 1));
    const { ref } = await store.handle(
      { operation: 'upload', size: CHUNK_BYTES + 1, digest: hash },
      base.owner,
      base.job,
    );
    await expect(
      store.handle(
        { operation: 'upload', size: 1, digest: hash },
        base.owner,
        'other',
      ),
    ).rejects.toThrow('Too many');
    await expect(
      store.handle(
        {
          operation: 'chunk',
          ref: ref.id,
          offset: 0,
          hex: hex(new Uint8Array(CHUNK_BYTES + 1)),
        },
        base.owner,
        base.job,
      ),
    ).rejects.toThrow('Invalid proof chunk');
  });
  it('bounds leases even when every session reuses the same empty payload', async () => {
    const store = createByteStore({ maxSessions: 1 });
    const source = new Uint8Array();
    const client = createByteClient(async operation =>
      store.handle(operation, 'owner', 'one'),
    );
    await client.upload(source);
    await expect(
      store.handle(
        { operation: 'upload', size: 0, digest: await digest(source) },
        'owner',
        'two',
      ),
    ).rejects.toThrow('Too many proof material sessions');
    store.release('owner', 'one');
    await expect(
      store.handle(
        { operation: 'upload', size: 0, digest: await digest(source) },
        'owner',
        'two',
      ),
    ).resolves.toMatchObject({ ready: true });
  });
  it('renews earlier inputs while another input is being uploaded slowly', async () => {
    let now = 0;
    const store = createByteStore({ now: () => now, retentionMs: 100 });
    const client = createByteClient(async operation =>
      store.handle(operation, base.owner, base.job),
    );
    const first = await client.upload(new Uint8Array([1]));
    const { ref } = await store.handle(
      {
        operation: 'upload',
        size: 2,
        digest: await digest(new Uint8Array([2, 3])),
      },
      base.owner,
      base.job,
    );
    now = 75;
    await store.handle(
      { operation: 'chunk', ref: ref.id, offset: 0, hex: '02' },
      base.owner,
      base.job,
    );
    now = 150;
    await store.handle(
      { operation: 'chunk', ref: ref.id, offset: 1, hex: '03' },
      base.owner,
      base.job,
    );
    await store.handle(
      { operation: 'commit', ref: ref.id },
      base.owner,
      base.job,
    );
    expect(store.pin(base.owner, base.job, [first, ref])).toEqual([
      new Uint8Array([1]),
      new Uint8Array([2, 3]),
    ]);
  });
  it('does not expose a ready handle while content validation is pending', async () => {
    const { store } = setup();
    const source = new Uint8Array([1]);
    const { ref } = await store.handle(
      { operation: 'upload', size: 1, digest: await digest(source) },
      base.owner,
      base.job,
    );
    await store.handle(
      { operation: 'chunk', ref: ref.id, offset: 0, hex: '01' },
      base.owner,
      base.job,
    );
    const committed = store.handle(
      { operation: 'commit', ref: ref.id },
      base.owner,
      base.job,
    );
    expect(() => store.pin(base.owner, base.job, [ref])).toThrow('Invalid');
    await expect(
      store.handle(
        { operation: 'chunk', ref: ref.id, offset: 1, hex: '02' },
        base.owner,
        base.job,
      ),
    ).rejects.toThrow('Out-of-order');
    await committed;
    expect(store.pin(base.owner, base.job, [ref])[0]).toEqual(source);
  });
  it('passes a greater-than-64-MiB encoded key and result through both JSON hops', async () => {
    const bytes = new Uint8Array(33_666_884);
    bytes[0] = 7;
    bytes[bytes.length - 1] = 19;
    const expectedHash = await digest(bytes);
    let maxMessage = 0;
    let chunks = 0;
    const wire =
      (handle: (command: ProverCommand) => Promise<ProverReply>) =>
      async (command: ProverCommand) => {
        const encoded = JSON.stringify(command);
        maxMessage = Math.max(maxMessage, encoded.length);
        if (command.operation === 'chunk') chunks += 1;
        const reply = await handle(JSON.parse(encoded) as ProverCommand);
        maxMessage = Math.max(maxMessage, JSON.stringify(reply).length);
        return json(reply);
      };
    const offscreen = createProofJobs({
      createWorker: () => ({
        dispose: () => {},
        run: async request => {
          expect(await digest(request.circuit.keyMaterial!.proverKey)).toBe(
            expectedHash,
          );
          return request.method === 'check'
            ? [2n ** 90n, undefined]
            : request.circuit.keyMaterial!.proverKey.slice();
        },
      }),
    });
    const backend = createProverClient({
      ensure: async () => {},
      release: async () => {},
      intervalMs: 0,
      send: wire(async command => offscreen.handle(command)),
    }).provider();
    const background = createProofJobs({});
    const provider = createProverClient({
      ensure: async () => {},
      release: async () => {},
      intervalMs: 0,
      send: wire(async command =>
        background.handle(command, base.owner, backend),
      ),
    }).provider();
    const circuit = {
      keyLocation: 'k17',
      serializedPreimage: new Uint8Array([1]),
      keyMaterial: {
        proverKey: bytes,
        verifierKey: new Uint8Array([2]),
        ir: new Uint8Array([3]),
      },
    };
    expect(await provider.check(circuit)).toEqual([2n ** 90n, undefined]);
    const uploaded = chunks;
    const result = await provider.prove(circuit);
    expect(chunks).toBe(uploaded);
    expect(await digest(result)).toBe(expectedHash);
    expect(await digest(bytes)).toBe(expectedHash);
    expect(maxMessage).toBeLessThan(CHUNK_BYTES * 2 + 1024);
  }, 60_000);
});
