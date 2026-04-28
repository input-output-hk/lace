import {
  AccountId,
  WalletId,
  walletsActions,
} from '@lace-contract/wallet-repo';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  addressesActions as actions,
  addressesReducers,
  addressesSelectors as selectors,
} from '../../src';
import { AddressAlias, AddressAliasType } from '../../src/value-objects';

import type { AnyAddress, AnyBlockchainAddress, Address } from '../../src';
import type {
  AddressAliasEntry,
  AddressesSliceState,
  UpsertAddressesPayload,
} from '../../src/store/slice';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const accountId = AccountId('accountid1');
const accountId2 = AccountId('accountid2');
const walletId = WalletId('wallet1');

const cardanoAddress1 = {
  address:
    'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu80w' as Address,
  name: 'Address',
} satisfies AnyBlockchainAddress;

const cardanoAddress2 = {
  address:
    'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu802' as Address,
  name: 'Address',
} satisfies AnyBlockchainAddress;

const cardanoAddress3 = {
  address:
    'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu803' as Address,
  name: 'Address',
} satisfies AnyBlockchainAddress;

describe('addresses slice', () => {
  let initialState: AddressesSliceState = {
    addresses: [],
    aliases: {},
  };

  beforeEach(() => {
    initialState = {
      addresses: [],
      aliases: {},
    };
  });

  describe('reducers', () => {
    describe('upsertAddresses', () => {
      it('should correctly set addresses for a given blockchain', () => {
        const action = actions.addresses.upsertAddresses({
          blockchainName: 'Cardano',
          accountId,
          addresses: [cardanoAddress1, cardanoAddress2, cardanoAddress3],
        });

        const state = addressesReducers.addresses(initialState, action);

        expect(state.addresses).toEqual([
          { ...cardanoAddress1, accountId, blockchainName: 'Cardano' },
          { ...cardanoAddress2, accountId, blockchainName: 'Cardano' },
          { ...cardanoAddress3, accountId, blockchainName: 'Cardano' },
        ]);
      });

      it('should not duplicate addresses', () => {
        const action = actions.addresses.upsertAddresses({
          blockchainName: 'Cardano',
          accountId,
          addresses: [cardanoAddress1],
        });

        const state = addressesReducers.addresses(
          {
            addresses: [
              { ...cardanoAddress1, accountId, blockchainName: 'Cardano' },
            ],
            aliases: {},
          },
          action,
        );

        expect(state.addresses).toEqual([
          { ...cardanoAddress1, accountId, blockchainName: 'Cardano' },
        ]);
      });

      it('allows the same address for different accounts', () => {
        const action = actions.addresses.upsertAddresses({
          blockchainName: 'Cardano',
          accountId: accountId2,
          addresses: [cardanoAddress1],
        });

        const state = addressesReducers.addresses(
          {
            addresses: [
              { ...cardanoAddress1, accountId, blockchainName: 'Cardano' },
            ],
            aliases: {},
          },
          action,
        );

        expect(state.addresses).toEqual([
          { ...cardanoAddress1, accountId, blockchainName: 'Cardano' },
          {
            ...cardanoAddress1,
            accountId: accountId2,
            blockchainName: 'Cardano',
          },
        ]);
      });

      it('should add addresses for an account', () => {
        const existingCardanoAccount1Address = {
          ...cardanoAddress1,
          blockchainName: 'Cardano',
          accountId: AccountId('wallet-1'),
        } satisfies AnyAddress;
        const existingCardanoAccount2Address = {
          ...cardanoAddress2,
          blockchainName: 'Cardano',
          accountId: AccountId('wallet-1'),
        } satisfies AnyAddress;
        initialState = {
          addresses: [
            existingCardanoAccount1Address,
            existingCardanoAccount2Address,
          ],
          aliases: {},
        };
        const action = actions.addresses.upsertAddresses({
          blockchainName: 'Cardano',
          accountId: AccountId('wallet-1'),
          addresses: [cardanoAddress3],
        });

        const state = addressesReducers.addresses(initialState, action);

        expect(state.addresses).toEqual([
          existingCardanoAccount1Address,
          existingCardanoAccount2Address,
          {
            ...cardanoAddress3,
            blockchainName: 'Cardano',
            accountId: AccountId('wallet-1'),
          },
        ]);
      });
    });

    describe('reupsertAddresses', () => {
      it('should correctly reset addresses', () => {
        const action = actions.addresses.resetAddresses({
          accountId,
        });

        const state = addressesReducers.addresses(initialState, action);

        expect(state).toEqual(initialState);
      });
    });

    describe('setAliases', () => {
      const handleAliasType = AddressAliasType('handle');
      const ensAliasType = AddressAliasType('ens');

      const createAliasEntry = (
        address: Address,
        alias: string,
        aliasType: AddressAliasType = handleAliasType,
      ): AddressAliasEntry => ({
        address,
        aliasType,
        alias: AddressAlias(alias),
      });

      it('overwrites existing alias with same aliasType for an address', () => {
        const entry1 = createAliasEntry(cardanoAddress1.address, '$handle1');
        const entry2 = createAliasEntry(cardanoAddress1.address, '$handle2');
        const stateWithAlias: AddressesSliceState = {
          addresses: [],
          aliases: { [cardanoAddress1.address]: [entry1] },
        };

        const action = actions.addresses.setAliases({ aliases: [entry2] });

        const state = addressesReducers.addresses(stateWithAlias, action);

        expect(state.aliases).toEqual({
          [cardanoAddress1.address]: [entry2],
        });
      });

      it('collects multiple aliases with different aliasTypes for same address', () => {
        const handleEntry = createAliasEntry(
          cardanoAddress1.address,
          '$handle1',
          handleAliasType,
        );
        const ensEntry = createAliasEntry(
          cardanoAddress1.address,
          'user.eth',
          ensAliasType,
        );
        const action = actions.addresses.setAliases({
          aliases: [handleEntry, ensEntry],
        });

        const state = addressesReducers.addresses(initialState, action);

        expect(state.aliases).toEqual({
          [cardanoAddress1.address]: [handleEntry, ensEntry],
        });
      });

      it('preserves existing aliases of different aliasType when adding new alias', () => {
        const existingHandleEntry = createAliasEntry(
          cardanoAddress1.address,
          '$handle1',
          handleAliasType,
        );
        const stateWithAlias: AddressesSliceState = {
          addresses: [],
          aliases: { [cardanoAddress1.address]: [existingHandleEntry] },
        };
        const newEnsEntry = createAliasEntry(
          cardanoAddress1.address,
          'user.eth',
          ensAliasType,
        );

        const action = actions.addresses.setAliases({ aliases: [newEnsEntry] });

        const state = addressesReducers.addresses(stateWithAlias, action);

        expect(state.aliases).toEqual({
          [cardanoAddress1.address]: [existingHandleEntry, newEnsEntry],
        });
      });

      it('sets aliases for multiple addresses', () => {
        const entry1 = createAliasEntry(cardanoAddress1.address, '$handle1');
        const entry2 = createAliasEntry(cardanoAddress2.address, '$handle2');
        const action = actions.addresses.setAliases({
          aliases: [entry1, entry2],
        });

        const state = addressesReducers.addresses(initialState, action);

        expect(state.aliases).toEqual({
          [cardanoAddress1.address]: [entry1],
          [cardanoAddress2.address]: [entry2],
        });
      });
    });
  });

  describe('extraReducers', () => {
    describe('removeAccount', () => {
      const cardanoAddress1 = {
        address:
          'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu80w' as Address,
        name: 'Address',
        accountId,
        blockchainName: 'Cardano',
      } satisfies AnyAddress;

      const cardanoAddress2 = {
        address:
          'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu802' as Address,
        name: 'Address',
        accountId: accountId2,
        blockchainName: 'Cardano',
      } satisfies AnyAddress;

      it('should remove the addresses data for the account', () => {
        const state = {
          addresses: [cardanoAddress1, cardanoAddress2],
        } as unknown as AddressesSliceState;
        const newState = addressesReducers.addresses(
          state,
          walletsActions.wallets.removeAccount(walletId, accountId),
        );
        expect(newState.addresses).toEqual([cardanoAddress2]);
      });
    });

    describe('removeWallet', () => {
      const cardanoAddress1 = {
        address:
          'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu80w' as Address,
        name: 'Address',
        accountId,
        blockchainName: 'Cardano',
      } satisfies AnyAddress;

      const cardanoAddress2 = {
        address:
          'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu802' as Address,
        name: 'Address',
        accountId: accountId2,
        blockchainName: 'Cardano',
      } satisfies AnyAddress;

      it('should remove addresses for all accounts provided', () => {
        const state = {
          addresses: [cardanoAddress1, cardanoAddress2],
        } as unknown as AddressesSliceState;
        const newState = addressesReducers.addresses(
          state,
          walletsActions.wallets.removeWallet(walletId, [accountId]),
        );
        expect(newState.addresses).toEqual([cardanoAddress2]);
      });
    });
  });

  describe('selectors', () => {
    it('should correctly select all addresses', () => {
      const cardanoAddressesPayload = {
        addresses: [
          {
            address:
              'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu80w' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
          {
            address:
              'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu802' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
          {
            address:
              'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu803' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
        ],
      };

      const midnightAddressesPayload = {
        addresses: [
          {
            address:
              'mn_addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu80w' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
          {
            address:
              'mn_addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu802' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
          {
            address:
              'mn_addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu803' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
        ],
      };

      const actionsToDispatch = [
        actions.addresses.upsertAddresses({
          ...cardanoAddressesPayload,
          accountId,
          blockchainName: 'Cardano',
        }),
        actions.addresses.upsertAddresses({
          ...midnightAddressesPayload,
          accountId,
          blockchainName: 'Midnight',
        }),
      ];

      const state = actionsToDispatch.reduce(
        (state, action) => addressesReducers.addresses(state, action),
        initialState,
      );

      expect(
        selectors.addresses.selectAllAddresses({
          addresses: state,
        }),
      ).toEqual([
        ...cardanoAddressesPayload.addresses.map<AnyAddress>(a => ({
          ...a,
          blockchainName: 'Cardano',
          accountId,
        })),
        ...midnightAddressesPayload.addresses.map<AnyAddress>(a => ({
          ...a,
          blockchainName: 'Midnight',
          accountId,
        })),
      ]);
    });

    it('should correctly select all addresses', () => {
      const cardanoAddresses: UpsertAddressesPayload = {
        accountId,
        blockchainName: 'Cardano',
        addresses: [
          {
            address:
              'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu80w' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
          {
            address:
              'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu802' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
          {
            address:
              'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu803' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
        ],
      };
      const bitcoinAddresses: UpsertAddressesPayload = {
        accountId,
        blockchainName: 'Bitcoin',
        addresses: [
          {
            address: '1Lbcfr7sAHTD9CgdQo3HTMTkV8LK4ZnX71' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
        ],
      };

      const state1 = addressesReducers.addresses(
        initialState,
        actions.addresses.upsertAddresses(cardanoAddresses),
      );
      const state2 = addressesReducers.addresses(
        state1,
        actions.addresses.upsertAddresses(bitcoinAddresses),
      );

      expect(
        selectors.addresses.selectAllAddresses({
          addresses: state2,
        }),
      ).toEqual([
        ...cardanoAddresses.addresses.map(addr => ({
          ...addr,
          accountId,
          blockchainName: cardanoAddresses.blockchainName,
        })),
        ...bitcoinAddresses.addresses.map(addr => ({
          ...addr,
          accountId,
          blockchainName: bitcoinAddresses.blockchainName,
        })),
      ]);
    });

    it('selects all addresses of active blockchain', () => {
      const addresses = {
        accountId,
        blockchainName: 'Cardano',
        addresses: [
          {
            address:
              'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu80w' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
          {
            address:
              'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu802' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
          {
            address:
              'addr1vpu5vlrf4xkxv2qpwngf6cjhtw542ayty80v8dyr49rf5eg0yu803' as Address,
            name: 'Address',
          } satisfies AnyBlockchainAddress,
        ],
      } satisfies UpsertAddressesPayload;

      const action = actions.addresses.upsertAddresses(addresses);

      const state = addressesReducers.addresses(initialState, action);

      expect(
        selectors.addresses.selectAllAddresses({
          addresses: state,
        }),
      ).toEqual(
        addresses.addresses.map(addr => ({
          ...addr,
          accountId,
          blockchainName: addresses.blockchainName,
        })),
      );
    });

    describe('selectAddressAliases', () => {
      const handleAliasType = AddressAliasType('handle');
      const aliasEntry: AddressAliasEntry = {
        address: cardanoAddress1.address,
        aliasType: handleAliasType,
        alias: AddressAlias('$myhandle'),
      };

      it('returns aliases for an address', () => {
        const state: AddressesSliceState = {
          addresses: [],
          aliases: { [cardanoAddress1.address]: [aliasEntry] },
        };

        const result = selectors.addresses.selectAddressAliases(
          { addresses: state },
          [cardanoAddress1.address],
        );

        expect(result).toEqual([aliasEntry]);
      });

      it('returns aliases for multiple addresses', () => {
        const entry2 = {
          address: cardanoAddress2.address,
          aliasType: AddressAliasType('handle'),
          alias: AddressAlias('$other'),
        };
        const state: AddressesSliceState = {
          addresses: [],
          aliases: {
            [cardanoAddress1.address]: [aliasEntry],
            [cardanoAddress2.address]: [entry2],
          },
        };

        const result = selectors.addresses.selectAddressAliases(
          { addresses: state },
          [cardanoAddress1.address, cardanoAddress2.address],
        );

        expect(result).toEqual([aliasEntry, entry2]);
      });

      it('returns empty array for address without aliases', () => {
        const result = selectors.addresses.selectAddressAliases(
          { addresses: initialState },
          [cardanoAddress1.address],
        );

        expect(result).toEqual([]);
      });

      it('returns the same empty array reference for addresses without aliases', () => {
        const result1 = selectors.addresses.selectAddressAliases(
          { addresses: initialState },
          [cardanoAddress1.address],
        );
        const result2 = selectors.addresses.selectAddressAliases(
          { addresses: initialState },
          [cardanoAddress2.address],
        );

        expect(result1).toBe(result2);
      });
    });

    describe('selectActiveNetworkAccountAddresses', () => {
      it('returns addresses only for active network accounts', () => {
        const activeAccountAddress: AnyAddress = {
          ...cardanoAddress1,
          accountId,
          blockchainName: 'Cardano',
        };
        const inactiveAccountAddress: AnyAddress = {
          ...cardanoAddress2,
          accountId: accountId2,
          blockchainName: 'Cardano',
        };

        const result =
          selectors.addresses.selectActiveNetworkAccountAddresses.resultFunc(
            [activeAccountAddress, inactiveAccountAddress],
            [{ accountId } as AnyAccount],
          );

        expect(result).toEqual([activeAccountAddress]);
      });
    });
  });
});
