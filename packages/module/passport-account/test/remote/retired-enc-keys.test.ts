import { describe, expect, it } from 'vitest';

import { createRetiredEncKeys } from '../../src/remote/retired-enc-keys';

import { createInMemoryStorage } from './fake-passkey';

const ACCOUNT = 'ac'.repeat(32);
const OTHER_ACCOUNT = 'ad'.repeat(32);
const OLD_KEY = '07'.repeat(32);
const NEW_KEY = '08'.repeat(32);
const NEXT_KEY = '09'.repeat(32);
const UNDEPLOYED = { account: ACCOUNT, networkId: 'undeployed' };
const DEVNET = { account: ACCOUNT, networkId: 'devnet' };

const setup = () => {
  const { createKeyValueStorage, stored } = createInMemoryStorage();
  return { retired: createRetiredEncKeys(createKeyValueStorage), stored };
};

describe('createRetiredEncKeys', () => {
  it('retires nothing before a rotation is linked and confirmed', async () => {
    const { retired } = setup();

    await expect(retired.isRetired(UNDEPLOYED, OLD_KEY)).resolves.toBe(false);
  });

  it('retires nothing on a link alone, as a rotation signed but never landed leaves it', async () => {
    const { retired, stored } = setup();

    await retired.link(UNDEPLOYED, OLD_KEY, NEW_KEY);

    await expect(retired.isRetired(UNDEPLOYED, OLD_KEY)).resolves.toBe(false);
    expect(stored('passport-retired-enc-keys', ACCOUNT)).toEqual({
      undeployed: { retired: [], pending: { [NEW_KEY]: OLD_KEY } },
    });
  });

  it('retires the linked key once the key it stepped to is confirmed, and drops the link', async () => {
    const { retired, stored } = setup();
    await retired.link(UNDEPLOYED, OLD_KEY, NEW_KEY);

    await retired.confirm(UNDEPLOYED, NEW_KEY);

    await expect(retired.isRetired(UNDEPLOYED, OLD_KEY)).resolves.toBe(true);
    await expect(retired.isRetired(UNDEPLOYED, NEW_KEY)).resolves.toBe(false);
    expect(stored('passport-retired-enc-keys', ACCOUNT)).toEqual({
      undeployed: { retired: [OLD_KEY], pending: {} },
    });
  });

  it('confirms nothing for a key no link names, and keeps the old key admissible', async () => {
    const { retired } = setup();
    await retired.link(UNDEPLOYED, OLD_KEY, NEW_KEY);

    await retired.confirm(UNDEPLOYED, OLD_KEY);
    await retired.confirm(UNDEPLOYED, NEXT_KEY);

    await expect(retired.isRetired(UNDEPLOYED, OLD_KEY)).resolves.toBe(false);
  });

  it('keeps links and retired keys apart per account and network', async () => {
    const { retired } = setup();
    await retired.link(UNDEPLOYED, OLD_KEY, NEW_KEY);

    await retired.confirm(DEVNET, NEW_KEY);
    await retired.confirm({ ...UNDEPLOYED, account: OTHER_ACCOUNT }, NEW_KEY);

    await expect(retired.isRetired(UNDEPLOYED, OLD_KEY)).resolves.toBe(false);
    await retired.confirm(UNDEPLOYED, NEW_KEY);
    await expect(retired.isRetired(UNDEPLOYED, OLD_KEY)).resolves.toBe(true);
    await expect(retired.isRetired(DEVNET, OLD_KEY)).resolves.toBe(false);
    await expect(
      retired.isRetired({ ...UNDEPLOYED, account: OTHER_ACCOUNT }, OLD_KEY),
    ).resolves.toBe(false);
  });

  it('records a key retired twice once', async () => {
    const { retired, stored } = setup();
    await retired.link(UNDEPLOYED, OLD_KEY, NEW_KEY);
    await retired.confirm(UNDEPLOYED, NEW_KEY);
    await retired.link(UNDEPLOYED, OLD_KEY, NEXT_KEY);

    await retired.confirm(UNDEPLOYED, NEXT_KEY);

    expect(stored('passport-retired-enc-keys', ACCOUNT)).toEqual({
      undeployed: { retired: [OLD_KEY], pending: {} },
    });
  });

  it('retires each key of a chain of rotations as its successor lands', async () => {
    const { retired, stored } = setup();
    await retired.link(UNDEPLOYED, OLD_KEY, NEW_KEY);
    await retired.link(UNDEPLOYED, NEW_KEY, NEXT_KEY);

    await retired.confirm(UNDEPLOYED, NEW_KEY);
    await retired.confirm(UNDEPLOYED, NEXT_KEY);

    expect(stored('passport-retired-enc-keys', ACCOUNT)).toEqual({
      undeployed: { retired: [OLD_KEY, NEW_KEY], pending: {} },
    });
  });

  it('retires every key along a chain of pending rotations once a later key lands', async () => {
    const { retired, stored } = setup();
    await retired.link(UNDEPLOYED, OLD_KEY, NEW_KEY);
    await retired.link(UNDEPLOYED, NEW_KEY, NEXT_KEY);

    await retired.confirm(UNDEPLOYED, NEXT_KEY);

    await expect(retired.isRetired(UNDEPLOYED, OLD_KEY)).resolves.toBe(true);
    await expect(retired.isRetired(UNDEPLOYED, NEW_KEY)).resolves.toBe(true);
    await expect(retired.isRetired(UNDEPLOYED, NEXT_KEY)).resolves.toBe(false);
    expect(stored('passport-retired-enc-keys', ACCOUNT)).toEqual({
      undeployed: { retired: [NEW_KEY, OLD_KEY], pending: {} },
    });
  });
});
