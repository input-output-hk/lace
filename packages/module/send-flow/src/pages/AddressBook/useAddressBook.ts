import { useTranslation } from '@lace-contract/i18n';
import { SheetRoutes } from '@lace-lib/navigation';
import { useCallback } from 'react';

import { useLaceSelector } from '../../hooks';
import { useSendFlowNavigation } from '../../hooks/useSendFlowNavigation';

import { useContactsFilteredByBlockchain } from './useContactsFilteredByBlockchain';
import { useOwnAccountsAsContacts } from './useOwnAccountsAsContacts';

import type { AccountId } from '@lace-contract/wallet-repo';

export const useAddressBook = (accountId: AccountId) => {
  const { t } = useTranslation();
  const { navigate } = useSendFlowNavigation();

  const accountsResult = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const accounts = Array.isArray(accountsResult) ? accountsResult : [];
  const contacts = useLaceSelector('addressBook.selectAllContacts');

  const currentAccount = accounts.find(
    account => account.accountId === accountId,
  );
  const currentBlockchain = currentAccount?.blockchainName;

  const filteredContacts = useContactsFilteredByBlockchain(
    contacts,
    currentBlockchain,
  );

  const ownAccounts = useOwnAccountsAsContacts(accountId, currentBlockchain);

  const labels = {
    title: t('v2.sheets.address-book.title'),
    emptyLabel: t('v2.sheets.address-book.empty'),
    addContactLabel: t('v2.sheets.address-book.add-contact-button'),
    cancelButtonLabel: t('v2.sheets.address-book.cancel-button'),
    ownAccountsSectionLabel: t('v2.sheets.address-book.own-accounts-section'),
    contactsSectionLabel: t('v2.sheets.address-book.contacts-section'),
  };

  const onCancelPress = useCallback(() => {
    navigate(SheetRoutes.Send, { accountId });
  }, [navigate, accountId]);

  const onAddPress = useCallback(() => {
    navigate(SheetRoutes.AddContact, { source: 'send-flow' });
  }, [navigate]);

  const onSelectAddress = useCallback(
    (address: string) => {
      navigate(SheetRoutes.Send, {
        accountId,
        recipientAddress: address,
        recipientSource: 'address-book',
      });
    },
    [navigate, accountId],
  );

  return {
    labels,
    onCancelPress,
    onAddPress,
    contacts: filteredContacts,
    ownAccounts,
    onSelectAddress,
  };
};
