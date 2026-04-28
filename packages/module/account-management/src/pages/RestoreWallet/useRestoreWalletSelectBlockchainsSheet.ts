import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, sheetNavigationRef } from '@lace-lib/navigation';
import { useCallback, useEffect, useMemo } from 'react';

import {
  useDispatchLaceAction,
  useLaceSelector,
  useLoadModules,
} from '../../hooks';

import { ensureSelection, getBlockchainIcon } from './utils';

import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { RestoreWalletSelectBlockchainsSheetTemplateProps } from '@lace-lib/ui-toolkit';
import type { BlockchainName } from '@lace-lib/util-store';

type RestoreWalletSelectBlockchainsSheetProps =
  SheetScreenProps<SheetRoutes.RestoreWalletSelectBlockchains>;

export const useRestoreWalletSelectBlockchainsSheet = (
  _props: RestoreWalletSelectBlockchainsSheetProps,
): RestoreWalletSelectBlockchainsSheetTemplateProps => {
  const { t } = useTranslation();
  const attemptCreateWallet = useDispatchLaceAction(
    'accountManagement.attemptCreateWallet',
  );
  const setSelectedBlockchains = useDispatchLaceAction(
    'accountManagement.setRestoreWalletSelectedBlockchains',
  );
  const clearRestoreWalletFlow = useDispatchLaceAction(
    'accountManagement.clearRestoreWalletFlow',
  );
  const restoreWalletFlow = useLaceSelector(
    'accountManagement.getRestoreWalletFlow',
  );
  const wallets = useLaceSelector('wallets.selectAll');
  const isLoading = useLaceSelector('accountManagement.getIsLoading');

  const loadedIntegrations = useLoadModules(
    'addons.loadInMemoryWalletIntegration',
  ) as InMemoryWalletIntegration[] | undefined;
  const integrations = useMemo(
    () => loadedIntegrations ?? [],
    [loadedIntegrations],
  );

  const selectedBlockchains = restoreWalletFlow?.selectedBlockchains ?? [];
  const walletDisplayName = useMemo(
    () =>
      t('v2.account-management.restore-wallet.default-wallet-name', {
        index: wallets.length + 1,
      }) as string,
    [t, wallets.length],
  );
  const walletInitials = useMemo(() => {
    return walletDisplayName
      .split(/\s+/)
      .filter(word => word.length > 0)
      .slice(0, 2)
      .map(word => word[0].toUpperCase())
      .join('');
  }, [walletDisplayName]);

  // Compute the validated selection based on available integrations
  const validatedSelection = useMemo(
    () => ensureSelection(integrations, selectedBlockchains),
    [integrations, selectedBlockchains],
  );

  // Update selection only when validated selection differs from current
  useEffect(() => {
    const isDifferent =
      validatedSelection.length !== selectedBlockchains.length ||
      validatedSelection.some(name => !selectedBlockchains.includes(name));

    if (isDifferent) {
      setSelectedBlockchains(validatedSelection);
    }
  }, [validatedSelection, selectedBlockchains, setSelectedBlockchains]);

  const handleToggle = useCallback(
    (blockchainName: BlockchainName, enabled: boolean) => {
      // Early return if trying to add an already selected blockchain
      if (enabled && selectedBlockchains.includes(blockchainName)) return;

      // Add blockchain
      if (enabled) {
        setSelectedBlockchains([...selectedBlockchains, blockchainName]);
        return;
      }

      // Early return if trying to remove the last blockchain
      if (selectedBlockchains.length <= 1) return;

      // Remove blockchain
      setSelectedBlockchains(
        selectedBlockchains.filter(name => name !== blockchainName),
      );
    },
    [selectedBlockchains, setSelectedBlockchains],
  );

  const handleConfirm = useCallback(() => {
    if (
      !selectedBlockchains.length ||
      !restoreWalletFlow?.recoveryPhrase?.length
    )
      return;

    attemptCreateWallet({
      walletName: walletDisplayName,
      blockchains: selectedBlockchains,
      recoveryPhrase: restoreWalletFlow.recoveryPhrase,
    });
  }, [
    attemptCreateWallet,
    restoreWalletFlow?.recoveryPhrase,
    selectedBlockchains,
    walletDisplayName,
  ]);

  const handleBack = useCallback(() => {
    sheetNavigationRef.goBack();
  }, []);

  const options = useMemo(
    () =>
      integrations.map(integration => ({
        id: integration.blockchainName.toLowerCase(),
        label: integration.blockchainName,
        icon: getBlockchainIcon(integration.blockchainName),
        selected: selectedBlockchains.includes(integration.blockchainName),
        disabled: isLoading,
        onToggle: (value: boolean) => {
          handleToggle(integration.blockchainName, value);
        },
        testID: `restore-wallet-select-blockchains-toggle-${integration.blockchainName.toLowerCase()}`,
      })),
    [handleToggle, integrations, isLoading, selectedBlockchains],
  );

  const isConfirmDisabled = useMemo(() => {
    return (
      selectedBlockchains.length === 0 || isLoading || integrations.length === 0
    );
  }, [selectedBlockchains.length, isLoading, integrations.length]);

  useEffect(() => {
    return () => {
      if (!NavigationControls.sheets.isOpen()) {
        clearRestoreWalletFlow();
      }
    };
  }, [clearRestoreWalletFlow]);

  return {
    title: t('v2.account-management.restore-wallet.select-blockchains.title'),
    subtitle: t(
      'v2.account-management.restore-wallet.select-blockchains.subtitle',
    ),
    confirmLabel: t(
      'v2.account-management.restore-wallet.select-blockchains.confirm',
    ),
    walletName: walletDisplayName,
    walletInitials,
    options,
    onConfirm: handleConfirm,
    onBack: handleBack,
    isConfirmDisabled,
    isLoading,
  };
};
