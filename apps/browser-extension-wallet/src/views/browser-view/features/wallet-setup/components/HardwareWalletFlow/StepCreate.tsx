import { Wallet } from '@lace/cardano';
import { WalletSetupHWCreationStep } from '@lace/core';
import { EnhancedAnalyticsOptInStatus, postHogOnboardingActions } from '@providers/AnalyticsProvider/analyticsTracker';
import { TFunction } from 'i18next';
import React, { VFC, useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalStorage, useWalletManager } from '@hooks';
import { config } from '@src/config';
import { useAnalyticsContext } from '@providers';
import { ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY } from '@providers/AnalyticsProvider/config';

const { CHAIN } = config();

const makeWalletSetupCreateStepTranslations = (t: TFunction) => ({
  title: t('core.walletSetupCreateStep.title'),
  description: t('core.walletSetupCreateStep.description')
});

enum CreationState {
  Idle = 'Idle',
  Working = 'Working'
}

export type WalletData = {
  accountIndex: number;
  name: string;
};

type StepCreateProps = {
  connection: Wallet.HardwareWalletConnection;
  onError: (error: Error) => void;
  walletData: WalletData;
};

export const StepCreate: VFC<StepCreateProps> = ({ connection, onError, walletData }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<CreationState>(CreationState.Idle);
  const { createHardwareWalletRevamped, saveHardwareWallet } = useWalletManager();
  const analytics = useAnalyticsContext();
  const [enhancedAnalyticsStatus] = useLocalStorage(
    ENHANCED_ANALYTICS_OPT_IN_STATUS_LS_KEY,
    EnhancedAnalyticsOptInStatus.OptedOut
  );

  const walletSetupCreateStepTranslations = useMemo(() => makeWalletSetupCreateStepTranslations(t), [t]);

  useEffect(() => {
    (async () => {
      if (status !== CreationState.Idle) return;
      setStatus(CreationState.Working);

      void analytics.sendEventToPostHog(postHogOnboardingActions.hw.SETUP_HW_WALLET_NEXT_CLICK);

      let cardanoWallet: Wallet.CardanoWallet;
      try {
        cardanoWallet = await createHardwareWalletRevamped({
          connection,
          ...walletData
        });
      } catch (error) {
        console.error('ERROR creating hardware wallet', { error });
        onError(error);
        throw error;
      }

      const deviceSpec = await Wallet.getDeviceSpec(connection);
      await analytics.sendEventToPostHog(postHogOnboardingActions.hw.DONE_GO_TO_WALLET, {
        /* eslint-disable camelcase */
        $set_once: {
          initial_hardware_wallet_model: deviceSpec.model,
          initial_firmware_version: deviceSpec?.firmwareVersion,
          initial_cardano_app_version: deviceSpec?.cardanoAppVersion
        },
        $set: { wallet_accounts_quantity: '1' }
        /* eslint-enable camelcase */
      });

      await saveHardwareWallet(cardanoWallet, CHAIN);
      if (enhancedAnalyticsStatus === EnhancedAnalyticsOptInStatus.OptedIn) {
        await analytics.sendAliasEvent();
      }
    })();
  }, [
    analytics,
    connection,
    createHardwareWalletRevamped,
    enhancedAnalyticsStatus,
    onError,
    saveHardwareWallet,
    status,
    walletData
  ]);

  return <WalletSetupHWCreationStep translations={walletSetupCreateStepTranslations} />;
};
