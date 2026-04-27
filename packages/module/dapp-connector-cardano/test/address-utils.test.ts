import { describe, expect, it } from 'vitest';

import { getAddressDisplayInfo, isOwnAddress } from '../src/common/utils';

describe('isOwnAddress', () => {
  const walletAddresses = [
    'addr_test1qp0kjlqhv...abc123',
    'addr_test1qz9abcdef...def456',
    'addr_test1qrxyz7890...ghi789',
  ];

  it('returns true when address is in ownAddresses list', () => {
    expect(isOwnAddress('addr_test1qp0kjlqhv...abc123', walletAddresses)).toBe(
      true,
    );
    expect(isOwnAddress('addr_test1qz9abcdef...def456', walletAddresses)).toBe(
      true,
    );
    expect(isOwnAddress('addr_test1qrxyz7890...ghi789', walletAddresses)).toBe(
      true,
    );
  });

  it('returns false when address is not in ownAddresses list', () => {
    expect(isOwnAddress('addr_test1qp0kjlqhv...unknown', walletAddresses)).toBe(
      false,
    );
    expect(isOwnAddress('addr1qy_mainnet_address...', walletAddresses)).toBe(
      false,
    );
  });

  it('returns false when ownAddresses list is empty', () => {
    expect(isOwnAddress('addr_test1qp0kjlqhv...abc123', [])).toBe(false);
  });

  it('handles case-sensitive address matching', () => {
    expect(isOwnAddress('ADDR_TEST1QP0KJLQHV...ABC123', walletAddresses)).toBe(
      false,
    );
    expect(isOwnAddress('addr_test1qp0kjlqhv...abc123', walletAddresses)).toBe(
      true,
    );
  });
});

describe('getAddressDisplayInfo', () => {
  const walletAddresses = [
    'addr_test1qp0kjlqhv...abc123',
    'addr_test1qz9abcdef...def456',
  ];

  const addressBook = new Map([
    ['addr_test1qp0kjlqhv...abc123', 'My Savings Wallet'],
    ['addr_test1qqexternal...xyz789', 'Alice'],
    ['addr_test1qqexternal...xyz456', 'Bob'],
  ]);

  describe('with own addresses', () => {
    it('returns isOwn true for wallet address', () => {
      const result = getAddressDisplayInfo(
        'addr_test1qp0kjlqhv...abc123',
        walletAddresses,
        addressBook,
      );

      expect(result.isOwn).toBe(true);
    });

    it('returns display name from address book for own address', () => {
      const result = getAddressDisplayInfo(
        'addr_test1qp0kjlqhv...abc123',
        walletAddresses,
        addressBook,
      );

      expect(result.displayName).toBe('My Savings Wallet');
    });

    it('returns undefined displayName for own address not in address book', () => {
      const result = getAddressDisplayInfo(
        'addr_test1qz9abcdef...def456',
        walletAddresses,
        addressBook,
      );

      expect(result.isOwn).toBe(true);
      expect(result.displayName).toBeUndefined();
    });
  });

  describe('with foreign addresses', () => {
    it('returns isOwn false for external address', () => {
      const result = getAddressDisplayInfo(
        'addr_test1qqexternal...xyz789',
        walletAddresses,
        addressBook,
      );

      expect(result.isOwn).toBe(false);
    });

    it('returns display name from address book for foreign address', () => {
      const result = getAddressDisplayInfo(
        'addr_test1qqexternal...xyz789',
        walletAddresses,
        addressBook,
      );

      expect(result.displayName).toBe('Alice');
    });

    it('returns undefined displayName for foreign address not in address book', () => {
      const result = getAddressDisplayInfo(
        'addr_test1qqunknown...address',
        walletAddresses,
        addressBook,
      );

      expect(result.isOwn).toBe(false);
      expect(result.displayName).toBeUndefined();
    });
  });

  describe('without address book', () => {
    it('returns undefined displayName when addressToNameMap is undefined', () => {
      const result = getAddressDisplayInfo(
        'addr_test1qp0kjlqhv...abc123',
        walletAddresses,
        undefined,
      );

      expect(result.isOwn).toBe(true);
      expect(result.displayName).toBeUndefined();
    });

    it('correctly identifies own address without address book', () => {
      const result = getAddressDisplayInfo(
        'addr_test1qp0kjlqhv...abc123',
        walletAddresses,
      );

      expect(result.isOwn).toBe(true);
      expect(result.displayName).toBeUndefined();
    });

    it('correctly identifies foreign address without address book', () => {
      const result = getAddressDisplayInfo(
        'addr_test1qqunknown...address',
        walletAddresses,
      );

      expect(result.isOwn).toBe(false);
      expect(result.displayName).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles empty wallet addresses list', () => {
      const result = getAddressDisplayInfo(
        'addr_test1qp0kjlqhv...abc123',
        [],
        addressBook,
      );

      expect(result.isOwn).toBe(false);
      expect(result.displayName).toBe('My Savings Wallet');
    });

    it('handles empty address book', () => {
      const emptyAddressBook = new Map<string, string>();
      const result = getAddressDisplayInfo(
        'addr_test1qp0kjlqhv...abc123',
        walletAddresses,
        emptyAddressBook,
      );

      expect(result.isOwn).toBe(true);
      expect(result.displayName).toBeUndefined();
    });
  });
});
