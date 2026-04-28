import { AddressBookTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useAddressBook } from './useAddressBook';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const AddressBook = (
  props: SheetScreenProps<SheetRoutes.AddressBook>,
) => {
  const { accountId } = props.route.params;
  const { labels, contacts, onCancelPress, onSelectAddress } =
    useAddressBook(accountId);

  return (
    <AddressBookTemplate
      title={labels.title}
      emptyLabel={labels.emptyLabel}
      contacts={contacts}
      cancelButtonLabel={labels.cancelButtonLabel}
      onCancelPress={onCancelPress}
      onSelectAddress={onSelectAddress}
    />
  );
};
