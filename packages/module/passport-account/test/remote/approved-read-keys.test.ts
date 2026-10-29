import { MAX_GRANTS } from '@lace-contract/passport';
import { describe, expect, it } from 'vitest';

import { createApprovedReadKeys } from '../../src/remote/approved-read-keys';

import { createInMemoryStorage } from './fake-passkey';

const ACCOUNT = 'ac'.repeat(32);
const OTHER_ACCOUNT = 'ad'.repeat(32);
const GRANT_ID = 'ab'.repeat(32);
const OTHER_GRANT_ID = 'ba'.repeat(32);
const READ_KEY = 'cd'.repeat(32);
const OTHER_READ_KEY = 'ef'.repeat(32);
const UNDEPLOYED = { account: ACCOUNT, networkId: 'undeployed' };
const TESTNET = { account: ACCOUNT, networkId: 'testnet' };
const ORIGIN = 'dapp.example';
const OTHER_ORIGIN = 'other.example';

const setup = () => {
  const { createKeyValueStorage, stored } = createInMemoryStorage();
  return { keys: createApprovedReadKeys(createKeyValueStorage), stored };
};

describe('createApprovedReadKeys', () => {
  it('approves nothing before a key is remembered', async () => {
    const { keys } = setup();

    await expect(keys.isApproved(UNDEPLOYED, GRANT_ID, READ_KEY)).resolves.toBe(
      false,
    );
  });

  it('approves exactly the key remembered for a grant of an account on a network, on its own origin collection', async () => {
    const { keys, stored } = setup();

    await keys.remember(UNDEPLOYED, GRANT_ID, READ_KEY);

    await expect(keys.isApproved(UNDEPLOYED, GRANT_ID, READ_KEY)).resolves.toBe(
      true,
    );
    await expect(
      keys.isApproved(UNDEPLOYED, GRANT_ID, OTHER_READ_KEY),
    ).resolves.toBe(false);
    await expect(
      keys.isApproved(UNDEPLOYED, OTHER_GRANT_ID, READ_KEY),
    ).resolves.toBe(false);
    await expect(keys.isApproved(TESTNET, GRANT_ID, READ_KEY)).resolves.toBe(
      false,
    );
    await expect(
      keys.isApproved(
        { account: OTHER_ACCOUNT, networkId: 'undeployed' },
        GRANT_ID,
        READ_KEY,
      ),
    ).resolves.toBe(false);
    expect(stored('passport-read-keys', ACCOUNT)).toEqual({
      undeployed: { readKeys: { [GRANT_ID]: READ_KEY }, signedRevocations: {} },
    });
    expect(stored('passport-account', ACCOUNT)).toBeUndefined();
  });

  it('replaces the key of a grant id approved again', async () => {
    const { keys } = setup();

    await keys.remember(UNDEPLOYED, GRANT_ID, READ_KEY);
    await keys.remember(UNDEPLOYED, GRANT_ID, OTHER_READ_KEY);

    await expect(keys.isApproved(UNDEPLOYED, GRANT_ID, READ_KEY)).resolves.toBe(
      false,
    );
    await expect(
      keys.isApproved(UNDEPLOYED, GRANT_ID, OTHER_READ_KEY),
    ).resolves.toBe(true);
  });

  it('forgets one grant on every network the account is kept under, and keeps the others', async () => {
    const { keys } = setup();
    await keys.remember(UNDEPLOYED, GRANT_ID, READ_KEY);
    await keys.remember(TESTNET, GRANT_ID, READ_KEY);
    await keys.remember(UNDEPLOYED, OTHER_GRANT_ID, OTHER_READ_KEY);

    await keys.forget(ACCOUNT, GRANT_ID, undefined);

    await expect(keys.isApproved(UNDEPLOYED, GRANT_ID, READ_KEY)).resolves.toBe(
      false,
    );
    await expect(keys.isApproved(TESTNET, GRANT_ID, READ_KEY)).resolves.toBe(
      false,
    );
    await expect(
      keys.isApproved(UNDEPLOYED, OTHER_GRANT_ID, OTHER_READ_KEY),
    ).resolves.toBe(true);
  });

  it('forgets every grant of an account at once, keeping other accounts', async () => {
    const { keys } = setup();
    const other = { account: OTHER_ACCOUNT, networkId: 'undeployed' };
    await keys.remember(UNDEPLOYED, GRANT_ID, READ_KEY);
    await keys.remember(UNDEPLOYED, OTHER_GRANT_ID, OTHER_READ_KEY);
    await keys.remember(other, GRANT_ID, READ_KEY);

    await keys.forgetAll(ACCOUNT, undefined);

    await expect(keys.isApproved(UNDEPLOYED, GRANT_ID, READ_KEY)).resolves.toBe(
      false,
    );
    await expect(
      keys.isApproved(UNDEPLOYED, OTHER_GRANT_ID, OTHER_READ_KEY),
    ).resolves.toBe(false);
    await expect(keys.isApproved(other, GRANT_ID, READ_KEY)).resolves.toBe(
      true,
    );
  });

  it('marks a forgotten key as revoked for the origin that signed the revocation, without approving it', async () => {
    const { keys } = setup();
    await keys.remember(UNDEPLOYED, GRANT_ID, READ_KEY);
    await keys.remember(TESTNET, GRANT_ID, READ_KEY);

    await keys.forget(ACCOUNT, GRANT_ID, ORIGIN);

    await expect(keys.isApproved(UNDEPLOYED, GRANT_ID, READ_KEY)).resolves.toBe(
      false,
    );
    for (const scope of [UNDEPLOYED, TESTNET]) {
      await expect(
        keys.isRevocationSigned(scope, GRANT_ID, {
          readPublicKey: READ_KEY,
          origin: ORIGIN,
        }),
      ).resolves.toBe(true);
    }
    await expect(
      keys.isRevocationSigned(UNDEPLOYED, GRANT_ID, {
        readPublicKey: READ_KEY,
        origin: OTHER_ORIGIN,
      }),
    ).resolves.toBe(false);
    await expect(
      keys.isRevocationSigned(UNDEPLOYED, GRANT_ID, {
        readPublicKey: OTHER_READ_KEY,
        origin: ORIGIN,
      }),
    ).resolves.toBe(false);
    await expect(
      keys.isRevocationSigned(UNDEPLOYED, OTHER_GRANT_ID, {
        readPublicKey: READ_KEY,
        origin: ORIGIN,
      }),
    ).resolves.toBe(false);
  });

  it('keeps a mark when the revocation is signed again, and marks nothing without an origin', async () => {
    const { keys } = setup();
    await keys.remember(UNDEPLOYED, GRANT_ID, READ_KEY);
    await keys.remember(UNDEPLOYED, OTHER_GRANT_ID, OTHER_READ_KEY);

    await keys.forget(ACCOUNT, GRANT_ID, ORIGIN);
    await keys.forget(ACCOUNT, GRANT_ID, ORIGIN);
    await keys.forget(ACCOUNT, OTHER_GRANT_ID, undefined);

    await expect(
      keys.isRevocationSigned(UNDEPLOYED, GRANT_ID, {
        readPublicKey: READ_KEY,
        origin: ORIGIN,
      }),
    ).resolves.toBe(true);
    await expect(
      keys.isRevocationSigned(UNDEPLOYED, OTHER_GRANT_ID, {
        readPublicKey: OTHER_READ_KEY,
        origin: ORIGIN,
      }),
    ).resolves.toBe(false);
  });

  it('marks every key a revoke-all forgets', async () => {
    const { keys } = setup();
    await keys.remember(UNDEPLOYED, GRANT_ID, READ_KEY);
    await keys.remember(UNDEPLOYED, OTHER_GRANT_ID, OTHER_READ_KEY);

    await keys.forgetAll(ACCOUNT, ORIGIN);

    await expect(
      keys.isRevocationSigned(UNDEPLOYED, GRANT_ID, {
        readPublicKey: READ_KEY,
        origin: ORIGIN,
      }),
    ).resolves.toBe(true);
    await expect(
      keys.isRevocationSigned(UNDEPLOYED, OTHER_GRANT_ID, {
        readPublicKey: OTHER_READ_KEY,
        origin: ORIGIN,
      }),
    ).resolves.toBe(true);
  });

  it('clears the mark of a grant id approved again', async () => {
    const { keys } = setup();
    await keys.remember(UNDEPLOYED, GRANT_ID, READ_KEY);
    await keys.forget(ACCOUNT, GRANT_ID, ORIGIN);

    await keys.remember(UNDEPLOYED, GRANT_ID, OTHER_READ_KEY);

    await expect(
      keys.isRevocationSigned(UNDEPLOYED, GRANT_ID, {
        readPublicKey: READ_KEY,
        origin: ORIGIN,
      }),
    ).resolves.toBe(false);
    await expect(
      keys.isApproved(UNDEPLOYED, GRANT_ID, OTHER_READ_KEY),
    ).resolves.toBe(true);
  });

  it('keeps only the latest marks, as many as an account holds grants', async () => {
    const { keys } = setup();
    const grantIds = Array.from({ length: MAX_GRANTS + 1 }, (_, index) =>
      index.toString(16).padStart(2, '0').repeat(32),
    );
    for (const grantId of grantIds) {
      await keys.remember(UNDEPLOYED, grantId, READ_KEY);
      await keys.forget(ACCOUNT, grantId, ORIGIN);
    }

    await expect(
      keys.isRevocationSigned(UNDEPLOYED, grantIds[0], {
        readPublicKey: READ_KEY,
        origin: ORIGIN,
      }),
    ).resolves.toBe(false);
    await expect(
      keys.isRevocationSigned(UNDEPLOYED, grantIds[MAX_GRANTS], {
        readPublicKey: READ_KEY,
        origin: ORIGIN,
      }),
    ).resolves.toBe(true);
  });
});
