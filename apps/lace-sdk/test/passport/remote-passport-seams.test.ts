import { describe, expect, it, vi } from 'vitest';

import { createRemotePassportSeams } from '../../src/passport/remote-passport-seams';

const fixture = vi.hoisted(() => {
  const authoriser = { scheme: 'jubjub-schnorr' as const };
  const encryptionKey = { publicKey: vi.fn(), openInbox: vi.fn() };
  const accountRecordStore = { read: vi.fn(), write: vi.fn(), exists: vi.fn() };
  return {
    authoriser,
    encryptionKey,
    accountRecordStore,
    createRemotePassportAuthoriser: vi.fn((_client: unknown) => authoriser),
    createRemoteEncryptionKey: vi.fn((_client: unknown) => encryptionKey),
    createRemoteAccountRecordStore: vi.fn(
      (_client: unknown) => accountRecordStore,
    ),
  };
});

vi.mock('@lace-module/passport-account/sdk', () => ({
  createRemotePassportAuthoriser: fixture.createRemotePassportAuthoriser,
  createRemoteEncryptionKey: fixture.createRemoteEncryptionKey,
  createRemoteAccountRecordStore: fixture.createRemoteAccountRecordStore,
}));

describe('createRemotePassportSeams', () => {
  it('wires every Passport seam to the signer it is given', () => {
    const signer = { request: vi.fn() };

    const seams = createRemotePassportSeams(signer);

    expect(fixture.createRemotePassportAuthoriser).toHaveBeenCalledWith(signer);
    expect(fixture.createRemoteEncryptionKey).toHaveBeenCalledWith(signer);
    expect(fixture.createRemoteAccountRecordStore).toHaveBeenCalledWith(signer);
    expect(seams).toEqual({
      authoriser: fixture.authoriser,
      encryptionKey: fixture.encryptionKey,
      accountRecordStore: fixture.accountRecordStore,
    });
  });
});
