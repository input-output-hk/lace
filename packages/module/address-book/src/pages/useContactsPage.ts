import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import {
  NavigationControls,
  SheetRoutes,
  StackRoutes,
  TabRoutes,
} from '@lace-lib/navigation';
import { type ContactItem } from '@lace-lib/ui-toolkit';
import { useCallback, useMemo } from 'react';

import { useLaceSelector } from '../hooks';
import { useSearchContacts } from '../hooks/useSearchContacts';

import type { Contact } from '@lace-contract/address-book';

const mapContactToContactItem = (contact: Contact): ContactItem => ({
  id: contact.id.valueOf(),
  name: contact.name,
  avatar: contact.avatar,
  addresses: contact.addresses.map(address => ({
    address: address.address,
    blockchainName: address.blockchainName,
    accountId: address.accountId,
  })),
});

export const useContactsPage = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const contacts = useLaceSelector('addressBook.selectAllContacts');
  const contactItems = useMemo(
    () => contacts.map(mapContactToContactItem),
    [contacts],
  );

  const {
    debouncedSearchQuery,
    searchQuery,
    onSearchChange,
    filteredContacts,
  } = useSearchContacts(contactItems);

  const onClosePress = useCallback(() => {
    trackEvent('address book | close | press');
    NavigationControls.actions.closeAndNavigate(StackRoutes.Home, {
      screen: TabRoutes.Portfolio,
    });
  }, [trackEvent]);

  const onAddPress = useCallback(() => {
    trackEvent('address book | add | press');
    NavigationControls.sheets.navigate(SheetRoutes.AddContact);
  }, [trackEvent]);

  const onContactPress = useCallback(
    (contact: ContactItem) => {
      trackEvent('address book | contact | press', { contactId: contact.id });
      NavigationControls.sheets.navigate(SheetRoutes.ContactDetails, {
        contactId: contact.id,
      });
    },
    [trackEvent],
  );

  const actions = useMemo(
    () => ({
      onClosePress,
      onAddPress,
      onContactPress,
    }),
    [onClosePress, onAddPress, onContactPress],
  );

  const labels = useMemo(
    () => ({
      title: t('v2.pages.address-book.title'),
      subtitle: t('v2.pages.address-book.subtitle'),
      emptyState: {
        title: t('v2.pages.address-book.empty-state.title'),
        subtitle: t('v2.pages.address-book.empty-state.subtitle'),
      },
      noSearchResults: {
        title: t('v2.pages.address-book.no-search-results.title', {
          searchQuery: debouncedSearchQuery,
        }),
        subtitle: t('v2.pages.address-book.no-search-results.subtitle'),
      },
    }),
    [t, debouncedSearchQuery],
  );

  const values = useMemo(
    () => ({
      contacts: filteredContacts,
      debouncedSearchQuery,
      searchQuery,
      onSearchChange,
    }),
    [filteredContacts, debouncedSearchQuery, searchQuery, onSearchChange],
  );

  return {
    actions,
    labels,
    values,
  };
};
