import * as stubData from '@lace-contract/midnight-context/src/stub-data';
import { describe, expect, it } from 'vitest';

import {
  getReceiveSheetAddressData,
  getReceiveSheetAddressInfo,
} from '../../src/exported-modules/receive-sheet-address-data-customisation';

import type { Address, AnyAddress } from '@lace-contract/addresses';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const DUST_ADDRESS_INFO_KEY = 'midnight.drawer.receive.dust-address-info';
const DUST_PILL_KEY = 'midnight.drawer.receive.dust-pill';
const SHIELDED_PILL_KEY = 'midnight.drawer.receive.shielded-pill';
const UNSHIELDED_PILL_KEY = 'midnight.drawer.receive.unshielded-pill';

const midnightAccount = stubData.midnightAccount;
const dustAddressString = stubData.midnightDustAddress as string;
const shieldedAddressString = stubData.midnightShieldedAddress as string;
const unshieldedAddressString = stubData.midnightUnshieldedAddress as string;

const toAnyAddress = (address: string): AnyAddress => ({
  address: address as Address,
  blockchainName: 'Midnight',
  accountId: midnightAccount.accountId,
});

describe('getReceiveSheetAddressData', () => {
  it('returns undefined for non-Midnight account', () => {
    const cardanoAccount = {
      blockchainName: 'Cardano',
      accountId: midnightAccount.accountId,
      accountType: 'Ledger',
    } as unknown as AnyAccount;
    const addresses = [toAnyAddress(dustAddressString)];

    expect(
      getReceiveSheetAddressData(cardanoAccount, addresses),
    ).toBeUndefined();
  });

  it('returns undefined for empty addresses', () => {
    expect(getReceiveSheetAddressData(midnightAccount, [])).toBeUndefined();
  });

  it('returns mapped address data with correct keys for Midnight account', () => {
    const addresses = [
      toAnyAddress(dustAddressString),
      toAnyAddress(shieldedAddressString),
      toAnyAddress(unshieldedAddressString),
    ];

    const result = getReceiveSheetAddressData(midnightAccount, addresses);

    expect(result).toHaveLength(3);
    expect(result).toEqual([
      { key: DUST_PILL_KEY, address: addresses[0] },
      { key: SHIELDED_PILL_KEY, address: addresses[1] },
      { key: UNSHIELDED_PILL_KEY, address: addresses[2] },
    ]);
  });

  it('skips invalid addresses and does not throw', () => {
    const addresses = [
      toAnyAddress(dustAddressString),
      toAnyAddress('invalid-midnight-address'),
      toAnyAddress(shieldedAddressString),
    ];

    const result = getReceiveSheetAddressData(midnightAccount, addresses);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { key: DUST_PILL_KEY, address: addresses[0] },
      { key: SHIELDED_PILL_KEY, address: addresses[2] },
    ]);
  });

  it('returns empty array when all addresses are invalid', () => {
    const addresses = [
      toAnyAddress('invalid-midnight-address'),
      toAnyAddress('another-bad-address'),
    ];

    const result = getReceiveSheetAddressData(midnightAccount, addresses);

    expect(result).toEqual([]);
  });
});

describe('getReceiveSheetAddressInfo', () => {
  it('returns undefined for non-Midnight account', () => {
    const cardanoAccount = {
      blockchainName: 'Cardano',
      accountId: midnightAccount.accountId,
      accountType: 'Ledger',
    } as unknown as AnyAccount;

    expect(getReceiveSheetAddressInfo(cardanoAccount)).toBeUndefined();
  });

  it('returns a function for Midnight in-memory account', () => {
    const getAddressInfo = getReceiveSheetAddressInfo(midnightAccount);

    expect(getAddressInfo).toBeTypeOf('function');
  });

  it('returned function returns dust translation key for dust address', () => {
    const getAddressInfo = getReceiveSheetAddressInfo(midnightAccount);
    if (!getAddressInfo) throw new Error('expected function');

    const result = getAddressInfo(toAnyAddress(dustAddressString));

    expect(result).toBe(DUST_ADDRESS_INFO_KEY);
  });

  it('returned function returns undefined for shielded address', () => {
    const getAddressInfo = getReceiveSheetAddressInfo(midnightAccount);
    if (!getAddressInfo) throw new Error('expected function');

    const result = getAddressInfo(toAnyAddress(shieldedAddressString));

    expect(result).toBeUndefined();
  });

  it('returned function returns undefined for unshielded address', () => {
    const getAddressInfo = getReceiveSheetAddressInfo(midnightAccount);
    if (!getAddressInfo) throw new Error('expected function');

    const result = getAddressInfo(toAnyAddress(unshieldedAddressString));

    expect(result).toBeUndefined();
  });

  it('returned function returns undefined for invalid address', () => {
    const getAddressInfo = getReceiveSheetAddressInfo(midnightAccount);
    if (!getAddressInfo) throw new Error('expected function');

    const result = getAddressInfo(toAnyAddress('invalid-midnight-address'));

    expect(result).toBeUndefined();
  });
});
