import { useState } from 'react';
import { AccountData } from '@lace/ui/dist/design-system/profile-dropdown/accounts/profile-dropdown-accounts-list.component';

export const useAccountEdit = (): {
  accountData: AccountData | undefined;
  isOpen: boolean;
  open: (data: AccountData) => void;
  hide: () => void;
} => {
  const [dataToEdit, setDataToEdit] = useState<AccountData | undefined>();

  return {
    accountData: dataToEdit,
    isOpen: dataToEdit !== undefined,
    open: (data: AccountData) => {
      setDataToEdit(data);
    },
    hide: () => {
      // eslint-disable-next-line unicorn/no-useless-undefined
      setDataToEdit(undefined);
    }
  };
};
