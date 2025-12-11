import React, { ReactElement } from 'react';
import { WalletSetupStepLayoutRevamp } from './WalletSetupStepLayoutRevamp';
import { WalletTimelineSteps } from '@ui/components/WalletSetup';
import { Box, PasswordBox, Text } from '@input-output-hk/lace-ui-toolkit';
import { useSecrets } from '@ui/hooks';
import { Trans, useTranslation } from 'react-i18next';

type WalletSetupConfirmPasswordStepProps = {
  walletName: string;
  errorMessage?: string;
  onBack: () => void;
  onNext: (password: string) => void;
};

export const WalletSetupEnterPasswordStep = ({
  walletName,
  errorMessage,
  onNext,
  onBack
}: WalletSetupConfirmPasswordStepProps): ReactElement => {
  const { password, setPassword, clearSecrets } = useSecrets();
  const { t } = useTranslation();

  const renderDescription = () => (
    <Text.Body.Normal>
      <Trans
        i18nKey="core.walletSetupReuseRecoveryPhrase.confirmPasswordDescription"
        values={{ walletName }}
        components={{ b: <b /> }}
      />
    </Text.Body.Normal>
  );

  const handleOnNext = () => {
    if (!password.value) return;
    onNext(password.value);
    clearSecrets();
  };

  return (
    <WalletSetupStepLayoutRevamp
      title={t('core.walletSetupReuseRecoveryPhrase.confirmPassword')}
      description={renderDescription()}
      onBack={onBack}
      onNext={handleOnNext}
      nextLabel={t('core.walletSetupReuseRecoveryPhrase.confirm')}
      currentTimelineStep={WalletTimelineSteps.RECOVERY_DETAILS}
      isNextEnabled={!!password.value}
    >
      <Box mt="$96" mb="$16">
        <Text.Body.Normal>{t('core.walletSetupReuseRecoveryPhrase.password')}</Text.Body.Normal>
      </Box>
      <PasswordBox
        label={t('core.walletSetupReuseRecoveryPhrase.insertPassword')}
        onSubmit={() => handleOnNext()}
        onChange={(target) => setPassword(target)}
        testId="wallet-setup-enter-password-input"
        errorMessage={errorMessage}
        autoFocus
      />
    </WalletSetupStepLayoutRevamp>
  );
};
