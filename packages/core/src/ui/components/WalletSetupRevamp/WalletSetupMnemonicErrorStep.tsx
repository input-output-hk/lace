import React, { ReactElement } from 'react';
import { WalletTimelineSteps } from '@ui/components/WalletSetup';
import { WalletSetupStepLayoutRevamp } from './WalletSetupStepLayoutRevamp';
import { ListEmptyState } from '@ui/components/ListEmptyState';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { useTranslation } from 'react-i18next';

interface WalletSetupMnemonicErrorStepProps {
  onBack: () => void;
  onNext: () => void;
}

export const WalletSetupMnemonicErrorStep = ({ onBack, onNext }: WalletSetupMnemonicErrorStepProps): ReactElement => {
  const { t } = useTranslation();

  const renderDescription = () => (
    <Flex flexDirection="column" gap="$8" justifyContent="center" alignItems="center">
      <Text.Body.Large weight="$bold">{t('core.walletSetupReuseRecoveryPhrase.error')}</Text.Body.Large>
      <Text.Body.Normal>{t('core.walletSetupReuseRecoveryPhrase.supportedRecoveryPhrase')}</Text.Body.Normal>
      <Text.Body.Normal>{t('core.walletSetupReuseRecoveryPhrase.createNewRecoveryPhrase')}</Text.Body.Normal>
    </Flex>
  );

  return (
    <WalletSetupStepLayoutRevamp
      title=""
      onBack={onBack}
      onNext={onNext}
      nextLabel={t('core.walletSetupReuseRecoveryPhrase.createNewOne')}
      backLabel={t('core.walletSetupReuseRecoveryPhrase.selectAnotherWallet')}
      currentTimelineStep={WalletTimelineSteps.RECOVERY_DETAILS}
    >
      <ListEmptyState message={renderDescription()} icon="sad-face" />
    </WalletSetupStepLayoutRevamp>
  );
};
