import { EntropyHex, Mnemonic } from '@lace-lib/crypto';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { describe, expect, it, vi } from 'vitest';

import {
  createPasskeyKeySource,
  createPasskeySessionKeySource,
  HKDF_RECORD_KEY_INFO,
  HKDF_WALLET_ENTROPY_INFO,
} from '../src';

const vector = {
  authoriserSalt:
    '0caadfc9c1ca3f88897abc59fe897f98a3e9f3ff740239b8828121aa7b814fc2',
  rootSalt: '7bae2156e6afa3a5aa6e9d8169f633a0d65874995f3770e5c330b2042582812b',
  authoriser:
    '0101010101010101010101010101010101010101010101010101010101010101',
  root: '0202020202020202020202020202020202020202020202020202020202020202',
  recordKey: '2ab5851bc51f50a8a460c14c8bf148bb4a6392ad82003f671872ce5603e20d8c',
  entropy: '76ae9b46d9a4a6238b6149f32f6511fb9b4f95aa3b9c5ff6d69176fcc13a443f',
  words:
    'fame coconut utility print giraffe common twin evil alone exclude great echo since cart erode noise icon repair amused drip awake coral hat unveil',
} as const;

const toBytes = (source: BufferSource): Uint8Array =>
  source instanceof ArrayBuffer
    ? new Uint8Array(source)
    : new Uint8Array(source.buffer, source.byteOffset, source.byteLength);

describe('frozen v1 recipe', () => {
  it('matches literal PRF salts, HKDF outputs and BIP-39 words', async () => {
    const rawId = new Uint8Array([1]).buffer;
    const get = vi.fn(async (options?: CredentialRequestOptions) => {
      const evalPrf = options?.publicKey?.extensions?.prf?.eval;
      expect(bytesToHex(toBytes(evalPrf!.first))).toBe(vector.authoriserSalt);
      expect(bytesToHex(toBytes(evalPrf!.second!))).toBe(vector.rootSalt);
      return {
        rawId,
        getClientExtensionResults: () => ({
          prf: {
            results: {
              first: hexToBytes(vector.authoriser),
              second: hexToBytes(vector.root),
            },
          },
        }),
      } as unknown as Credential;
    });
    const source = createPasskeySessionKeySource({
      rpId: 'localhost',
      credentials: { get } as unknown as CredentialsContainer,
    });
    const key = await source.recordKey();
    const expectedKey = await crypto.subtle.importKey(
      'raw',
      Uint8Array.from(hexToBytes(vector.recordKey)),
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
    const iv = new Uint8Array(12);
    const sealed = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new Uint8Array([42]),
    );
    await expect(
      crypto.subtle.decrypt({ name: 'AES-GCM', iv }, expectedKey, sealed),
    ).resolves.toEqual(new Uint8Array([42]).buffer);
    expect(HKDF_RECORD_KEY_INFO).toBe('lace-passport/hkdf/record-key/v1');
    expect(HKDF_WALLET_ENTROPY_INFO).toBe('lace/hkdf/wallet-entropy/v1');
    expect(Mnemonic.deriveFrom(EntropyHex(vector.entropy)).join(' ')).toBe(
      vector.words,
    );
    const words = await source.withPasskeyMnemonic(async value =>
      value.join(' '),
    );
    expect(words).toBe(vector.words);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('derives the same words from the root salt alone', async () => {
    const rawId = new Uint8Array([1]).buffer;
    const get = vi.fn(async (options?: CredentialRequestOptions) => {
      const evalPrf = options?.publicKey?.extensions?.prf?.eval;
      expect(bytesToHex(toBytes(evalPrf!.first))).toBe(vector.rootSalt);
      expect(evalPrf).not.toHaveProperty('second');
      return {
        rawId,
        getClientExtensionResults: () => ({
          prf: { results: { first: hexToBytes(vector.root) } },
        }),
      } as unknown as Credential;
    });
    const source = createPasskeyKeySource({
      rpId: 'localhost',
      credentials: { get } as unknown as CredentialsContainer,
    });
    const words = await source.withPasskeyMnemonic(async value =>
      value.join(' '),
    );
    expect(words).toBe(vector.words);
    expect(get).toHaveBeenCalledOnce();
  });
});
