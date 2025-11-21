import { createContext, useContext } from 'react';
import { AddressBookSchema, useDbState, useDbStateValue } from '../../../lib/storage';

// eslint-disable-next-line unicorn/no-null
export const AddressBookContext = createContext<useDbStateValue<AddressBookSchema> | null>(null);

export const useAddressBookContext = (): ReturnType<typeof useDbState> => {
  const bookContext = useContext(AddressBookContext);

  if (bookContext === null) throw new Error('AddressBookContext is not defined.');
  return bookContext;
};
