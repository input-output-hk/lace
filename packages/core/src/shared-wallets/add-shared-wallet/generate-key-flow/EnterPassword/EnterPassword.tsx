import {
  HardwareWalletComponent as ColdWalletIcon,
  Flex,
  WalletComponent as HotWalletIcon,
  PasswordBox,
  Text,
} from '@input-output-hk/lace-ui-toolkit';
import { Banner, logger, useAutoFocus } from '@lace/common';
import { CoreTranslationKey, SharedWalletsTranslationKey } from '@lace/translation';
import { useSecrets } from '@src/ui/hooks';
import cn from 'classnames';
import React, { ReactElement, VFC } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { LinkedWalletType } from '@src/shared-wallets/types';
import { ConnectionError } from '@src/ui/utils';
import ExclamationCircleIcon from '../../../../ui/assets/icons/exclamation-circle.svg';
import { SharedWalletLayout } from '../../SharedWalletLayout';
import { keyGenerationHWTimelineSteps, keyGenerationTimelineSteps } from '../timelineSteps';
import styles from './EnterPassword.module.scss';

const inputId = `id-${uuidv4()}`;

export type WalletKind = 'hot' | 'cold';

export type PasswordErrorType = 'invalid-password' | 'generic' | ConnectionError;

const errorsMap: Record<PasswordErrorType, CoreTranslationKey | SharedWalletsTranslationKey> = {
  cardanoAppNotOpen: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.cardanoAppNotOpen',
  deviceBusy: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.deviceBusy',
  deviceLocked: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.deviceLocked',
  devicePickerRejected: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.devicePickerRejected',
  generic: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.generic',
  'invalid-password': 'sharedWallets.addSharedWallet.keyGeneration.enterPassword.passwordErrorMessage.invalidPassword',
  unauthorizedTx:
    'sharedWallets.addSharedWallet.keyGeneration.hw.enterPassword.passwordErrorMessage.unauthorizedTransaction',
  userGestureRequired: 'core.walletSetupConnectHardwareWalletStepRevamp.errorMessage.userGestureRequired',
};

const mapOfWalletTypeIconProperties: Record<WalletKind, ReactElement> = {
  cold: <ColdWalletIcon data-testid="cold-wallet-icon" />,
  hot: <HotWalletIcon data-testid="hot-wallet-icon" />,
};

type EnterPasswordProps = {
  loading?: boolean;
  onBack: () => void;
  onGenerateKeys: (password?: string) => void;
  passwordErrorType?: PasswordErrorType;
  walletKind: WalletKind;
  walletName: string;
  walletType: LinkedWalletType;
};

export const EnterPassword: VFC<EnterPasswordProps> = ({
  loading,
  onBack,
  onGenerateKeys,
  passwordErrorType,
  walletKind: kind,
  walletName,
  walletType,
}) => {
  const { t } = useTranslation();
  const { password, setPassword, clearSecrets } = useSecrets();
  const icon = mapOfWalletTypeIconProperties[kind];

  const isHW = kind === 'cold';
  const next = () => {
    if (!isHW && !password.value) {
      logger.error('Password is undefined');
      return;
    }

    onGenerateKeys(password.value);
    clearSecrets();
  };

  const passwordErrorMessage = passwordErrorType && t(errorsMap[passwordErrorType]);

  useAutoFocus(inputId, true);

  const description = isHW
    ? t('sharedWallets.addSharedWallet.keyGeneration.hw.enterPassword.subtitle', { device: walletType })
    : t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.subtitle');

  return (
    <SharedWalletLayout
      title={t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.title')}
      description={description}
      timelineSteps={isHW ? keyGenerationHWTimelineSteps : keyGenerationTimelineSteps}
      timelineCurrentStep="enter-password"
      onBack={onBack}
      onNext={next}
      isLoading={loading}
      isNextEnabled={isHW || !!password.value}
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
            <Text.Address color="secondary" data-testid="wallet-type">
              {t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.activeWalletLabel')}
            </Text.Address>
            <Text.Body.Large weight="$bold" data-testid="wallet-name">
              {walletName}
            </Text.Body.Large>
          </Flex>
        </Flex>
        {!isHW && (
          <PasswordBox
            disabled={loading}
            label={t('sharedWallets.addSharedWallet.keyGeneration.enterPassword.passwordInputLabel')}
            onChange={setPassword}
            onSubmit={(event) => {
              event.preventDefault();
              next();
            }}
            errorMessage={passwordErrorMessage}
            id={inputId}
            autoFocus
          />
        )}
        {!!(isHW && passwordErrorMessage) && (
          <Flex flexDirection="column" gap="$16" alignItems="center">
            <img
              src={ExclamationCircleIcon}
              className={styles.errorImage}
              alt="hardware wallet connection error"
              data-testid="error-image"
            />
            <Banner message={passwordErrorMessage} />
          </Flex>
        )}
      </Flex>
    </SharedWalletLayout>
  );
};
