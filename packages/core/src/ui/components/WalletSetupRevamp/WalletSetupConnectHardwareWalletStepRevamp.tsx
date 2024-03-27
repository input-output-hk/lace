import React, { useState } from 'react';
import { WalletTimelineSteps } from '../WalletSetup/WalletSetupStepLayout';
import styles from '../WalletSetup/WalletSetupConnectHardwareWalletStep.module.scss';
import Icon from '@ant-design/icons';
import { ReactComponent as LedgerLogo } from '../../assets/icons/ledger-wallet.component.svg';
import { ReactComponent as TrezorLogo } from '../../assets/icons/trezor-wallet.component.svg';
import { Typography } from 'antd';
import { TranslationsFor } from '@ui/utils/types';
import classnames from 'classnames';
import { WalletSetupStepLayoutRevamp } from './WalletSetupStepLayoutRevamp';

const { Text } = Typography;

const logoMap = {
  Ledger: LedgerLogo,
  Trezor: TrezorLogo
};

export interface WalletSetupConnectHardwareWalletStepRevampProps {
  wallets: string[];
  onBack: () => void;
  onNext: () => void;
  onConnect: (model: string) => Promise<void>;
  isNextEnable: boolean;
  translations: TranslationsFor<'title' | 'subTitle' | 'supportedDevices' | 'connectDevice'>;
  isHardwareWallet?: boolean;
}

export const WalletSetupConnectHardwareWalletStepRevamp = ({
  wallets,
  onBack,
  onNext,
  onConnect,
  isNextEnable,
  translations,
  isHardwareWallet = false
}: WalletSetupConnectHardwareWalletStepRevampProps): React.ReactElement => {
  const [walletModel, setWalletModel] = useState<string | null>();
  const [isConnecting, setIsConnecting] = useState(false);
  const isButtonActive = (model: string) => model === walletModel;

  const handleConnect = async (model: string) => {
    setIsConnecting(true);
    setWalletModel(model);
    try {
      await onConnect(model);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <WalletSetupStepLayoutRevamp
      onBack={onBack}
      onNext={onNext}
      title={translations.title}
      isNextEnabled={isNextEnable}
      isNextLoading={isConnecting}
      currentTimelineStep={WalletTimelineSteps.CONNECT_WALLET}
      isHardwareWallet={isHardwareWallet}
    >
      <Text className={styles.subTitle} data-testid="connect-hardware-wallet-subtitle">
        {translations.subTitle}
      </Text>
      <div className={styles.hdWalletsWrapper}>
        <div className={styles.hdWallets}>
          {wallets.map((wallet: string) => (
            <button
              key={wallet}
              onClick={() => handleConnect(wallet)}
              className={classnames({
                [styles.hdWallet]: true,
                [styles.hdWalletActive]: isButtonActive(wallet)
              })}
              data-testid={`connect-hardware-wallet-button-${wallet.toLowerCase()}`}
            >
              {wallet in logoMap ? (
                <Icon className={styles.logo} component={logoMap[wallet as keyof typeof logoMap]} />
              ) : (
                wallet
              )}
            </button>
          ))}
        </div>
        <Text className={styles.text} data-testid="connect-hardware-wallet-supported-devices-text">
          {translations.supportedDevices}
        </Text>
      </div>
      <Text className={styles.text} data-testid="connect-hardware-wallet-connect-device-text">
        {translations.connectDevice}
      </Text>
    </WalletSetupStepLayoutRevamp>
  );
};
