import { isDuplicateString } from '@lace-contract/account-management';
import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { WalletId } from '@lace-contract/wallet-repo';
import { NavigationControls } from '@lace-lib/navigation';
import { SheetRoutes } from '@lace-lib/navigation';
import { type ButtonConfig } from '@lace-lib/ui-toolkit';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { SheetScreenProps } from '@lace-lib/navigation';

type EditWalletScreenProps = SheetScreenProps<SheetRoutes.EditWallet>;

export const useEditWallet = ({ route }: EditWalletScreenProps) => {
  const { walletId } = route.params;
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  const updateWallet = useDispatchLaceAction('wallets.updateWallet');
  const activeWallet = useLaceSelector('wallets.selectWalletById', walletId);
  const allWallets = useLaceSelector('wallets.selectAll');
  const [name, setName] = useState('');

  const activeWalletName = activeWallet?.metadata.name;

  const existingWalletNames = useMemo(
    () => (allWallets ?? []).map(w => w.metadata.name),
    [allWallets],
  );

  const duplicateWalletNameMessage = String(
    t('v2.account-management.error.duplicate-wallet-name'),
  );
  const walletNameError = useMemo(
    () =>
      isDuplicateString(name, existingWalletNames, activeWalletName)
        ? duplicateWalletNameMessage
        : undefined,
    [name, existingWalletNames, activeWalletName, duplicateWalletNameMessage],
  );

  const isConfirmEnabled = useMemo(
    () =>
      name.trim() !== '' &&
      name.trim() !== activeWalletName?.trim() &&
      !walletNameError,
    [name, activeWalletName, walletNameError],
  );

  const cancelLabel = t('v2.wallet-details.edit-wallet.button.cancel');
  const confirmLabel = t('v2.wallet-details.edit-wallet.button.save');

  const labels = {
    title: t('v2.wallet-details.edit-wallet.title'),
    nameLabel: t('v2.wallet-details.edit-wallet.name-label'),
    name,
    nameError: walletNameError,
  };

  const handleChangeName = useCallback((value: string) => {
    setName(value);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!activeWallet || !name) return;
    if (name.trim() === activeWalletName?.trim()) return;

    const changes = { metadata: { ...activeWallet.metadata, name } };

    updateWallet({ id: WalletId(walletId), changes });
    trackEvent('account management | wallet | renamed');
    NavigationControls.sheets.navigate(SheetRoutes.EditWalletSuccess);
  }, [
    updateWallet,
    walletId,
    name,
    trackEvent,
    activeWallet,
    activeWalletName,
  ]);

  const handleCancel = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  const secondaryButton = useMemo<ButtonConfig>(
    () => ({
      label: cancelLabel,
      onPress: handleCancel,
      testID: 'edit-wallet-sheet-cancel-button',
    }),
    [cancelLabel, handleCancel],
  );

  const primaryButton = useMemo<ButtonConfig>(
    () => ({
      label: confirmLabel,
      onPress: handleConfirm,
      disabled: !isConfirmEnabled,
      testID: 'edit-wallet-sheet-save-button',
    }),
    [confirmLabel, handleConfirm, isConfirmEnabled],
  );

  useEffect(() => {
    if (activeWalletName) {
      setName(activeWalletName);
    }
  }, [activeWalletName]);

  return {
    labels,
    actions: {
      onNameChange: handleChangeName,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
    secondaryButton,
    primaryButton,
  };
};
