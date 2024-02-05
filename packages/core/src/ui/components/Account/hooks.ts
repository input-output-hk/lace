import { useState } from 'react';
import { ProfileDropdown } from '@lace/ui';

export const useAccountDataModal = (): {
  accountData: ProfileDropdown.AccountData | undefined;
  isOpen: boolean;
  open: (data: ProfileDropdown.AccountData) => void;
  hide: () => void;
} => {
  const [dataToEdit, setDataToEdit] = useState<ProfileDropdown.AccountData | undefined>();

  return {
    accountData: dataToEdit,
    isOpen: dataToEdit !== undefined,
    open: (data: ProfileDropdown.AccountData) => {
      setDataToEdit(data);
    },
    hide: () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      setDataToEdit(undefined);
    }
  };
};
