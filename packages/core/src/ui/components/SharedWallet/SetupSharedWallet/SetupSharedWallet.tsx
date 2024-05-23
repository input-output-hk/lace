/* eslint-disable sonarjs/no-identical-functions */
import React, { useMemo, useState } from 'react';
import { SharedWalletStepLayout, SharedWalletTimelineSteps } from '../SharedWalletLayout/SharedWalletLayout';
import { WalletNameInput } from '../../WalletSetup/WalletSetupNamePasswordStep/WalletNameInput';
import { WALLET_NAME_INPUT_MAX_LENGTH, validateNameLength } from '../../WalletSetup/WalletSetupNamePasswordStep/utils';
import { ProfileDropdown, Box, Text, FlowCard } from '@lace/ui';
import { addEllipsis } from '@lace/common';
import styles from './SetupSharedWallet.module.scss';
import { useTranslation } from 'react-i18next';

interface Props {
  activeWalletName: string;
  activeWalletAddress: string;
  onBack?: () => void;
  onNext?: () => void;
  onNameChange: (name: string) => void;
}

const ADDRESS_FIRST_PART_LENGTH = 35;
const ADDRESS_LAST_PART_LENGTH = 0;

export const SetupSharedWallet = ({
  activeWalletName,
  activeWalletAddress,
  onBack,
  onNext,
  onNameChange
}: Props): JSX.Element => {
  const [sharedWalletName, setSharedWalletName] = useState('');
  const { t } = useTranslation();

  const translations = {
    title: t('core.sharedWallet.walletName.title'),
    subtitle: t('core.sharedWallet.walletName.subtitle'),
    body: t('core.sharedWallet.walletName.body'),
    nameMaxLength: t('core.walletNameAndPasswordSetupStep.nameMaxLength'),
    nameRequiredMessage: t('core.walletNameAndPasswordSetupStep.nameRequiredMessage')
  };

  const handleNameChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setSharedWalletName(value);
    onNameChange(value);
  };

  const walletNameErrorMessage = useMemo(() => {
    const validationError = validateNameLength(sharedWalletName) ? translations.nameMaxLength : '';
    return sharedWalletName ? validationError : translations.nameRequiredMessage;
  }, [sharedWalletName, translations.nameMaxLength, translations.nameRequiredMessage]);

  return (
    <SharedWalletStepLayout
      title={translations.title}
      description={translations.subtitle}
      onBack={onBack}
      onNext={onNext}
      isNextEnabled={Boolean(!walletNameErrorMessage)}
      currentTimelineStep={SharedWalletTimelineSteps.WALLET_NAME}
    >
      <WalletNameInput
        value={sharedWalletName}
        label="Shared wallet name"
        onChange={handleNameChange}
        maxLength={WALLET_NAME_INPUT_MAX_LENGTH}
        shouldShowErrorMessage={Boolean(walletNameErrorMessage)}
        errorMessage={walletNameErrorMessage}
      />
      <Box mt="$12" mb="$20">
        <Text.Body.Normal weight="$semibold">{translations.body}</Text.Body.Normal>
      </Box>
      <FlowCard.Card flowCardClassName={styles.walletCard}>
        <FlowCard.Profile icon={<ProfileDropdown.WalletIcon type="hot" />} name={activeWalletName} />
        <FlowCard.Details
          subtitle={addEllipsis(activeWalletAddress, ADDRESS_FIRST_PART_LENGTH, ADDRESS_LAST_PART_LENGTH)}
        />
      </FlowCard.Card>
    </SharedWalletStepLayout>
  );
};
