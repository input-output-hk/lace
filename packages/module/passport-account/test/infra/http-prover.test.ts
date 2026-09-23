import { createHash } from 'node:crypto';

import { ArtefactIntegrityError } from '@lace-contract/passport';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { accManifest } from '../../src/acc/manifest';
import {
  createHttpProver,
  createManifestKeyMaterialResolver,
  ProofServerError,
} from '../../src/infra/http-prover';

import type { AccManifest } from '../../src/acc/manifest';
import type {
  KeyMaterialResolver,
  ProverFetch,
} from '../../src/infra/http-prover';

const framing = vi.hoisted(() => {
  type KeyMaterial = {
    proverKey: Uint8Array;
    verifierKey: Uint8Array;
    ir: Uint8Array;
  };
  const createProvingPayload = vi.fn(
    (
      preimage: Uint8Array,
      _overwriteBindingInput: bigint | undefined,
      keyMaterial?: KeyMaterial,
    ) =>
      Uint8Array.from([
        0x50,
        ...preimage,
        ...(keyMaterial ? [...keyMaterial.proverKey, ...keyMaterial.ir] : []),
      ]),
  );
  const createCheckPayload = vi.fn((preimage: Uint8Array, ir?: Uint8Array) =>
    Uint8Array.from([0x43, ...preimage, ...(ir ?? [])]),
  );
  return { createProvingPayload, createCheckPayload };
});

vi.mock('@midnight-ntwrk/midnight-js-protocol/ledger', () => framing);

const baseUrl = 'https://proof-server.example:6300';
const preimage = new Uint8Array([1, 2, 3, 4]);
const proofBytes = new Uint8Array([9, 8, 7]);
const keyLocation = 'keys/add_device_with_jubjub';
const keyMaterial = {
  proverKey: new Uint8Array([4, 5]),
  verifierKey: new Uint8Array([6]),
  ir: new Uint8Array([7, 8]),
};

const okResponse = (bytes: Uint8Array) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  arrayBuffer: async () =>
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
});

const errorResponse = (status: number, statusText: string) => ({
  ok: false,
  status,
  statusText,
  arrayBuffer: async () => new ArrayBuffer(0),
});

const materialResolver = (): KeyMaterialResolver & ReturnType<typeof vi.fn> =>
  vi.fn(async () => keyMaterial) as KeyMaterialResolver &
    ReturnType<typeof vi.fn>;

describe('createHttpProver', () => {
  afterEach(() => {
    vi.useRealTimers();
    framing.createProvingPayload.mockClear();
    framing.createCheckPayload.mockClear();
  });

  it('resolves the key material, frames the proving payload, and posts it as an octet-stream body to /prove', async () => {
    const fetchHttp = vi.fn(async () => okResponse(proofBytes));
    const resolveKeyMaterial = materialResolver();
    const prover = createHttpProver(baseUrl, {
      fetchHttp: fetchHttp as ProverFetch,
      resolveKeyMaterial,
    });

    const proof = await prover.prove(preimage, keyLocation);

    expect(proof).toEqual(proofBytes);
    expect(resolveKeyMaterial).toHaveBeenCalledWith(keyLocation);
    expect(framing.createProvingPayload).toHaveBeenCalledWith(
      preimage,
      undefined,
      keyMaterial,
    );
    expect(fetchHttp).toHaveBeenCalledTimes(1);
    const [url, init] = fetchHttp.mock
      .calls[0] as unknown as Parameters<ProverFetch>;
    expect(url).toBe(`${baseUrl}/prove`);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/octet-stream',
    });
    expect(init.body).toEqual(Uint8Array.from([0x50, 1, 2, 3, 4, 4, 5, 7, 8]));
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('frames the check payload with the circuit IR, posts to /check, and tolerates a trailing slash', async () => {
    const fetchHttp = vi.fn(async () => okResponse(proofBytes));
    const resolveKeyMaterial = materialResolver();
    const prover = createHttpProver(`${baseUrl}/`, {
      fetchHttp: fetchHttp as ProverFetch,
      resolveKeyMaterial,
    });

    await prover.check(preimage, keyLocation);

    expect(resolveKeyMaterial).toHaveBeenCalledWith(keyLocation);
    expect(framing.createCheckPayload).toHaveBeenCalledWith(
      preimage,
      keyMaterial.ir,
    );
    const [url, init] = fetchHttp.mock
      .calls[0] as unknown as Parameters<ProverFetch>;
    expect(url).toBe(`${baseUrl}/check`);
    expect(init.body).toEqual(Uint8Array.from([0x43, 1, 2, 3, 4, 7, 8]));
  });

  it('forwards the binding input overwrite into the proving payload', async () => {
    const fetchHttp = vi.fn(async () => okResponse(proofBytes));
    const prover = createHttpProver(baseUrl, {
      fetchHttp: fetchHttp as ProverFetch,
      resolveKeyMaterial: materialResolver(),
    });

    await prover.prove(preimage, keyLocation, 42n);

    expect(framing.createProvingPayload).toHaveBeenCalledWith(
      preimage,
      42n,
      keyMaterial,
    );
  });

  it('sends a protocol builtin location without key material for the proof server to supply', async () => {
    const fetchHttp = vi.fn(async () => okResponse(proofBytes));
    const resolveKeyMaterial = vi.fn(async () => undefined);
    const prover = createHttpProver(baseUrl, {
      fetchHttp: fetchHttp as ProverFetch,
      resolveKeyMaterial,
    });

    await prover.prove(preimage, 'midnight/zswap/spend');

    expect(resolveKeyMaterial).toHaveBeenCalledWith('midnight/zswap/spend');
    expect(framing.createProvingPayload).toHaveBeenCalledWith(
      preimage,
      undefined,
      undefined,
    );
    const [, init] = fetchHttp.mock
      .calls[0] as unknown as Parameters<ProverFetch>;
    expect(init.body).toEqual(Uint8Array.from([0x50, 1, 2, 3, 4]));
  });

  it('requires a key material resolver or an artefact url', () => {
    expect(() => createHttpProver(baseUrl)).toThrow(
      'createHttpProver needs resolveKeyMaterial or an artefactUrl',
    );
  });

  it.each([500, 503])('retries once on a %i and succeeds', async status => {
    const fetchHttp = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(status, 'Transient'))
      .mockResolvedValueOnce(okResponse(proofBytes));
    const prover = createHttpProver(baseUrl, {
      fetchHttp: fetchHttp as ProverFetch,
      resolveKeyMaterial: materialResolver(),
    });

    const proof = await prover.prove(preimage, keyLocation);

    expect(proof).toEqual(proofBytes);
    expect(fetchHttp).toHaveBeenCalledTimes(2);
  });

  it('throws a ProofServerError carrying the status when the retry fails too', async () => {
    const fetchHttp = vi.fn(async () => errorResponse(503, 'Unavailable'));
    const prover = createHttpProver(baseUrl, {
      fetchHttp: fetchHttp as ProverFetch,
      resolveKeyMaterial: materialResolver(),
    });

    const failure = prover.prove(preimage, keyLocation);

    await expect(failure).rejects.toThrow(ProofServerError);
    await expect(failure).rejects.toMatchObject({ status: 503 });
    expect(fetchHttp).toHaveBeenCalledTimes(2);
  });

  it('does not retry statuses outside 500 and 503', async () => {
    const fetchHttp = vi.fn(async () => errorResponse(404, 'Not Found'));
    const prover = createHttpProver(baseUrl, {
      fetchHttp: fetchHttp as ProverFetch,
      resolveKeyMaterial: materialResolver(),
    });

    await expect(prover.check(preimage, keyLocation)).rejects.toMatchObject({
      status: 404,
    });
    expect(fetchHttp).toHaveBeenCalledTimes(1);
  });

  it('aborts and throws a ProofServerError after the five minute timeout', async () => {
    vi.useFakeTimers();
    const fetchHttp = vi.fn(
      async (_url: string, init: { signal: AbortSignal }) =>
        new Promise<never>((_resolve, reject) => {
          init.signal.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        }),
    );
    const prover = createHttpProver(baseUrl, {
      fetchHttp: fetchHttp as unknown as ProverFetch,
      resolveKeyMaterial: materialResolver(),
    });

    const failure = prover.prove(preimage, keyLocation);
    const assertion = expect(failure).rejects.toThrow(
      /timed out after 300000ms/,
    );
    await vi.waitFor(() => {
      expect(fetchHttp).toHaveBeenCalledTimes(1);
    });
    await vi.advanceTimersByTimeAsync(300_000);

    await assertion;
    expect(fetchHttp).toHaveBeenCalledTimes(1);
  });

  it('rethrows transport failures unchanged', async () => {
    const fetchHttp = vi.fn(async () => {
      throw new Error('connection refused');
    });
    const prover = createHttpProver(baseUrl, {
      fetchHttp: fetchHttp as unknown as ProverFetch,
      resolveKeyMaterial: materialResolver(),
    });

    await expect(prover.prove(preimage, keyLocation)).rejects.toThrow(
      'connection refused',
    );
  });
});

describe('createManifestKeyMaterialResolver', () => {
  const artefactUrl = 'https://artefacts.example/acc';
  const circuit = 'add_device_with_jubjub';

  const sha256Hex = (bytes: Uint8Array): string =>
    createHash('sha256').update(bytes).digest('hex');

  const fixtures: Record<string, Uint8Array> = {
    [`${artefactUrl}/zkir/${circuit}.bzkir`]: new Uint8Array([1, 2, 3]),
    [`${artefactUrl}/keys/${circuit}.prover`]: new Uint8Array([4, 5, 6, 7]),
    [`${artefactUrl}/keys/${circuit}.verifier`]: new Uint8Array([8, 9]),
  };

  const manifestForFixtures = (): AccManifest => ({
    ...accManifest,
    circuits: {
      ...accManifest.circuits,
      [circuit]: {
        ...accManifest.circuits[circuit],
        zkirSha256: sha256Hex(fixtures[`${artefactUrl}/zkir/${circuit}.bzkir`]),
        proverKeySha256: sha256Hex(
          fixtures[`${artefactUrl}/keys/${circuit}.prover`],
        ),
        verifierKeySha256: sha256Hex(
          fixtures[`${artefactUrl}/keys/${circuit}.verifier`],
        ),
      },
    },
  });

  const fetchFixtures = () =>
    vi.fn(async (url: string) => {
      const bytes = fixtures[url];
      if (!bytes) throw new Error(`No fixture for ${url}`);
      return bytes;
    });

  it('maps a manifest key location to the verified prover key, verifier key, and IR', async () => {
    const resolver = createManifestKeyMaterialResolver({
      artefactUrl,
      fetchBytes: fetchFixtures(),
      manifest: manifestForFixtures(),
    });

    await expect(resolver(`keys/${circuit}`)).resolves.toEqual({
      proverKey: new Uint8Array([4, 5, 6, 7]),
      verifierKey: new Uint8Array([8, 9]),
      ir: new Uint8Array([1, 2, 3]),
    });
  });

  it('accepts the bare circuit name as the key location', async () => {
    const resolver = createManifestKeyMaterialResolver({
      artefactUrl,
      fetchBytes: fetchFixtures(),
      manifest: manifestForFixtures(),
    });

    await expect(resolver(circuit)).resolves.toMatchObject({
      ir: new Uint8Array([1, 2, 3]),
    });
  });

  it('resolves a canonical contract location whose vk pin matches the manifest', async () => {
    const manifest = manifestForFixtures();
    const resolver = createManifestKeyMaterialResolver({
      artefactUrl,
      fetchBytes: fetchFixtures(),
      manifest,
    });
    const vkPin = manifest.circuits[circuit].verifierKeySha256;

    await expect(
      resolver(`contract:${'ab'.repeat(32)}/${circuit}?vk=${vkPin}`),
    ).resolves.toEqual({
      proverKey: new Uint8Array([4, 5, 6, 7]),
      verifierKey: new Uint8Array([8, 9]),
      ir: new Uint8Array([1, 2, 3]),
    });
  });

  it('throws ArtefactIntegrityError when the canonical vk pin mismatches the manifest', async () => {
    const manifest = manifestForFixtures();
    const fetchBytes = fetchFixtures();
    const resolver = createManifestKeyMaterialResolver({
      artefactUrl,
      fetchBytes,
      manifest,
    });
    const driftedPin = 'f'.repeat(64);

    const failure = resolver(
      `contract:${'ab'.repeat(32)}/${circuit}?vk=${driftedPin}`,
    );

    await expect(failure).rejects.toThrow(ArtefactIntegrityError);
    await expect(failure).rejects.toMatchObject({
      code: 'artefact-integrity',
      message: `verifier key pin mismatch for ${circuit}: the chain expects ${driftedPin}, the manifest pins ${manifest.circuits[circuit].verifierKeySha256}`,
    });
    expect(fetchBytes).not.toHaveBeenCalled();
  });

  it('resolves an unknown location to undefined without downloading anything', async () => {
    const fetchBytes = fetchFixtures();
    const resolver = createManifestKeyMaterialResolver({
      artefactUrl,
      fetchBytes,
      manifest: manifestForFixtures(),
    });

    await expect(resolver('midnight/zswap/spend')).resolves.toBeUndefined();
    expect(fetchBytes).not.toHaveBeenCalled();
  });
});
