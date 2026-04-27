import { describe, expect, it } from 'vitest';

import {
  addressBookActions as actions,
  addressBookReducers,
  addressBookSelectors as selectors,
} from '../../src/store/slice';
import { ContactId } from '../../src/value-objects';

import type { AddressBookSliceState } from '../../src/store/types';
import type { Contact, ContactAddress } from '../../src/types';
import type { Address } from '@lace-contract/addresses';
import type { BlockchainNetworkId } from '@lace-contract/network';

// Type that matches what the selectors expect
type TestState = { addressBook: AddressBookSliceState };

const createStateWithContacts = (contacts: Contact[]): TestState => {
  const contactsRecord = contacts.reduce((accumulator, contact) => {
    accumulator[contact.id] = contact;
    return accumulator;
  }, {} as Record<ContactId, Contact>);

  return {
    addressBook: { contacts: contactsRecord },
  };
};

const createTestContact = (
  id: string,
  name: string,
  addresses: ContactAddress[] = [],
): Contact => ({
  id: ContactId(id),
  name,
  aliases: [],
  addresses,
});

const createTestAddress = (
  address: string,
  blockchainName: string,
): ContactAddress => ({
  address: address as Address,
  blockchainName: blockchainName as ContactAddress['blockchainName'],
  network: 'test-network' as BlockchainNetworkId,
});

describe('addressBook slice', () => {
  describe('addContact reducer', () => {
    it('should add a new contact to an empty state', () => {
      const initialState: AddressBookSliceState = { contacts: {} };
      const newContact = createTestContact('contact-1', 'Alice', [
        createTestAddress('addr123', 'Cardano'),
      ]);

      const result = addressBookReducers.addressBook(
        initialState,
        actions.addressBook.addContact(newContact),
      );

      expect(result.contacts[newContact.id]).toEqual(newContact);
      expect(Object.keys(result.contacts)).toHaveLength(1);
    });

    it('should add a contact to existing contacts', () => {
      const existingContact = createTestContact('contact-1', 'Alice');
      const initialState: AddressBookSliceState = {
        contacts: { [existingContact.id]: existingContact },
      };
      const newContact = createTestContact('contact-2', 'Bob', [
        createTestAddress('addr456', 'Bitcoin'),
      ]);

      const result = addressBookReducers.addressBook(
        initialState,
        actions.addressBook.addContact(newContact),
      );

      expect(Object.keys(result.contacts)).toHaveLength(2);
      expect(result.contacts[existingContact.id]).toEqual(existingContact);
      expect(result.contacts[newContact.id]).toEqual(newContact);
    });

    it('should update an existing contact if the same ID is used', () => {
      const existingContact = createTestContact('contact-1', 'Alice');
      const initialState: AddressBookSliceState = {
        contacts: { [existingContact.id]: existingContact },
      };
      const updatedContact = createTestContact('contact-1', 'Alice Updated', [
        createTestAddress('addr789', 'Ethereum'),
      ]);

      const result = addressBookReducers.addressBook(
        initialState,
        actions.addressBook.addContact(updatedContact),
      );

      expect(Object.keys(result.contacts)).toHaveLength(1);
      expect(result.contacts[updatedContact.id].name).toBe('Alice Updated');
      expect(result.contacts[updatedContact.id].addresses).toHaveLength(1);
    });

    it('should handle contact with multiple addresses', () => {
      const initialState: AddressBookSliceState = { contacts: {} };
      const contactWithMultipleAddresses = createTestContact(
        'contact-1',
        'Multi-Chain User',
        [
          createTestAddress('cardano-addr', 'Cardano'),
          createTestAddress('bitcoin-addr', 'Bitcoin'),
          createTestAddress('ethereum-addr', 'Ethereum'),
        ],
      );

      const result = addressBookReducers.addressBook(
        initialState,
        actions.addressBook.addContact(contactWithMultipleAddresses),
      );

      expect(
        result.contacts[contactWithMultipleAddresses.id].addresses,
      ).toHaveLength(3);
    });
  });

  describe('deleteContact reducer', () => {
    it('should delete a contact from the state', () => {
      const existingContact = createTestContact('contact-1', 'Alice');
      const anotherContact = createTestContact('contact-2', 'Bob');
      const initialState: AddressBookSliceState = {
        contacts: {
          [existingContact.id]: existingContact,
          [anotherContact.id]: anotherContact,
        },
      };
      const result = addressBookReducers.addressBook(
        initialState,
        actions.addressBook.deleteContact(existingContact.id),
      );
      expect(result.contacts).toEqual({ [anotherContact.id]: anotherContact });
    });
  });

  describe('selectAllContacts selector', () => {
    it('should return empty array when no contacts exist', () => {
      const state = createStateWithContacts([]);
      const result = selectors.addressBook.selectAllContacts(state);
      expect(result).toEqual([]);
    });

    it('should return all contacts as array', () => {
      const contacts = [
        createTestContact('contact-1', 'Alice'),
        createTestContact('contact-2', 'Bob'),
      ];
      const state = createStateWithContacts(contacts);
      const result = selectors.addressBook.selectAllContacts(state);

      expect(result).toHaveLength(2);
      expect(result.map(c => c.name).sort()).toEqual(['Alice', 'Bob']);
    });
  });
});
