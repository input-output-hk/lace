import React from 'react';
import { Box } from '@lace/ui';
import styles from './AddCoSigners.module.scss';
import { AddCoSignerInput } from './AddCoSignerInput';
import { CoSigner, ValidateAddress } from './type';
import { useCoSigners } from './hooks';
import { WarningBanner } from '@lace/common';
import { SharedWalletLayout, SharedWalletTimelineSteps } from '../SharedWalletLayout/SharedWalletLayout';
import { useTranslation } from 'react-i18next';

interface Props {
  onBack: () => void;
  onNext: () => void;
  validateAddress: ValidateAddress;
  onValueChange?: (data: CoSigner[]) => void;
}

export const AddCoSigners = ({ validateAddress, onBack, onNext, onValueChange }: Props): JSX.Element => {
  const { coSigners, updateCoSigner } = useCoSigners();
  const { t } = useTranslation();

  const translations = {
    title: t('core.sharedWallet.addCosigners.title'),
    subtitle: t('core.sharedWallet.addCosigners.subtitle'),
    inputLabel: t('core.sharedWallet.addCosigners.inputLabel'),
    inputError: t('core.sharedWallet.addCosigners.inputError'),
    addButton: t('core.sharedWallet.addCosigners.addButton'),
    removeButton: t('core.sharedWallet.addCosigners.removeButton'),
    warningMessage: t('core.sharedWallet.addCosigners.warningMessage')
  };

  return (
    <SharedWalletLayout
      title={translations.title}
      description={translations.subtitle}
      currentTimelineStep={SharedWalletTimelineSteps.ADD_COSIGNERS}
      onBack={onBack}
      onNext={onNext}
      isNextEnabled={coSigners.some((coSigner) => !!coSigner.isValid)}
    >
      <Box mb="$24">
        <WarningBanner message={translations.warningMessage} />
      </Box>

      {coSigners.map(({ id }, index) => (
        <Box key={id} className={styles.coSigners}>
          <AddCoSignerInput
            validateAddress={validateAddress}
            translations={{
              label: translations.inputLabel,
              error: translations.inputError
            }}
            onChange={(address, isValid) => {
              updateCoSigner(index, { address, isValid, id });
              onValueChange(coSigners);
            }}
          />
        </Box>
      ))}
    </SharedWalletLayout>
  );
};
