import React, { useCallback } from 'react';
import { toast } from '@lace/common';
import styles from './SettingsLayout.module.scss';
import { useTranslation } from 'react-i18next';
import { Radio, RadioChangeEvent } from 'antd';
import { useWalletStore } from '@src/stores';
import { Wallet } from '@lace/cardano';
import SwithIcon from '@src/assets/icons/switch.component.svg';
import ErrorIcon from '@src/assets/icons/address-error-icon.component.svg';
import { config } from '@src/config';
import { useWalletManager } from '@hooks';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

const { AVAILABLE_CHAINS } = config();

type networkEventSettings =
  | PostHogAction.SettingsNetworkPreviewClick
  | PostHogAction.SettingsNetworkPreprodClick
  | PostHogAction.SettingsNetworkMainnetClick;

type networkEventUserWalletProfile =
  | PostHogAction.UserWalletProfileNetworkPreviewClick
  | PostHogAction.UserWalletProfileNetworkPreprodClick
  | PostHogAction.UserWalletProfileNetworkMainnetClick;

const settingsEventByNetworkName: Partial<Record<Wallet.ChainName, networkEventSettings>> = {
  Mainnet: PostHogAction.SettingsNetworkMainnetClick,
  Preprod: PostHogAction.SettingsNetworkPreprodClick,
  Preview: PostHogAction.SettingsNetworkPreviewClick
};

const walletProfileEventByNetworkName: Partial<Record<Wallet.ChainName, networkEventUserWalletProfile>> = {
  Mainnet: PostHogAction.UserWalletProfileNetworkMainnetClick,
  Preprod: PostHogAction.UserWalletProfileNetworkPreprodClick,
  Preview: PostHogAction.UserWalletProfileNetworkPreviewClick
};

export const NetworkChoice = ({ section }: { section?: 'settings' | 'wallet-profile' }): React.ReactElement => {
  const { t } = useTranslation();
  const { environmentName } = useWalletStore();
  const { switchNetwork } = useWalletManager();
  const analytics = useAnalyticsContext();

  const getNetworkName = useCallback(
    (chainName: Wallet.ChainName) => {
      switch (chainName) {
        case 'Mainnet':
          return t('general.networks.mainnet');
        case 'Preprod':
          return t('general.networks.preprod');
        case 'Preview':
          return t('general.networks.preview');
        case 'LegacyTestnet':
          return t('general.networks.legacyTestnet');
        default:
          return '';
      }
    },
    [t]
  );

  const handleNetworkChange = async (event: RadioChangeEvent) => {
    try {
      await switchNetwork(event.target.value);
      toast.notify({
        text: t('browserView.settings.wallet.network.networkSwitched'),
        withProgressBar: true,
        icon: SwithIcon
      });
      const eventByNetworkName = section === 'settings' ? settingsEventByNetworkName : walletProfileEventByNetworkName;
      await analytics.sendEventToPostHog(eventByNetworkName[event.target.value as Wallet.ChainName]);
    } catch (error) {
      console.error('Error switching networks', error);
      toast.notify({ text: t('general.errors.somethingWentWrong'), icon: ErrorIcon });
    }
    return event;
  };

  return (
    <Radio.Group
      className={styles.radioGroup}
      onChange={handleNetworkChange}
      value={environmentName}
      data-testid={'network-choice-radio-group'}
    >
      {AVAILABLE_CHAINS.map((network) => (
        <a className={styles.radio} key={network}>
          <Radio
            value={network}
            className={styles.radioLabel}
            data-testid={`network-${network.toLowerCase()}-radio-button`}
          >
            {getNetworkName(network as Wallet.ChainName)}
          </Radio>
        </a>
      ))}
    </Radio.Group>
  );
};
