import type { ComponentType } from 'react';

import { isDuplicateString } from '@lace-contract/account-management';
import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { Blockchains } from '@lace-lib/ui-toolkit';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  useDispatchLaceAction,
  useLaceSelector,
  useLoadModules,
} from '../../hooks';

import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { SheetRoutes } from '@lace-lib/navigation';
import type { SheetScreenProps } from '@lace-lib/navigation';
import type { CreateWalletSheetTemplateProps } from '@lace-lib/ui-toolkit';
import type { BlockchainName } from '@lace-lib/util-store';

type CreateNewWalletSheetProps = SheetScreenProps<SheetRoutes.CreateNewWallet>;

type CreateWalletOption = {
  blockchainName: BlockchainName;
  Icon: ComponentType;
  testID: string;
};

export const useCreateNewWallet = (
  _props: CreateNewWalletSheetProps,
): CreateWalletSheetTemplateProps => {
  const { t } = useTranslation();
  const [walletName, setWalletName] = useState('');
  const [selectedBlockchains, setSelectedBlockchains] = useState<
    BlockchainName[]
  >([]);
  const [submittedName, setSubmittedName] = useState<string | null>(null);

  const isLoading = useLaceSelector('accountManagement.getIsLoading');
  const allWallets = useLaceSelector('wallets.selectAll');
  const existingWalletNames = useMemo(
    () => (allWallets ?? []).map(w => w.metadata.name),
    [allWallets],
  );

  const duplicateWalletNameMessage = String(
    t('v2.account-management.error.duplicate-wallet-name'),
  );
  const walletNameError = useMemo(
    () =>
      isDuplicateString(walletName, existingWalletNames)
        ? duplicateWalletNameMessage
        : undefined,
    [walletName, existingWalletNames, duplicateWalletNameMessage],
  );

  const loadedInMemoryWalletIntegrations = useLoadModules(
    'addons.loadInMemoryWalletIntegration',
  );
  const inMemoryWalletIntegrations = useMemo(
    () => loadedInMemoryWalletIntegrations ?? [],
    [loadedInMemoryWalletIntegrations],
  );

  const attemptCreateWallet = useDispatchLaceAction(
    'accountManagement.attemptCreateWallet',
  );

  const availableBlockchains = useMemo<CreateWalletOption[]>(() => {
    return inMemoryWalletIntegrations.map(
      (integration: InMemoryWalletIntegration) => ({
        blockchainName: integration.blockchainName,
        Icon: Blockchains[integration.blockchainName],
        testID: `create-new-wallet-toggle-${integration.blockchainName.toLowerCase()}`,
      }),
    );
  }, [inMemoryWalletIntegrations]);

  useEffect(() => {
    if (availableBlockchains.length === 0) return;
    setSelectedBlockchains(previous =>
      previous.filter(blockchainName =>
        availableBlockchains.some(
          option => option.blockchainName === blockchainName,
        ),
      ),
    );
  }, [availableBlockchains]);

  const toggleBlockchain = useCallback(
    (blockchainName: BlockchainName, enabled: boolean) => {
      setSelectedBlockchains(previous => {
        if (enabled) {
          if (previous.includes(blockchainName)) return previous;
          return [...previous, blockchainName];
        }
        return previous.filter(name => name !== blockchainName);
      });
    },
    [],
  );

  const handleCancel = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  const handleCreate = useCallback(() => {
    const trimmedName = walletName.trim();
    if (!trimmedName || selectedBlockchains.length === 0) return;

    setSubmittedName(trimmedName);
    attemptCreateWallet({
      walletName: trimmedName,
      blockchains: selectedBlockchains,
    });
  }, [attemptCreateWallet, selectedBlockchains, walletName]);

  const isCreateDisabled =
    !walletName.trim() ||
    selectedBlockchains.length === 0 ||
    isLoading ||
    !!walletNameError;

  const options = useMemo<CreateWalletSheetTemplateProps['options']>(
    () =>
      availableBlockchains.map(({ blockchainName, Icon, testID }) => ({
        id: blockchainName,
        label: blockchainName,
        Icon,
        selected: selectedBlockchains.includes(blockchainName),
        disabled: isLoading,
        onToggle: (selected: boolean) => {
          toggleBlockchain(blockchainName, selected);
        },
        testID,
      })),
    [availableBlockchains, isLoading, selectedBlockchains, toggleBlockchain],
  );

  return {
    title: t('v2.account-management.create-wallet.title'),
    nameLabel: t('v2.account-management.create-wallet.name-label'),
    nameValue: walletName,
    onNameChange: setWalletName,
    nameError:
      walletName.trim() === submittedName ? undefined : walletNameError,
    description: t('v2.account-management.create-wallet.description'),
    options,
    cancelLabel: t('v2.generic.cancel'),
    onCancel: handleCancel,
    confirmLabel: t('v2.account-management.create-wallet.confirm'),
    onConfirm: handleCreate,
    isConfirmDisabled: isCreateDisabled,
    isLoading,
  };
};
