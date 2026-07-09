import { AddressBookTemplate, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useAddressBook } from './useAddressBook';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const AddressBook = (
  props: SheetScreenProps<SheetRoutes.AddressBook>,
) => {
  const { accountId } = props.route.params;
  const { navigation } = props;
  const {
    labels,
    contacts,
    ownAccounts,
    onCancelPress,
    onSelectAddress,
    onAddPress,
  } = useAddressBook(accountId);
  const hasAnyItems = contacts.length > 0 || ownAccounts.length > 0;

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header title={labels.title} leftIconOnPress={onCancelPress} />
      ),
      footer: hasAnyItems ? (
        <Sheet.Footer
          secondaryButton={{
            label: labels.cancelButtonLabel,
            onPress: onCancelPress,
            testID: 'address-book-cancel-button',
          }}
        />
      ) : undefined,
    });
  }, [
    navigation,
    labels.title,
    labels.cancelButtonLabel,
    hasAnyItems,
    onCancelPress,
  ]);

  return (
    <AddressBookTemplate
      emptyLabel={labels.emptyLabel}
      addContactLabel={labels.addContactLabel}
      contacts={contacts}
      onSelectAddress={onSelectAddress}
      ownAccounts={ownAccounts}
      ownAccountsSectionLabel={labels.ownAccountsSectionLabel}
      contactsSectionLabel={labels.contactsSectionLabel}
      onAddPress={onAddPress}
    />
  );
};
