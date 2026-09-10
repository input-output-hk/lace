import { ContactId } from '@lace-contract/address-book';
import { AddressAlias, AddressAliasType } from '@lace-contract/addresses';
import { BlockchainNetworkId } from '@lace-contract/network';
import { FolderId, TokenId } from '@lace-contract/tokens';
import { Timestamp, Uri } from '@lace-lib/util';
import { describe, expect, it } from 'vitest';

import {
  analyticsUserIdFromWire,
  contactsFromWire,
  tokenFoldersFromWire,
} from '../src/mappers';

// Every input here is what the host serves verbatim out of a monolith profile:
// an already-envelope-parsed slice state, untrusted and possibly written by a
// build several versions old.

const cardanoAddress = {
  address: 'addr_test1qalice',
  blockchainName: 'Cardano',
  network: 'cardano-1',
};

describe('contactsFromWire', () => {
  it('imports a contact with its addresses, avatar and alias resolutions', () => {
    expect(
      contactsFromWire({
        contacts: {
          'c-1': {
            id: 'c-1',
            name: 'Alice',
            avatar: 'https://img.example/a.png',
            aliases: [
              {
                alias: '$alice',
                aliasType: 'adaHandle',
                resolvedAddress: 'addr_test1qalice',
                resolvedAt: 1700000000000,
                blockchainName: 'Cardano',
                networkId: 'cardano-1',
                image: 'https://img.example/handle.png',
              },
            ],
            addresses: [
              { ...cardanoAddress, accountId: 'w-1-0-1' },
              {
                address: 'tb1qbob',
                blockchainName: 'Bitcoin',
                network: 'bitcoin-testnet4',
              },
            ],
          },
        },
      }),
    ).toEqual([
      {
        id: ContactId('c-1'),
        name: 'Alice',
        avatar: 'https://img.example/a.png',
        aliases: [
          {
            alias: AddressAlias('$alice'),
            aliasType: AddressAliasType('adaHandle'),
            resolvedAddress: 'addr_test1qalice',
            resolvedAt: Timestamp(1700000000000),
            blockchainName: 'Cardano',
            networkId: BlockchainNetworkId('cardano-1'),
            image: Uri('https://img.example/handle.png'),
          },
        ],
        addresses: [
          {
            address: 'addr_test1qalice',
            blockchainName: 'Cardano',
            network: BlockchainNetworkId('cardano-1'),
            accountId: 'w-1-0-1',
          },
          {
            address: 'tb1qbob',
            blockchainName: 'Bitcoin',
            network: BlockchainNetworkId('bitcoin-testnet4'),
          },
        ],
      },
    ]);
  });

  it('passes an ambiguous legacy network id through UNTOUCHED', () => {
    const [contact] = contactsFromWire({
      contacts: {
        'c-1': {
          id: 'c-1',
          name: 'Alice',
          aliases: [],
          addresses: [{ ...cardanoAddress, network: 'cardano-0' }],
        },
      },
    });
    expect(contact?.addresses[0]?.network).toBe(
      BlockchainNetworkId('cardano-0'),
    );
  });

  it('supplies the monolith migration-2 defaults a pre-migration profile lacks', () => {
    // No `aliases` array and no `network` on the address — what an addressBook
    // slice below persist version 2 holds.
    const [contact] = contactsFromWire({
      contacts: {
        'c-1': {
          id: 'c-1',
          name: 'Alice',
          addresses: [
            { address: 'addr_test1qalice', blockchainName: 'Cardano' },
            { address: 'tb1qbob', blockchainName: 'Bitcoin' },
          ],
        },
      },
    });
    expect(contact?.aliases).toEqual([]);
    expect(contact?.addresses.map(address => address.network)).toEqual([
      BlockchainNetworkId('cardano-1'),
      BlockchainNetworkId('bitcoin-testnet4'),
    ]);
  });

  it('falls back to the map key when an entry lost its own id', () => {
    const [contact] = contactsFromWire({
      contacts: {
        'key-is-the-id': {
          name: 'Alice',
          aliases: [],
          addresses: [cardanoAddress],
        },
      },
    });
    expect(contact?.id).toBe(ContactId('key-is-the-id'));
  });

  it('drops a contact with no name, no readable address, or an unknown blockchain', () => {
    expect(
      contactsFromWire({
        contacts: {
          nameless: { id: 'nameless', addresses: [cardanoAddress] },
          addressless: { id: 'addressless', name: 'Bob', addresses: [] },
          unreadable: {
            id: 'unreadable',
            name: 'Carol',
            addresses: [{ address: 'x', blockchainName: 'SomeFutureChain' }],
          },
        },
      }),
    ).toEqual([]);
  });

  it('drops a half-read alias resolution but keeps the contact', () => {
    const [contact] = contactsFromWire({
      contacts: {
        'c-1': {
          id: 'c-1',
          name: 'Alice',
          // No resolvedAt / networkId — a resolution that cannot be trusted to
          // still name this address.
          aliases: [{ alias: '$alice', aliasType: 'adaHandle' }],
          addresses: [cardanoAddress],
        },
      },
    });
    expect(contact?.aliases).toEqual([]);
    expect(contact?.name).toBe('Alice');
  });

  it('reads nothing out of an absent or unreadable slice', () => {
    expect(contactsFromWire(null)).toEqual([]);
    expect(contactsFromWire({})).toEqual([]);
    // redux-persist stringifies each property, so a corrupt one survives the
    // envelope parse as a raw string.
    expect(contactsFromWire({ contacts: '{broken' })).toEqual([]);
  });
});

describe('tokenFoldersFromWire', () => {
  it('imports folders in their legacy order with their token assignments', () => {
    expect(
      tokenFoldersFromWire({
        folders: [
          { id: 'f-2', name: 'Newer', accountId: 'w-1-0-1' },
          { id: 'f-1', name: 'Older', accountId: 'w-1-0-1' },
        ],
        tokenIdsByFolderId: { 'f-1': ['t-1', 't-2'] },
      }),
    ).toEqual({
      folders: [
        { id: FolderId('f-2'), name: 'Newer', accountId: 'w-1-0-1' },
        { id: FolderId('f-1'), name: 'Older', accountId: 'w-1-0-1' },
      ],
      tokenIdsByFolderId: { 'f-1': [TokenId('t-1'), TokenId('t-2')] },
    });
  });

  it('drops an incomplete folder and any assignment naming an unknown folder', () => {
    expect(
      tokenFoldersFromWire({
        folders: [{ id: 'f-1', accountId: 'w-1-0-1' }],
        tokenIdsByFolderId: { 'f-gone': ['t-1'] },
      }),
    ).toEqual({ folders: [], tokenIdsByFolderId: {} });
  });

  it('supplies the migration-2 default for a slice with no tokenIdsByFolderId', () => {
    expect(
      tokenFoldersFromWire({
        folders: [{ id: 'f-1', name: 'Older', accountId: 'w-1-0-1' }],
      }).tokenIdsByFolderId,
    ).toEqual({});
  });

  it('reads nothing out of an absent or unreadable slice', () => {
    expect(tokenFoldersFromWire(null)).toEqual({
      folders: [],
      tokenIdsByFolderId: {},
    });
    expect(tokenFoldersFromWire({ folders: '{broken' })).toEqual({
      folders: [],
      tokenIdsByFolderId: {},
    });
  });
});

describe('analyticsUserIdFromWire', () => {
  it('reads the recorded user id', () => {
    expect(
      analyticsUserIdFromWire({ analytics: { user: { id: 'user-42' } } }),
    ).toBe('user-42');
  });

  it('is undefined for a profile that recorded no user — the opted-out signal', () => {
    expect(analyticsUserIdFromWire(null)).toBeUndefined();
    expect(analyticsUserIdFromWire({ analytics: {} })).toBeUndefined();
    expect(
      analyticsUserIdFromWire({ analytics: { user: { id: '' } } }),
    ).toBeUndefined();
    expect(analyticsUserIdFromWire({ analytics: '{broken' })).toBeUndefined();
  });
});
