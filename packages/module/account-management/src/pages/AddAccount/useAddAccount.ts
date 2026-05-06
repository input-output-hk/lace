import { isDuplicateString } from '@lace-contract/account-management';
import { useTranslation } from '@lace-contract/i18n';
import {
  isHardwareWallet as checkIsHardwareWallet,
  WalletId,
  WalletType,
} from '@lace-contract/wallet-repo';
import { NavigationControls } from '@lace-lib/navigation';
import { isIOS, type ButtonConfig } from '@lace-lib/ui-toolkit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useDispatchLaceAction,
  useLaceSelector,
  useLoadModules,
} from '../../hooks';

import {
  calculateNextAccountIndex,
  createAuthenticationConfig,
  formatAccountIndex,
  generateAccountIndexDropdownItems,
  getAvailableBlockchainOptions,
  getHwBlockchainOptions,
  getUsedAccountIndices,
  isAccountFormValid,
  TRANSLATION_KEYS,
} from './addAccountHelpers';

import type { InMemoryWallet } from '@lace-contract/wallet-repo';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { BlockchainName } from '@lace-lib/util-store';

const BUTTON_PRIMARY_TEST_ID = 'add-account-sheet-add-button';
const BUTTON_SECONDARY_TEST_ID = 'add-account-sheet-cancel-button';

export const useAddAccount = (
  props: SheetScreenProps<SheetRoutes.AddAccount>,
) => {
  const { walletId } = props.route.params;

  const { t } = useTranslation();
  const wallet = useLaceSelector('wallets.selectWalletById', walletId);
  const isHardwareWallet = wallet ? checkIsHardwareWallet(wallet) : false;

  const loadedInMemoryWalletIntegrations = useLoadModules(
    'addons.loadInMemoryWalletIntegration',
  );
  const loadedHwBlockchainSupport = useLoadModules(
    'addons.loadHwBlockchainSupport',
  );

  const addAccount = useDispatchLaceAction(
    'accountManagement.attemptAddAccount',
  );
  const clearAccountStatus = useDispatchLaceAction(
    'accountManagement.clearAccountStatus',
  );
  const setLoading = useDispatchLaceAction('accountManagement.setLoading');
  const clearActiveSheetPage = useDispatchLaceAction(
    'views.setActiveSheetPage',
  );

  const [accountName, setAccountName] = useState<string>('');
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [isNoRecoveryPhraseModalVisible, setIsNoRecoveryPhraseModalVisible] =
    useState(false);

  const isLoading = useLaceSelector('accountManagement.getIsLoading');

  const [accountIndex, setAccountIndex] = useState<number>(0);

  const blockchainOptions = useMemo<BlockchainName[]>(
    () =>
      isHardwareWallet
        ? getHwBlockchainOptions(loadedHwBlockchainSupport, wallet?.type)
        : getAvailableBlockchainOptions(loadedInMemoryWalletIntegrations),
    [
      isHardwareWallet,
      loadedHwBlockchainSupport,
      wallet?.type,
      loadedInMemoryWalletIntegrations,
    ],
  );

  const didAdjustSheetHeightRef = useRef(false);

  useEffect(() => {
    if (!isIOS) return;
    if (didAdjustSheetHeightRef.current) return;
    if (blockchainOptions.length === 0) return;

    didAdjustSheetHeightRef.current = true;
    requestAnimationFrame(() => {
      NavigationControls.sheets.expand();
    });
  }, [blockchainOptions.length]);

  const [selectedBlockchain, setSelectedBlockchain] = useState<BlockchainName>(
    () => blockchainOptions?.[0] || 'Cardano',
  );

  const networkId = useLaceSelector(
    'network.selectActiveNetworkId',
    selectedBlockchain,
  );

  const accountNamesOnSelectedNetwork = useLaceSelector(
    'wallets.selectAccountNamesByNetworkId',
    networkId,
  );

  const accountNameError = useMemo(
    () =>
      networkId !== undefined &&
      isDuplicateString(accountName, accountNamesOnSelectedNetwork)
        ? String(t('v2.account-management.error.duplicate-account-name'))
        : undefined,
    [networkId, accountNamesOnSelectedNetwork, accountName, t],
  );

  const { hasAvailableIndices, nextAccountIndex, usedIndices } = useMemo(() => {
    if (!wallet || !networkId)
      return {
        hasAvailableIndices: false,
        nextAccountIndex: 0,
        usedIndices: new Set<number>(),
      };
    const accounts = wallet.accounts.filter(
      account => account.blockchainNetworkId === networkId,
    );
    const usedIndices = getUsedAccountIndices(accounts);
    const nextAccountIndex = calculateNextAccountIndex(usedIndices);
    return nextAccountIndex === undefined
      ? {
          hasAvailableIndices: false,
          nextAccountIndex: 0,
          usedIndices,
        }
      : {
          hasAvailableIndices: true,
          nextAccountIndex,
          usedIndices,
        };
  }, [wallet?.accounts, networkId]);

  const isConfirmEnabled = useMemo(
    () =>
      isAccountFormValid(accountName, selectedBlockchain, blockchainOptions) &&
      !accountNameError &&
      networkId !== undefined,
    [
      accountName,
      selectedBlockchain,
      blockchainOptions,
      accountNameError,
      networkId,
    ],
  );

  const accountIndexInputLabel = useMemo(
    () => formatAccountIndex(accountIndex),
    [accountIndex],
  );

  const title = t(TRANSLATION_KEYS.title);
  const description = isHardwareWallet
    ? t(TRANSLATION_KEYS.hwDescription)
    : t(TRANSLATION_KEYS.description);
  const accountNameInputLabel = t(TRANSLATION_KEYS.nameInputLabel);
  const buttonPrimaryLabel = t(TRANSLATION_KEYS.buttonPrimary);
  const buttonSecondaryLabel = t(TRANSLATION_KEYS.buttonCancel);
  const walletLabel = t(TRANSLATION_KEYS.walletLabel, {
    walletName: wallet?.metadata?.name || '',
  });
  const allIndicesUsedMessage = t(TRANSLATION_KEYS.allIndicesUsedMessage, {
    blockchain: selectedBlockchain,
  });
  const accountIndexItemUsedLabel = t(TRANSLATION_KEYS.accountIndexItemUsed);

  const handleClose = useCallback(() => {
    setLoading(false);
    setAccountName('');
    clearAccountStatus();
    clearActiveSheetPage(null);
    NavigationControls.sheets.close();
  }, [clearAccountStatus, clearActiveSheetPage, setLoading]);

  // Adding an account on a blockchain the wallet has no data for requires
  // deriving a fresh chain root key from the mnemonic.
  const isMnemonicRequiredForSelectedBlockchain = useMemo(() => {
    if (!wallet || wallet.type !== WalletType.InMemory) return false;
    const inMemory = wallet as InMemoryWallet;
    if (inMemory.encryptedRecoveryPhrase) return false;
    const blockchainSpecific = inMemory.blockchainSpecific as Record<
      BlockchainName,
      unknown
    >;
    return !blockchainSpecific[selectedBlockchain];
  }, [wallet, selectedBlockchain]);

  const closeNoRecoveryPhraseModal = useCallback(() => {
    setIsNoRecoveryPhraseModalVisible(false);
  }, []);

  const noRecoveryPhraseFallbackBlockchain = useMemo<
    BlockchainName | undefined
  >(() => {
    if (!wallet || wallet.type !== WalletType.InMemory) return undefined;
    const blockchainSpecific = (wallet as InMemoryWallet)
      .blockchainSpecific as Record<BlockchainName, unknown>;
    return Object.keys(blockchainSpecific).find(
      key => blockchainSpecific[key as BlockchainName],
    ) as BlockchainName | undefined;
  }, [wallet]);

  const handleAddAccount = useCallback(() => {
    if (
      !wallet ||
      !blockchainOptions.includes(selectedBlockchain) ||
      !networkId
    ) {
      return;
    }

    if (isMnemonicRequiredForSelectedBlockchain) {
      setIsNoRecoveryPhraseModalVisible(true);
      return;
    }

    setSubmittedName(accountName.trim());
    setLoading(true);

    addAccount({
      walletId: WalletId(walletId),
      blockchain: selectedBlockchain,
      accountName: accountName,
      accountIndex,
      // HW wallets authenticate via the physical device — no password prompt.
      authenticationPromptConfig: isHardwareWallet
        ? undefined
        : createAuthenticationConfig(),
      targetNetworks: new Set([networkId]),
    });
  }, [
    wallet,
    addAccount,
    walletId,
    selectedBlockchain,
    accountName,
    accountIndex,
    blockchainOptions,
    setLoading,
    networkId,
    isHardwareWallet,
    isMnemonicRequiredForSelectedBlockchain,
  ]);

  const handleBlockchainChange = useCallback((value: string) => {
    setSelectedBlockchain(value as BlockchainName);
  }, []);

  const onAccountIndexChange = useCallback((value: number) => {
    setAccountIndex(value);
  }, []);

  const accountIndexDropdownItems = useMemo(
    () =>
      generateAccountIndexDropdownItems(usedIndices, accountIndexItemUsedLabel),
    [usedIndices, accountIndexItemUsedLabel],
  );

  const secondaryButton = useMemo<ButtonConfig>(
    () => ({
      label: buttonSecondaryLabel,
      onPress: handleClose,
      testID: BUTTON_SECONDARY_TEST_ID,
    }),
    [buttonSecondaryLabel, handleClose],
  );

  const primaryButton = useMemo<ButtonConfig | undefined>(
    () =>
      hasAvailableIndices
        ? {
            label: buttonPrimaryLabel,
            onPress: handleAddAccount,
            loading: isLoading,
            disabled: !isConfirmEnabled,
            testID: BUTTON_PRIMARY_TEST_ID,
          }
        : undefined,
    [
      hasAvailableIndices,
      buttonPrimaryLabel,
      handleAddAccount,
      isLoading,
      isConfirmEnabled,
    ],
  );

  useEffect(() => {
    if (
      blockchainOptions.length > 0 &&
      !blockchainOptions.includes(selectedBlockchain)
    ) {
      setSelectedBlockchain(blockchainOptions[0]);
    }
  }, [blockchainOptions, selectedBlockchain]);

  // Sync account index with next available index
  useEffect(() => {
    setAccountIndex(nextAccountIndex);
  }, [nextAccountIndex]);

  useEffect(() => {
    return () => {
      setLoading(false);
    };
  }, [setLoading]);

  return {
    title,
    description,
    walletLabel,
    accountNameInputLabel,
    accountName,
    accountNameError:
      accountName.trim() === submittedName ? undefined : accountNameError,
    onAccountNameChange: setAccountName,
    selectedBlockchain,
    onBlockchainChange: handleBlockchainChange,
    blockchainOptions,
    secondaryButton,
    primaryButton,
    accountIndexInputLabel,
    onAccountIndexChange,
    accountIndex,
    accountIndexDropdownItems,
    hasAvailableIndices,
    allIndicesUsedMessage,
    isNoRecoveryPhraseModalVisible,
    closeNoRecoveryPhraseModal,
    noRecoveryPhraseFallbackBlockchain,
  };
};
