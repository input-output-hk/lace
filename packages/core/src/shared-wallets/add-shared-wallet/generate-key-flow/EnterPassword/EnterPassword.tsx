import {
  HardwareWalletComponent as ColdWalletIcon,
  Flex,
  WalletComponent as HotWalletIcon,
  PasswordBox,
  Text,
} from '@input-output-hk/lace-ui-toolkit';
import cn from 'classnames';
import React, { ReactElement, VFC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SharedWalletLayout } from '../../SharedWalletLayout';
import { keyGenerationTimelineSteps } from '../timelineSteps';
import styles from './EnterPassword.module.scss';

export type WalletKind = 'hot' | 'cold';

const mapOfWalletTypeIconProperties: Record<WalletKind, ReactElement> = {
  cold: <ColdWalletIcon />,
  hot: <HotWalletIcon />,
};

type EnterPasswordProps = {
  loading?: boolean;
  onBack: () => void;
  onGenerateKeys: (password: string) => void;
  passwordErrorMessage?: string;
  walletKind: WalletKind;
  walletName: string;
};

export const EnterPassword: VFC<EnterPasswordProps> = ({
  loading,
  onBack,
  onGenerateKeys,
  passwordErrorMessage,
  walletKind: kind,
  walletName,
}) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const icon = mapOfWalletTypeIconProperties[kind];

  const next = async () => {
    onGenerateKeys(password);
    setPassword('');
  };

  return (
    <SharedWalletLayout
      title={t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.title')}
      description={t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.subtitle')}
      timelineSteps={keyGenerationTimelineSteps}
      timelineCurrentStep="enter-password"
      onBack={onBack}
      onNext={next}
      isLoading={loading}
      isNextEnabled={!!password}
      customNextLabel={t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.nextButtonLabel')}
    >
      <Flex gap="$32" flexDirection="column" alignItems="stretch">
        <Flex flexDirection="row" gap="$16" alignItems="center">
          <Flex
            alignItems="center"
            justifyContent="center"
            className={cn(styles.icon, {
              [styles.iconHot]: kind === 'hot',
              [styles.iconCold]: kind === 'cold',
            })}
          >
            {icon}
          </Flex>
          <Flex flexDirection="column">
            <Text.Address className={styles.walletNameLabel}>
              {t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.activeWalletLabel')}
            </Text.Address>
            <Text.Body.Large weight="$bold">{walletName}</Text.Body.Large>
          </Flex>
        </Flex>
        <PasswordBox
          value={password}
          label={t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.passwordInputLabel')}
          onChange={(event) => setPassword(event.target.value)}
          onSubmit={(event) => {
            event.preventDefault();
            void next();
          }}
          errorMessage={passwordErrorMessage}
        />
      </Flex>
    </SharedWalletLayout>
  );
};
