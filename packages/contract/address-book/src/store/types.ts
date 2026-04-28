import type { Contact } from '../types';
import type { ContactId } from '../value-objects';

export type AddressBookSliceState = {
  contacts: Record<ContactId, Contact>;
};

export const initialState: AddressBookSliceState = {
  contacts: {},
};
