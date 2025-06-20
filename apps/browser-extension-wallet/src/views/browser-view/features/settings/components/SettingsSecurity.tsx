/* eslint-disable complexity */
import React, { useCallback, useEffect, useState } from 'react';
import {
  SettingsCard,
  SettingsLink,
  PassphraseSettingsDrawer,
  ShowPassphraseDrawer,
  PaperWalletSettingsDrawer
} from './';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import styles from './SettingsLayout.module.scss';
import { useWalletStore } from '@src/stores';
import { useAnalyticsContext, useAppSettingsContext } from '@providers';
import { PHRASE_FREQUENCY_OPTIONS } from '@src/utils/constants';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { useCurrentBlockchain } from '@src/multichain';

const { Title } = Typography;
interface SettingsSecurityProps {
  popupView?: boolean;
  defaultPassphraseVisible?: boolean;
  defaultMnemonic?: Array<string>;
}

export const SettingsSecurity = ({
  popupView = false,
  defaultPassphraseVisible,
  defaultMnemonic
}: SettingsSecurityProps): React.ReactElement | null => {
  const posthog = usePostHogClientContext();
  const paperWalletEnabled = posthog?.isFeatureFlagEnabled('create-paper-wallet');
  const [isPassphraseSettingsDrawerOpen, setIsPassphraseSettingsDrawerOpen] = useState(false);
  const [isShowPassphraseDrawerOpen, setIsShowPassphraseDrawerOpen] = useState(false);
  const [hideShowPassphraseSetting, setHideShowPassphraseSetting] = useState(true);
  const [isPaperWalletSettingsDrawerOpen, setIsPaperWalletSettingsDrawerOpen] = useState(false);
  const { t } = useTranslation();
  const { isWalletLocked, isInMemoryWallet, isSharedWallet, isNamiWallet } = useWalletStore();
  const [settings] = useAppSettingsContext();
  const { mnemonicVerificationFrequency } = settings;
  const { blockchain } = useCurrentBlockchain();
  const frequency = PHRASE_FREQUENCY_OPTIONS.find(({ value }) => value === mnemonicVerificationFrequency)?.label;
  const analytics = useAnalyticsContext();
  const showPassphraseVerification = process.env.USE_PASSWORD_VERIFICATION === 'true';
  const isBitcoin = blockchain === 'bitcoin';

  const isMnemonicAvailable = useCallback(async () => {
    setHideShowPassphraseSetting(isWalletLocked() || !isInMemoryWallet);
  }, [isInMemoryWallet, isWalletLocked]);

  const handleCloseShowPassphraseDrawer = async () => {
    setIsShowPassphraseDrawerOpen(false);
    await analytics.sendEventToPostHog(PostHogAction.SettingsShowRecoveryPhraseYourRecoveryPhraseXClick);
    window.location.reload();
  };

  const handleOpenShowPassphraseDrawer = () => {
    setIsShowPassphraseDrawerOpen(true);
    analytics.sendEventToPostHog(PostHogAction.SettingsShowRecoveryPhraseClick);
  };

  const handleOpenShowPaperWalletDrawer = () => {
    setIsPaperWalletSettingsDrawerOpen(true);
    analytics.sendEventToPostHog(PostHogAction.SettingsOpenGeneratePaperWalletDrawer);
  };

  useEffect(() => {
    isMnemonicAvailable();
  }, [isMnemonicAvailable]);

  return (
    <>
      <PassphraseSettingsDrawer
        visible={isPassphraseSettingsDrawerOpen}
        onClose={() => setIsPassphraseSettingsDrawerOpen(false)}
        popupView={popupView}
      />
      <ShowPassphraseDrawer
        visible={isShowPassphraseDrawerOpen}
        onClose={handleCloseShowPassphraseDrawer}
        popupView={popupView}
        defaultPassphraseVisible={defaultPassphraseVisible}
        defaultMnemonic={defaultMnemonic}
        sendAnalyticsEvent={(event: PostHogAction) => analytics.sendEventToPostHog(event)}
      />
      {isInMemoryWallet && paperWalletEnabled && (
        <PaperWalletSettingsDrawer
          isOpen={isPaperWalletSettingsDrawerOpen}
          onClose={() => setIsPaperWalletSettingsDrawerOpen(false)}
          popupView={popupView}
        />
      )}
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid="security-settings-heading">
          {t('browserView.settings.security.title')}
        </Title>
        {!hideShowPassphraseSetting && !isSharedWallet && !isNamiWallet && (
          <>
            <SettingsLink
              onClick={handleOpenShowPassphraseDrawer}
              description={t('browserView.settings.security.showPassphrase.description')}
              data-testid="settings-show-recovery-phrase-link"
            >
              {t('browserView.settings.security.showPassphrase.title')}
            </SettingsLink>
          </>
        )}
        {!isBitcoin && isInMemoryWallet && paperWalletEnabled && !popupView && (
          <SettingsLink
            description={t('browserView.settings.generatePaperWallet.description')}
            onClick={handleOpenShowPaperWalletDrawer}
            data-testid="settings-generate-paperwallet-link"
          >
            {t('browserView.settings.generatePaperWallet.title')}
          </SettingsLink>
        )}
        {showPassphraseVerification && isInMemoryWallet && (
          <SettingsLink
            onClick={() => setIsPassphraseSettingsDrawerOpen(true)}
            description={t('browserView.settings.security.passphrasePeriodicVerification.description')}
            addon={`${frequency?.charAt(0)?.toUpperCase()}${frequency?.slice(1)}`}
            data-testid="settings-passphrase-verification-link"
          >
            {t('browserView.settings.security.passphrasePeriodicVerification.title')}
          </SettingsLink>
        )}
      </SettingsCard>
    </>
  );
};
