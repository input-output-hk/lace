import { createHash } from 'node:crypto';

import { ArtefactIntegrityError } from '@lace-contract/passport';
import { describe, expect, it, vi } from 'vitest';

import {
  loadCircuitAssets,
  loadVerifierKey,
  UnknownCircuitError,
} from '../../src/acc/artefact-loader';
import { accManifest } from '../../src/acc/manifest';

import type {
  AccManifest,
  AccProvingCircuitName,
} from '../../src/acc/manifest';

const artefactUrl = 'https://artefacts.example/acc';
const circuit: AccProvingCircuitName = 'add_device_with_jubjub';

const sha256Hex = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');

const fixtures = {
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

const fetchFixtures = (bytesByUrl: Record<string, Uint8Array>) =>
  vi.fn(async (url: string) => {
    const bytes = bytesByUrl[url];
    if (!bytes) throw new Error(`No fixture for ${url}`);
    return bytes;
  });

describe('loadCircuitAssets', () => {
  it('returns the zkir and key bytes when every digest matches the manifest', async () => {
    const fetchBytes = fetchFixtures(fixtures);

    const assets = await loadCircuitAssets({
      artefactUrl,
      circuit,
      fetchBytes,
      manifest: manifestForFixtures(),
    });

    expect(assets).toEqual({
      zkir: new Uint8Array([1, 2, 3]),
      proverKey: new Uint8Array([4, 5, 6, 7]),
      verifierKey: new Uint8Array([8, 9]),
    });
    expect(fetchBytes.mock.calls.map(([url]) => url).sort()).toEqual([
      `${artefactUrl}/keys/${circuit}.prover`,
      `${artefactUrl}/keys/${circuit}.verifier`,
      `${artefactUrl}/zkir/${circuit}.bzkir`,
    ]);
  });

  it('tolerates a trailing slash on the artefact url', async () => {
    const assets = await loadCircuitAssets({
      artefactUrl: `${artefactUrl}/`,
      circuit,
      fetchBytes: fetchFixtures(fixtures),
      manifest: manifestForFixtures(),
    });

    expect(assets.zkir).toEqual(new Uint8Array([1, 2, 3]));
  });

  it.each([
    'zkir/add_device_with_jubjub.bzkir',
    'keys/add_device_with_jubjub.prover',
    'keys/add_device_with_jubjub.verifier',
  ])(
    'throws ArtefactIntegrityError when a byte of %s is tampered',
    async assetPath => {
      const tampered = { ...fixtures };
      const url = `${artefactUrl}/${assetPath}`;
      const bytes = new Uint8Array(tampered[url]);
      bytes[0] ^= 0xff;
      tampered[url] = bytes;

      await expect(
        loadCircuitAssets({
          artefactUrl,
          circuit,
          fetchBytes: fetchFixtures(tampered),
          manifest: manifestForFixtures(),
        }),
      ).rejects.toThrow(ArtefactIntegrityError);
    },
  );

  it('reports the asset url and both digests on a mismatch', async () => {
    const tampered = { ...fixtures };
    const url = `${artefactUrl}/zkir/${circuit}.bzkir`;
    tampered[url] = new Uint8Array([9, 9, 9]);

    await expect(
      loadCircuitAssets({
        artefactUrl,
        circuit,
        fetchBytes: fetchFixtures(tampered),
        manifest: manifestForFixtures(),
      }),
    ).rejects.toThrow(
      `sha256 mismatch for ${url}: expected ${sha256Hex(
        fixtures[url],
      )}, got ${sha256Hex(new Uint8Array([9, 9, 9]))}`,
    );
  });

  it('throws UnknownCircuitError before fetching anything for an unlisted circuit', async () => {
    const fetchBytes = fetchFixtures(fixtures);

    await expect(
      loadCircuitAssets({
        artefactUrl,
        circuit: 'transfer_everything' as AccProvingCircuitName,
        fetchBytes,
      }),
    ).rejects.toThrow(UnknownCircuitError);
    expect(fetchBytes).not.toHaveBeenCalled();
  });
});

describe('loadVerifierKey', () => {
  const keyBytes = new Uint8Array([11, 12, 13]);
  const verifierFixtures = {
    [`${artefactUrl}/keys/deposit_unshielded.verifier`]: keyBytes,
  };

  it('downloads keys/<circuit>.verifier and returns the bytes when the digest matches', async () => {
    const fetchBytes = fetchFixtures(verifierFixtures);

    const verifierKey = await loadVerifierKey({
      artefactUrl,
      circuit: 'deposit_unshielded',
      fetchBytes,
      expectedSha256: sha256Hex(keyBytes),
    });

    expect(verifierKey).toEqual(keyBytes);
    expect(fetchBytes).toHaveBeenCalledExactlyOnceWith(
      `${artefactUrl}/keys/deposit_unshielded.verifier`,
    );
  });

  it('tolerates a trailing slash on the artefact url', async () => {
    const verifierKey = await loadVerifierKey({
      artefactUrl: `${artefactUrl}/`,
      circuit: 'deposit_unshielded',
      fetchBytes: fetchFixtures(verifierFixtures),
      expectedSha256: sha256Hex(keyBytes),
    });

    expect(verifierKey).toEqual(keyBytes);
  });

  it('throws ArtefactIntegrityError when the key bytes mismatch the pin', async () => {
    await expect(
      loadVerifierKey({
        artefactUrl,
        circuit: 'deposit_unshielded',
        fetchBytes: fetchFixtures(verifierFixtures),
        expectedSha256: sha256Hex(new Uint8Array([9, 9, 9])),
      }),
    ).rejects.toThrow(ArtefactIntegrityError);
  });
});
