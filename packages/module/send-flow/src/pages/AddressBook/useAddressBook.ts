import { useTranslation } from '@lace-contract/i18n';
import { SheetRoutes } from '@lace-lib/navigation';

import { useLaceSelector } from '../../hooks';
import { useSendFlowNavigation } from '../../hooks/useSendFlowNavigation';

import { useContactsFilteredByBlockchain } from './useContactsFilteredByBlockchain';

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

  const labels = {
    title: t('v2.sheets.address-book.title'),
    emptyLabel: t('v2.sheets.address-book.empty'),
    cancelButtonLabel: t('v2.sheets.address-book.cancel-button'),
  };

  const onCancelPress = () => {
    navigate(SheetRoutes.Send);
  };

  const onSelectAddress = (address: string) => {
    navigate(SheetRoutes.Send, {
      recipientAddress: address,
    });
  };

  return {
    labels,
    onCancelPress,
    contacts: filteredContacts,
    onSelectAddress,
  };
};
