import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import webpack from 'webpack';

const require = createRequire(import.meta.url);
const root = path.resolve(__dirname, '../../../..');
const sdkDirectory = path.join(
  root,
  'node_modules/@midnightntwrk/wallet-sdk-indexer-client',
);
const sdkSource = path.join(sdkDirectory, 'dist/effect/DeflateWebSocket.js');
const original = readFileSync(sdkSource, 'utf8');
const workerConfig = require('../../webpack/base/serviceworker.webpack.config.js');
const loader = require('../../webpack/midnight-indexer-transport-loader.js');
const standard = 'graphql-transport-ws';
const compressed = 'graphql-transport-ws+deflate';
const directory = mkdtempSync(path.join(tmpdir(), 'lace-indexer-transport-'));

const bundle: {
  makeSocket?: (base: typeof Peer) => new (url: string) => Peer;
} = {};

class Peer {
  public static selected: Peer;
  public static policy: 'compressed' | 'first' | 'standard' = 'first';
  public protocol: string;
  public readyState = 1;
  public binaryType = '';
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onopen: (() => void) | null = null;
  public onclose: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public send = vi.fn();
  public close = vi.fn((_code?: number, _reason?: string) => {
    this.readyState = 3;
  });

  public constructor(readonly url: string, readonly protocols: string[]) {
    Peer.selected = this;
    this.protocol =
      Peer.policy === 'first'
        ? protocols[0]
        : protocols.find(
            value =>
              value === (Peer.policy === 'compressed' ? compressed : standard),
          )!;
  }
}

beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    const compiler = webpack({
      mode: 'none',
      target: 'node',
      entry: sdkSource,
      module: workerConfig.module,
      output: {
        path: directory,
        filename: 'transport.cjs',
        library: { type: 'commonjs2' },
      },
    });
    compiler.run((error, stats) => {
      compiler.close(closeError => {
        if (error || closeError || stats?.hasErrors()) {
          reject(
            error ??
              closeError ??
              new Error(stats?.toString({ all: false, errors: true })),
          );
        } else resolve();
      });
    });
  });
  bundle.makeSocket = require(path.join(
    directory,
    'transport.cjs',
  )).makeDeflateWebSocket;
}, 30_000);

afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe('extension indexer transport', () => {
  it('receives an ack and subscription event when an intermediary selects the first protocol', () => {
    Peer.policy = 'first';
    const socket = new (bundle.makeSocket!(Peer))(
      'wss://indexer.example/api/v0?project_id=test',
    );
    const peer = Peer.selected;
    expect(socket.protocol).toBe(standard);
    expect(peer.url).toBe('wss://indexer.example/api/v0?project_id=test');
    expect(peer.protocols).toEqual([standard, compressed]);
    const received: string[] = [];
    socket.onmessage = event => received.push(event.data);
    socket.send('{"type":"connection_init"}');
    expect(peer.send).toHaveBeenCalledWith('{"type":"connection_init"}');
    peer.onmessage?.(
      new MessageEvent('message', { data: '{"type":"connection_ack"}' }),
    );
    peer.onmessage?.(
      new MessageEvent('message', {
        data: '{"type":"next","id":"1","payload":{"data":{"dustLedgerEvents":{"id":1}}}}',
      }),
    );
    expect(received.map(data => JSON.parse(data).type)).toEqual([
      'connection_ack',
      'next',
    ]);
  });

  it('still inflates frames when a server prefers compression', () => {
    Peer.policy = 'compressed';
    const socket = new (bundle.makeSocket!(Peer))('wss://indexer.example');
    expect(socket.protocol).toBe(compressed);
    expect(Peer.selected.binaryType).toBe('arraybuffer');
    const receive = vi.fn();
    socket.onmessage = receive;
    const text = JSON.stringify({
      type: 'next',
      payload: { data: 'x'.repeat(512) },
    });
    const bytes = Uint8Array.from(deflateSync(text));
    Peer.selected.onmessage?.(
      new MessageEvent('message', { data: bytes.buffer }),
    );
    expect(receive.mock.calls[0][0].data).toBe(text);
  });

  it('passes text through for a standard-only server and forwards lifecycle and cleanup', () => {
    Peer.policy = 'standard';
    const socket = new (bundle.makeSocket!(Peer))('wss://indexer.example');
    expect(socket.protocol).toBe(standard);
    const receive = vi.fn();
    const open = vi.fn();
    const close = vi.fn();
    const error = vi.fn();
    socket.onmessage = receive;
    socket.onopen = open;
    socket.onclose = close;
    socket.onerror = error;
    const message = new MessageEvent('message', { data: '{"type":"ping"}' });
    Peer.selected.onmessage?.(message);
    Peer.selected.onopen?.();
    Peer.selected.onerror?.();
    Peer.selected.onclose?.();
    expect(receive).toHaveBeenCalledWith(message);
    expect(open).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    socket.close(1000, 'test complete');
    expect(Peer.selected.close).toHaveBeenCalledWith(1000, 'test complete');
    expect(socket.readyState).toBe(3);
    socket.onmessage = null;
    expect(Peer.selected.onmessage).toBeNull();
  });

  it('leaves corrupt binary frames for graphql-ws to reject', () => {
    Peer.policy = 'compressed';
    const socket = new (bundle.makeSocket!(Peer))('wss://indexer.example');
    const receive = vi.fn();
    socket.onmessage = receive;
    const event = new MessageEvent('message', {
      data: new Uint8Array([1, 2, 3]).buffer,
    });
    Peer.selected.onmessage?.(event);
    expect(receive).toHaveBeenCalledWith(event);
  });

  it('does not modify the installed SDK source', () => {
    expect(readFileSync(sdkSource, 'utf8')).toBe(original);
    expect(original).toContain(
      '[GRAPHQL_TRANSPORT_WS_DEFLATE, GRAPHQL_TRANSPORT_WS_PROTOCOL]',
    );
  });

  it('rejects unexpected source content before applying a patch', () => {
    expect(() =>
      loader.call(
        { resourcePath: sdkSource, addDependency: vi.fn() },
        original + '\n',
      ),
    ).toThrow('Requalify');
  });

  it.each(['2.0.0-canary.20261104142910-33e5e4c', '2.0.0-rc.3'])(
    'rejects SDK %s even if its source is identical',
    version => {
      writeFileSync(
        path.join(directory, 'package.json'),
        JSON.stringify({ version }),
      );
      expect(() =>
        loader.call(
          {
            resourcePath: path.join(
              directory,
              'dist/effect/DeflateWebSocket.js',
            ),
            addDependency: vi.fn(),
          },
          original,
        ),
      ).toThrow('Requalify');
    },
  );
});
