import React, { ReactNode, useCallback, useState, VFC, useMemo, useEffect } from 'react';
import { Menu, MenuProps } from 'antd';
import {
  AddNewWalletLink,
  AddressBookLink,
  AddNewBitcoinWalletLink,
  Links,
  LockWallet,
  NetworkChoise,
  RenameWalletDrawer,
  Separator,
  SettingsLink,
  SignMessageLink,
  ThemeSwitcher,
  UserInfo
} from './components';
import { logger, Switch, useObservable } from '@lace/common';
import styles from './DropdownMenuOverlay.module.scss';
import { NetworkInfo } from './components/NetworkInfo';
import { Sections } from './types';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { WalletAccounts } from './components/WalletAccounts';
import { AddSharedWalletLink } from '@components/MainMenu/DropdownMenuOverlay/components/AddSharedWalletLink';
import { useWalletStore } from '@stores';
import classNames from 'classnames';
import type { AnyBip32Wallet } from '@cardano-sdk/web-extension';
import { WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { BackgroundStorage } from '@lib/scripts/types';
import { getBackgroundStorage, setBackgroundStorage } from '@lib/scripts/background/storage';
import { useBackgroundServiceAPIContext } from '@providers';
import { WarningModal } from '@src/views/browser-view/components';
import { useTranslation } from 'react-i18next';
import { useCurrentWallet, useWalletManager } from '@hooks';

interface Props extends MenuProps {
  isPopup?: boolean;
  lockWalletButton?: ReactNode;
  topSection?: ReactNode;
  sendAnalyticsEvent?: (event: PostHogAction) => void;
}

// eslint-disable-next-line complexity
export const DropdownMenuOverlay: VFC<Props> = ({
  isPopup,
  lockWalletButton = <LockWallet />,
  topSection,
  sendAnalyticsEvent,
  ...props
}): React.ReactElement => {
  const { t } = useTranslation();
  const posthog = usePostHogClientContext();
  const backgroundServices = useBackgroundServiceAPIContext();
  const { walletRepository } = useWalletManager();
  const currentWallet = useCurrentWallet();
  const wallets = useObservable(walletRepository.wallets$);

  const sharedWalletsEnabled = posthog?.isFeatureFlagEnabled('shared-wallets');
  const bitcoinWalletsEnabled = posthog?.isFeatureFlagEnabled('bitcoin-wallets');
  const [currentSection, setCurrentSection] = useState<Sections>(Sections.Main);
  const { environmentName, setManageAccountsWallet, walletType, isSharedWallet, isBitcoinWallet } = useWalletStore();
  const [namiMigration, setNamiMigration] = useState<BackgroundStorage['namiMigration']>();
  const [modalOpen, setModalOpen] = useState(false);
  const [isRenamingWallet, setIsRenamingWallet] = useState(false);
  const useSwitchToNamiMode = posthog?.isFeatureFlagEnabled('use-switch-to-nami-mode') && !isBitcoinWallet;
  useEffect(() => {
    getBackgroundStorage()
      .then((storage) => setNamiMigration(storage.namiMigration))
      .catch(logger.error);
  }, []);

  const openWalletAccounts = (wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>) => {
    setManageAccountsWallet(wallet);
    setCurrentSection(Sections.WalletAccounts);
  };

  const handleNetworkChoise = () => {
    setCurrentSection(Sections.NetworkInfo);
    sendAnalyticsEvent(PostHogAction.UserWalletProfileNetworkClick);
  };

  const goBackToMainSection = useCallback(() => setCurrentSection(Sections.Main), []);

  topSection = topSection ?? (
    <UserInfo
      onOpenWalletAccounts={openWalletAccounts}
      onOpenEditWallet={(wallet: AnyBip32Wallet<Wallet.WalletMetadata, Wallet.AccountMetadata>) => {
        setManageAccountsWallet(wallet);
        setIsRenamingWallet(true);
      }}
    />
  );

  const getSignMessageLink = () => (
    <>
      <SignMessageLink />
      <Separator />
    </>
  );

  const shouldShowSignMessage = useMemo(
    () =>
      process.env.USE_MESSAGE_SIGNING === 'true' &&
      !isPopup &&
      [WalletType.InMemory, WalletType.Ledger].includes(walletType),
    [isPopup, walletType]
  );

  const hasLinkedSharedWallet = wallets?.some(
    (w) => w.type === WalletType.Script && w.ownSigners[0].walletId === currentWallet.walletId
  );
  const showAddSharedWalletLink = sharedWalletsEnabled && !isSharedWallet && !hasLinkedSharedWallet;
  const showAddBitcoinWalletLink = bitcoinWalletsEnabled;

  const handleNamiModeChange = async (activated: boolean) => {
    const mode = activated ? 'nami' : 'lace';
    const migration: BackgroundStorage['namiMigration'] = {
      ...namiMigration,
      mode
    };

    setNamiMigration(migration);
    backgroundServices.handleChangeMode({ mode });
    await setBackgroundStorage({
      namiMigration: migration
    });
    setModalOpen(false);
    if (activated) {
      await posthog.sendEvent(PostHogAction.SettingsSwitchToNamiClick);
      try {
        await backgroundServices.closeAllTabsAndOpenPopup();
      } catch (error) {
        logger.warn(error);
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <Menu {...props} className={styles.menuOverlay} data-testid="header-menu">
      <WarningModal
        header={
          <div className={styles.switchToNamiModalTitle}>{t('browserView.settings.legacyMode.confirmation.title')}</div>
        }
        content={t('browserView.settings.legacyMode.confirmation.description')}
        visible={modalOpen}
        onCancel={() => setModalOpen(false)}
        onConfirm={() => handleNamiModeChange(true)}
        cancelLabel={t('browserView.settings.legacyMode.confirmation.cancel')}
        confirmLabel={t('browserView.settings.legacyMode.confirmation.confirm')}
        confirmCustomClassName={styles.settingsConfirmButton}
        isPopupView={isPopup}
      />
      {currentSection === Sections.Main && (
        <div
          className={classNames(
            isPopup ? styles.popUpContainer : styles.extendedContainer,
            environmentName === 'Mainnet' ? styles.popUpContainerHigher : styles.popUpContainerLower
          )}
        >
          {topSection}
          <Links>
            {process.env.USE_MULTI_WALLET === 'true' && (
              <AddNewWalletLink isPopup={isPopup} sendAnalyticsEvent={sendAnalyticsEvent} />
            )}
            {showAddSharedWalletLink && <AddSharedWalletLink isPopup={isPopup} />}
            {showAddBitcoinWalletLink && <AddNewBitcoinWalletLink isPopup={isPopup} />}
            <AddressBookLink />
            <SettingsLink />
            <Separator />
            {shouldShowSignMessage && getSignMessageLink()}
            <ThemeSwitcher isPopup={isPopup} />
            {useSwitchToNamiMode && !isSharedWallet && (
              <div className={styles.menuItemTheme} data-testid="header-menu-nami-mode-switcher">
                {t('browserView.settings.legacyMode.section')}
                <Switch
                  testId="settings-nami-mode-switch"
                  checked={namiMigration?.mode === 'nami'}
                  onChange={(checked) => (checked ? setModalOpen(true) : handleNamiModeChange(false))}
                  className={styles.namiModeSwitch}
                />
              </div>
            )}
            <NetworkChoise onClick={handleNetworkChoise} />
            {lockWalletButton && (
              <>
                <Separator /> {lockWalletButton}
              </>
            )}
          </Links>
        </div>
      )}
      {currentSection === Sections.NetworkInfo && <NetworkInfo onBack={goBackToMainSection} />}
      {currentSection === Sections.WalletAccounts && <WalletAccounts onBack={goBackToMainSection} isPopup={isPopup} />}
      {isRenamingWallet && (
        <RenameWalletDrawer open={isRenamingWallet} popupView={isPopup} onClose={() => setIsRenamingWallet(false)} />
      )}
    </Menu>
  );
};
