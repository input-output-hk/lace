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

const { AVAILABLE_CHAINS } = config();

export const NetworkChoice = (): React.ReactElement => {
  const { t } = useTranslation();
  const { environmentName } = useWalletStore();
  const { switchNetwork } = useWalletManager();

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
    } catch (error) {
      console.log('Error switching networks', error);
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
