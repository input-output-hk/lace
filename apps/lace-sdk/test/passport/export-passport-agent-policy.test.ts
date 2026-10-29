import {
  GrantNotFoundError,
  GrantOpeningUnavailableError,
  GrantRevokedError,
  NoAccountError,
} from '@lace-contract/passport';
import { describe, expect, it } from 'vitest';

import { exportPassportAgentPolicy } from '../../src/passport/export-passport-agent-policy';

import {
  account,
  ACCOUNT_ADDRESS,
  COLOR,
  ENC_KEY,
  grantRecord,
  GRANT_ID,
  GRANTEE_PUBLIC_KEY,
  NETWORK,
  RECIPIENT_VALUE,
  SCOPE_SALT,
  SECP256K1_GRANTEE_PUBLIC_KEY,
  walletWith,
} from './passport-fixtures';

import type { GrantId } from '@lace-contract/passport';

const exportFor = async (
  wallet: ReturnType<typeof walletWith>,
  grantId: GrantId = GRANT_ID,
) => exportPassportAgentPolicy(wallet, { grantId });

describe('exportPassportAgentPolicy', () => {
  it('assembles the policy of an active grant from the roster and its opening', async () => {
    const wallet = walletWith(account, [grantRecord()]);

    await expect(exportFor(wallet)).resolves.toEqual({
      type: 'passport-agent-policy',
      version: 2,
      network: NETWORK,
      account: ACCOUNT_ADDRESS,
      grantId: GRANT_ID,
      slot: 2,
      granteeScheme: 'jubjub-schnorr',
      granteePublicKey: GRANTEE_PUBLIC_KEY,
      scopeSalt: SCOPE_SALT,
      color: COLOR,
      recipient: { kind: 'user-address', value: RECIPIENT_VALUE },
      maxCoinValue: '300',
      perCallCap: '100',
      cap: '500',
      expiresAt: 1_900_000_000,
      window: null,
      operations: ['withdraw-unshielded'],
      origin: 'lace.io',
    });
  });

  it('exports the scheme and compressed key of a secp256k1 grantee', async () => {
    const record = grantRecord();
    const wallet = walletWith(account, [
      {
        ...record,
        opening: {
          ...record.opening!,
          granteeScheme: 'secp256k1-ecdsa',
          granteePublicKey: SECP256K1_GRANTEE_PUBLIC_KEY,
        },
      },
    ]);

    await expect(exportFor(wallet)).resolves.toMatchObject({
      granteeScheme: 'secp256k1-ecdsa',
      granteePublicKey: SECP256K1_GRANTEE_PUBLIC_KEY,
    });
  });

  it('names the network the account in state lives on', async () => {
    const wallet = walletWith({ ...account, networkId: 'devnet' }, [
      grantRecord(),
    ]);

    await expect(exportFor(wallet)).resolves.toMatchObject({
      network: 'devnet',
    });
  });

  const seal = Uint8Array.from({ length: 94 }, (_, index) => index);

  /** A read grant whose stored seal holds the secret of `sealedEncKey`. */
  const readGrantSealedAt = (sealedEncKey: string) => {
    const held = grantRecord();
    return {
      ...held,
      scope: { ...held.scope, read: true },
      opening: {
        ...held.opening!,
        view: {
          readPublicKey: '77'.repeat(32),
          seal: Buffer.from(seal).toString('hex'),
          sealedEncKey,
        },
      },
    };
  };

  it('carries the sealed viewing secret of a read grant as base64url, and none for a spend grant', async () => {
    const wallet = walletWith(account, [readGrantSealedAt(ENC_KEY)]);

    const policy = await exportFor(wallet);

    expect(policy.view).toBe(Buffer.from(seal).toString('base64url'));
    expect(policy.view).not.toContain('=');
    await expect(
      exportFor(walletWith(account, [grantRecord()])),
    ).resolves.not.toHaveProperty('view');
  });

  it('leaves out a seal of an enc_key the account has rotated past, or when the enc_key is unknown', async () => {
    const rotated = 'e2'.repeat(32);
    await expect(
      exportFor(walletWith(account, [readGrantSealedAt(ENC_KEY)], rotated)),
    ).resolves.not.toHaveProperty('view');
    await expect(
      exportFor(walletWith(account, [readGrantSealedAt(ENC_KEY)], null)),
    ).resolves.not.toHaveProperty('view');
    await expect(
      exportFor(walletWith(account, [readGrantSealedAt(rotated)], rotated)),
    ).resolves.toHaveProperty('view');
  });

  it('picks the named grant among several', async () => {
    const other = grantRecord({ id: '99'.repeat(32) as GrantId });
    const wallet = walletWith(account, [other, grantRecord()]);

    await expect(exportFor(wallet)).resolves.toMatchObject({
      grantId: GRANT_ID,
    });
  });

  it('exports a grant that never expires with a null expiry', async () => {
    const held = grantRecord();
    const wallet = walletWith(account, [
      { ...held, scope: { ...held.scope, expiresAt: null } },
    ]);

    await expect(exportFor(wallet)).resolves.toMatchObject({
      expiresAt: null,
    });
  });

  it('refuses a wallet with no Passport account', async () => {
    await expect(
      exportFor(walletWith(undefined, [grantRecord()])),
    ).rejects.toThrow(NoAccountError);
  });

  it('refuses a grant the roster does not hold', async () => {
    await expect(exportFor(walletWith(account, []))).rejects.toThrow(
      GrantNotFoundError,
    );
  });

  it('refuses a revoked grant', async () => {
    const wallet = walletWith(account, [grantRecord({ active: false })]);

    await expect(exportFor(wallet)).rejects.toThrow(GrantRevokedError);
  });

  it('refuses a grant this client holds no opening for', async () => {
    const wallet = walletWith(account, [grantRecord({ opening: undefined })]);

    await expect(exportFor(wallet)).rejects.toThrow(
      GrantOpeningUnavailableError,
    );
  });
});
