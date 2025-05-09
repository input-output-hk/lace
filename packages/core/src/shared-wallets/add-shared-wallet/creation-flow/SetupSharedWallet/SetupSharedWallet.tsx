import { Box, FlowCard, ProfileDropdown, Text } from '@input-output-hk/lace-ui-toolkit';
import { addEllipsis } from '@lace/common';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WalletKind } from '../../generate-key-flow/EnterPassword';
import { LayoutNavigationProps, SharedWalletLayout } from '../../SharedWalletLayout';
import { SharedWalletCreationStep } from '../state-and-types';
import { creationTimelineSteps } from '../timelineSteps';
import styles from './SetupSharedWallet.module.scss';
import { WalletNameInput } from './WalletNameInput';

interface Props {
  activeWalletAddress: string;
  activeWalletName: string;
  onWalletNameChange: (name: string) => void;
  walletKind?: WalletKind;
  walletName: string;
}

type ValidationErrorKeys = 'nameMaxLength';
const nameShouldHaveRightLengthRegex = /^.{1,20}$/;
const validateNameLength = (name: string): ValidationErrorKeys | '' =>
  !nameShouldHaveRightLengthRegex.test(name) ? 'nameMaxLength' : '';

const WALLET_NAME_INPUT_MAX_LENGTH = 30;
const ADDRESS_FIRST_PART_LENGTH = 35;
const ADDRESS_LAST_PART_LENGTH = 0;

export const SetupSharedWallet = ({
  activeWalletName,
  activeWalletAddress,
  onBack,
  onNext,
  onWalletNameChange,
  walletName,
  walletKind = 'hot',
}: Props & LayoutNavigationProps): JSX.Element => {
  const [walletNameDirty, setWalletNameDirty] = useState(false);
  const { t } = useTranslation();

  const translations = {
    body: t('sharedWallets.addSharedWallet.setup.body'),
    inputLabel: t('sharedWallets.addSharedWallet.setup.inputLabel'),
    nameMaxLengthErrorMessage: t('sharedWallets.addSharedWallet.setup.errorMessage.maxLength'),
    nameRequiredMessageErrorMessage: t('sharedWallets.addSharedWallet.setup.errorMessage.nameRequired'),
    subtitle: t('sharedWallets.addSharedWallet.setup.subtitle'),
    title: t('sharedWallets.addSharedWallet.setup.title'),
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
    walletNameDirty,
  ]);

  return (
    <SharedWalletLayout
      title={translations.title}
      description={translations.subtitle}
      onBack={onBack}
      onNext={onNext}
      isNextEnabled={!walletNameErrorMessage}
      timelineSteps={creationTimelineSteps}
      timelineCurrentStep={SharedWalletCreationStep.Setup}
    >
      <WalletNameInput
        value={walletName}
        label={translations.inputLabel}
        onChange={handleNameChange}
        maxLength={WALLET_NAME_INPUT_MAX_LENGTH}
        shouldShowErrorMessage={Boolean(walletNameErrorMessage)}
        errorMessage={walletNameErrorMessage}
      />
      <Box mt="$12" mb="$20">
        <Text.Body.Normal weight="$semibold" data-testid="active-lace-wallet-notice">
          {translations.body}
        </Text.Body.Normal>
      </Box>
      <FlowCard.Card flowCardClassName={styles.walletCard ?? ''}>
        <FlowCard.Profile icon={<ProfileDropdown.WalletIcon type={walletKind} />} name={activeWalletName} />
        <FlowCard.Details
          subtitle={addEllipsis(activeWalletAddress, ADDRESS_FIRST_PART_LENGTH, ADDRESS_LAST_PART_LENGTH)}
        />
      </FlowCard.Card>
    </SharedWalletLayout>
  );
};
