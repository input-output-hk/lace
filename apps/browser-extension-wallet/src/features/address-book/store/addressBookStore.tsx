import create from 'zustand';
import { AddressBookSchema } from '../../../lib/storage';

interface AddressBookStore {
  addressToEdit?: AddressBookSchema | Omit<AddressBookSchema, 'id' | 'network'>;
  isEditAddressVisible: boolean;
  setIsEditAddressVisible: (visibility: boolean) => void;
  setAddressToEdit: (address: AddressBookSchema | Omit<AddressBookSchema, 'id' | 'network'>) => void;
}

/**
 * returns a hook to access address book store states and setters
 */
export const useAddressBookStore = create<AddressBookStore>((set) => ({
  addressToEdit: {} as AddressBookSchema,
  isEditAddressVisible: false,
  setIsEditAddressVisible: (visibility: boolean) => set({ isEditAddressVisible: visibility }),
  setAddressToEdit: (address) => set({ addressToEdit: address })
}));
