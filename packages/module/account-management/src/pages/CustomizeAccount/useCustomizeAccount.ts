import { isDuplicateString } from '@lace-contract/account-management';
import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { SheetRoutes } from '@lace-lib/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type {
  SheetRoutes as SheetRoutesType,
  SheetScreenProps,
} from '@lace-lib/navigation';
import type { Tag } from 'type-fest/source/tagged';
type AccountId = Tag<'AccountId', never> & string;
type WalletId = Tag<'WalletId', never> & string;

export const useCustomizeAccount = (
  props: SheetScreenProps<SheetRoutesType.CustomizeAccount>,
) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  const { walletId, accountId } = props.route.params;

  const account = useLaceSelector('wallets.selectAccountById', {
    accountId,
    walletId,
  });
  const updateAccount = useDispatchLaceAction('wallets.updateAccount');
  const existingAccountNames = useLaceSelector(
    'wallets.selectAccountNamesByNetworkId',
    account?.blockchainNetworkId,
  );
  const currentAccountName = account?.metadata?.name;
  const [nameValue, setNameValue] = useState(currentAccountName ?? '');

  const duplicateAccountNameMessage = String(
    t('v2.account-management.error.duplicate-account-name'),
  );
  const accountNameError = useMemo(
    () =>
      isDuplicateString(nameValue, existingAccountNames, currentAccountName)
        ? duplicateAccountNameMessage
        : undefined,
    [
      nameValue,
      existingAccountNames,
      currentAccountName,
      duplicateAccountNameMessage,
    ],
  );

  const isConfirmEnabled = useMemo(
    () =>
      nameValue.trim() !== '' &&
      nameValue !== currentAccountName &&
      !accountNameError,
    [nameValue, currentAccountName, accountNameError],
  );

  const headerTitle = t('v2.customise-account.title');
  const inputLabel = t('v2.customise-account.inputLabel');
  const primaryButtonLabel = t('v2.customise-account.actions-save');
  const secondaryButtonLabel = t('v2.customise-account.actions-cancel');

  const resetForm = useCallback(() => {
    setNameValue(currentAccountName ?? '');
  }, [currentAccountName]);

  const handleConfirm = useCallback(() => {
    if (!account) return;

    updateAccount(walletId as WalletId, accountId as AccountId, {
      metadata: { ...account.metadata, name: nameValue },
    });
    trackEvent('account management | account | renamed');
    NavigationControls.sheets.navigate(SheetRoutes.CustomizeAccountSuccess);
  }, [account, accountId, nameValue, trackEvent, updateAccount, walletId]);

  const onCancel = () => {
    resetForm();
    NavigationControls.sheets.close();
  };

  const onSuccessConfirm = () => {
    NavigationControls.sheets.close();
  };

  useEffect(() => {
    resetForm();
  }, [resetForm]);

  const actions = {
    onSubmit: handleConfirm,
    onCancel,
    onChangeText: setNameValue,
    onSuccessConfirm,
  };

  const copies = {
    headerTitle,
    inputLabel,
    secondaryButtonLabel,
    primaryButtonLabel,
  };

  const utils = {
    nameValue,
    nameError: accountNameError,
    isDisabled: !isConfirmEnabled,
  };

  return { actions, copies, utils };
};
