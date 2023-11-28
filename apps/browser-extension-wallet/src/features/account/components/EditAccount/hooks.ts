import { useState } from 'react';
import { AccountData } from '@lace/ui/dist/design-system/profile-dropdown/accounts/profile-dropdown-accounts-list.component';

export const useEditAccountDrawer = () => {
  const [dataToEdit, setDataToEdit] = useState<AccountData | undefined>();

  return {
    accountData: dataToEdit,
    isOpen: dataToEdit !== undefined,
    open: (data: AccountData) => setDataToEdit(data),
    // eslint-disable-next-line unicorn/no-useless-undefined
    hide: () => setDataToEdit(undefined)
  };
};
