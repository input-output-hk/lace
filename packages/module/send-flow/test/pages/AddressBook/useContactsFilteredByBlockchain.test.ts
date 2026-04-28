/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useContactsFilteredByBlockchain } from '../../../src/pages/AddressBook/useContactsFilteredByBlockchain';

import type { Contact } from '@lace-contract/address-book';

const createContact = (
  id: string,
  name: string,
  addresses: { blockchainName: string; address: string }[],
): Contact =>
  ({
    id,
    name,
    addresses: addresses.map(addr => ({
      blockchainName: addr.blockchainName,
      address: addr.address,
    })),
  } as Contact);

describe('useContactsFilteredByBlockchain', () => {
  it('returns empty array when blockchainName is undefined', () => {
    const contacts = [
      createContact('1', 'Alice', [
        { blockchainName: 'Cardano', address: 'addr1' },
      ]),
    ];

    const { result } = renderHook(() =>
      useContactsFilteredByBlockchain(contacts, undefined),
    );

    expect(result.current).toEqual([]);
  });

  it('returns empty array when contacts is undefined', () => {
    const { result } = renderHook(() =>
      useContactsFilteredByBlockchain(undefined, 'Cardano'),
    );

    expect(result.current).toEqual([]);
  });

  it('returns empty array when contacts is empty', () => {
    const { result } = renderHook(() =>
      useContactsFilteredByBlockchain([], 'Cardano'),
    );

    expect(result.current).toEqual([]);
  });

  it('filters contacts to only include addresses matching blockchain', () => {
    const contacts = [
      createContact('1', 'Alice', [
        { blockchainName: 'Cardano', address: 'addr1' },
        { blockchainName: 'Bitcoin', address: 'bc1' },
      ]),
    ];

    const { result } = renderHook(() =>
      useContactsFilteredByBlockchain(contacts, 'Cardano'),
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].addresses).toHaveLength(1);
    expect(result.current[0].addresses[0].blockchainName).toBe('Cardano');
  });

  it('excludes contacts with no matching addresses', () => {
    const contacts = [
      createContact('1', 'Alice', [
        { blockchainName: 'Cardano', address: 'addr1' },
      ]),
      createContact('2', 'Bob', [
        { blockchainName: 'Bitcoin', address: 'bc1' },
      ]),
    ];

    const { result } = renderHook(() =>
      useContactsFilteredByBlockchain(contacts, 'Cardano'),
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0].name).toBe('Alice');
  });

  it('preserves contact properties (id, name, avatar)', () => {
    const contacts = [
      {
        id: 'contact-1',
        name: 'Alice',
        avatar: 'avatar-url',
        addresses: [{ blockchainName: 'Cardano', address: 'addr1' }],
      } as Contact,
    ];

    const { result } = renderHook(() =>
      useContactsFilteredByBlockchain(contacts, 'Cardano'),
    );

    expect(result.current[0]).toMatchObject({
      id: 'contact-1',
      name: 'Alice',
      avatar: 'avatar-url',
    });
  });

  it('includes multiple contacts when all have matching addresses', () => {
    const contacts = [
      createContact('1', 'Alice', [
        { blockchainName: 'Cardano', address: 'addr1' },
      ]),
      createContact('2', 'Bob', [
        { blockchainName: 'Cardano', address: 'addr2' },
      ]),
      createContact('3', 'Charlie', [
        { blockchainName: 'Cardano', address: 'addr3' },
      ]),
    ];

    const { result } = renderHook(() =>
      useContactsFilteredByBlockchain(contacts, 'Cardano'),
    );

    expect(result.current).toHaveLength(3);
  });
});
