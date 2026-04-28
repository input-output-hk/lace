import { AddressBookPageTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useContactsPage } from './useContactsPage';

export const ContactsPage = () => {
  const { actions, labels, values } = useContactsPage();

  return (
    <AddressBookPageTemplate
      actions={actions}
      labels={labels}
      values={values}
    />
  );
};
