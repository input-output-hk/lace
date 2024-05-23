/* eslint-disable sonarjs/no-identical-functions */
import React, { useState } from 'react';
import { SharedWalletStepLayout, SharedWalletTimelineSteps } from '../SharedWalletLayout/SharedWalletLayout';
import { WalletNameInput } from '../../WalletSetup/WalletSetupNamePasswordStep/WalletNameInput';
import { WALLET_NAME_INPUT_MAX_LENGTH } from '../../WalletSetup/WalletSetupNamePasswordStep/utils';
import { ProfileDropdown, Box, Text, FlowCard } from '@lace/ui';
import { addEllipsis } from '@lace/common';
import styles from './SetupSharedWallet.module.scss';
import { useTranslation } from 'react-i18next';

interface Props {
  walletName: string;
  activeWalletName: string;
  activeWalletAddress: string;
  onBack?: () => void;
  onNext?: () => void;
  onNameChange: (name: string) => void;
}

const ADDRESS_FIRST_PART_LENGTH = 35;
const ADDRESS_LAST_PART_LENGTH = 0;

export const SetupSharedWallet = ({
  walletName,
  activeWalletName,
  activeWalletAddress,
  onBack,
  onNext,
  onNameChange
}: Props): JSX.Element => {
  const [shouldShowNameErrorMessage, setShouldShowNameErrorMessage] = useState(false);
  const { t } = useTranslation();

  const translations = {
    title: t('core.sharedWallet.walletName.title'),
    subtitle: t('core.sharedWallet.walletName.subtitle'),
    body: t('core.sharedWallet.walletName.body')
  };

  const handleNameChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setShouldShowNameErrorMessage(true);
    onNameChange(value);
  };

  return (
    <SharedWalletStepLayout
      title={translations.title}
      description={translations.subtitle}
      onBack={onBack}
      onNext={onNext}
      isNextEnabled={!!walletName && !shouldShowNameErrorMessage}
      currentTimelineStep={SharedWalletTimelineSteps.WALLET_NAME}
    >
      <WalletNameInput
        value={walletName}
        label="Shared wallet name"
        onChange={handleNameChange}
        maxLength={WALLET_NAME_INPUT_MAX_LENGTH}
        shouldShowErrorMessage={shouldShowNameErrorMessage}
      />
      <Box mt="$40" mb="$20">
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
