import { addEllipsis } from '@lace/common';
import { ProfileDropdown, Box, Text, FlowCard } from '@lace/ui';
import { useTranslation } from 'react-i18next';
/* eslint-disable sonarjs/no-identical-functions */
import React, { useMemo, useState } from 'react';
import { WalletNameInput } from '../../WalletSetup/WalletSetupNamePasswordStep/WalletNameInput';
import { WALLET_NAME_INPUT_MAX_LENGTH, validateNameLength } from '../../WalletSetup/WalletSetupNamePasswordStep/utils';
import { LayoutNavigationProps, SharedWalletLayout, SharedWalletTimelineSteps } from '../SharedWalletLayout';
import styles from './SetupSharedWallet.module.scss';

interface Props {
  activeWalletName: string;
  activeWalletAddress: string;
  onWalletNameChange: (name: string) => void;
  walletName: string;
}

const ADDRESS_FIRST_PART_LENGTH = 35;
const ADDRESS_LAST_PART_LENGTH = 0;

export const SetupSharedWallet = ({
  activeWalletName,
  activeWalletAddress,
  onBack,
  onNext,
  onWalletNameChange,
  walletName
}: Props & LayoutNavigationProps): JSX.Element => {
  const [walletNameDirty, setWalletNameDirty] = useState(false);
  const { t } = useTranslation();

  const translations = {
    title: t('core.sharedWallet.walletName.title'),
    subtitle: t('core.sharedWallet.walletName.subtitle'),
    body: t('core.sharedWallet.walletName.body'),
    nameMaxLengthErrorMessage: t('core.sharedWallet.walletName.errorMessage.maxLength'),
    nameRequiredMessageErrorMessage: t('core.sharedWallet.walletName.errorMessage.nameRequired')
  };

  const handleNameChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    setWalletNameDirty(true);
    onWalletNameChange(value);
  };

  const walletNameErrorMessage = useMemo(() => {
    if (!walletName && walletNameDirty) return translations.nameRequiredMessageErrorMessage;

    const valid = !validateNameLength(walletName);
    if (walletName && !valid) return translations.nameMaxLengthErrorMessage;

    return '';
  }, [
    translations.nameMaxLengthErrorMessage,
    translations.nameRequiredMessageErrorMessage,
    walletName,
    walletNameDirty
  ]);

  return (
    <SharedWalletLayout
      title={translations.title}
      description={translations.subtitle}
      onBack={onBack}
      onNext={onNext}
      isNextEnabled={!walletNameErrorMessage}
      currentTimelineStep={SharedWalletTimelineSteps.WALLET_NAME}
    >
      <WalletNameInput
        value={walletName}
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
    </SharedWalletLayout>
  );
};
