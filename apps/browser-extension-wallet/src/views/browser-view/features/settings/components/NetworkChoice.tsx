import React, { useCallback } from 'react';
import { logger, toast } from '@lace/common';
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
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { useCurrentBlockchain, Blockchain } from '@src/multichain';

const { AVAILABLE_CHAINS } = config();

type networkEventSettings =
  | PostHogAction.SettingsNetworkPreviewClick
  | PostHogAction.SettingsNetworkPreprodClick
  | PostHogAction.SettingsNetworkMainnetClick
  | PostHogAction.SettingsNetworkSanchonetClick;

type networkEventUserWalletProfile =
  | PostHogAction.UserWalletProfileNetworkPreviewClick
  | PostHogAction.UserWalletProfileNetworkPreprodClick
  | PostHogAction.UserWalletProfileNetworkMainnetClick
  | PostHogAction.UserWalletProfileNetworkSanchonetClick;

const settingsEventByNetworkName: Record<Wallet.ChainName, networkEventSettings> = {
  Mainnet: PostHogAction.SettingsNetworkMainnetClick,
  Preprod: PostHogAction.SettingsNetworkPreprodClick,
  Preview: PostHogAction.SettingsNetworkPreviewClick,
  Sanchonet: PostHogAction.SettingsNetworkSanchonetClick
};

const walletProfileEventByNetworkName: Record<Wallet.ChainName, networkEventUserWalletProfile> = {
  Mainnet: PostHogAction.UserWalletProfileNetworkMainnetClick,
  Preprod: PostHogAction.UserWalletProfileNetworkPreprodClick,
  Preview: PostHogAction.UserWalletProfileNetworkPreviewClick,
  Sanchonet: PostHogAction.UserWalletProfileNetworkSanchonetClick
};

export const cardanoNetworkMap: { [key in Wallet.ChainName]: Wallet.Cardano.NetworkMagics } = {
  Mainnet: Wallet.Cardano.NetworkMagics.Mainnet,
  Preprod: Wallet.Cardano.NetworkMagics.Preprod,
  Preview: Wallet.Cardano.NetworkMagics.Preview,
  Sanchonet: Wallet.Cardano.NetworkMagics.Sanchonet
};

export const NetworkChoice = ({ section }: { section?: 'settings' | 'wallet-profile' }): React.ReactElement => {
  const { t } = useTranslation();
  const posthog = usePostHogClientContext();
  const { environmentName, isSharedWallet } = useWalletStore();
  const { switchNetwork } = useWalletManager();
  const analytics = useAnalyticsContext();
  const { blockchain } = useCurrentBlockchain();

  const getNetworkName = useCallback(
    (chainName: Wallet.ChainName) => {
      switch (chainName) {
        case 'Mainnet':
          return t('general.networks.mainnet');
        case 'Preprod':
          return t('general.networks.preprod');
        case 'Preview':
          return t('general.networks.preview');
        case 'Sanchonet':
          return t('general.networks.sanchonet');
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
      logger.error('Error switching networks', error);
      toast.notify({ text: t('general.errors.somethingWentWrong'), icon: ErrorIcon });
    }
    return event;
  };

  const availableChains = isSharedWallet
    ? AVAILABLE_CHAINS.filter((chain) => posthog?.featureFlagsByNetwork[cardanoNetworkMap[chain]]['shared-wallets'])
    : AVAILABLE_CHAINS;

  return (
    <Radio.Group
      className={styles.radioGroup}
      onChange={handleNetworkChange}
      value={environmentName}
      data-testid={'network-choice-radio-group'}
    >
      {blockchain === Blockchain.Cardano ? (
        availableChains.map((network) => (
          <a className={styles.radio} key={network}>
            <Radio
              value={network}
              className={styles.radioLabel}
              data-testid={`network-${network.toLowerCase()}-radio-button`}
            >
              {getNetworkName(network as Wallet.ChainName)}
            </Radio>
          </a>
        ))
      ) : (
        <>
          <a className={styles.radio} key="Preprod">
            <Radio value="Preprod" className={styles.radioLabel} data-testid={'network-preprod-radio-button'}>
              Testnet4
            </Radio>
          </a>
          <a className={styles.radio} key="Mainnet">
            <Radio value="Mainnet" className={styles.radioLabel} data-testid={'network-mainnet-radio-button'}>
              Mainnet
            </Radio>
          </a>
        </>
      )}
    </Radio.Group>
  );
};
