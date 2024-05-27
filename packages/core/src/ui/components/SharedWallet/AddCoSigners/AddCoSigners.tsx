import React from 'react';
import { Box, Flex, Text, ControlButton, sx } from '@lace/ui';
import styles from './AddCoSigners.module.scss';
import { AddCoSignerInput } from './AddCoSignerInput';
import { CoSigner, ValidateAddress } from './type';
import { useCoSigners } from './hooks';
import { WarningBanner } from '@lace/common';
import { SharedWalletStepLayout, SharedWalletTimelineSteps } from '../SharedWalletLayout/SharedWalletLayout';
import { useTranslation } from 'react-i18next';

interface Props {
  onBack: () => void;
  onNext: () => void;
  validateAddress: ValidateAddress;
  onValueChange?: (data: CoSigner[]) => void;
}

const MAX_COSIGNERS = 2;

// this should be removed when extending this implementation beyond 2 cosigners
const SHOW_ADD_COSIGNER_BUTTON = false;

export const AddCoSigners = ({ validateAddress, onBack, onNext, onValueChange }: Props): JSX.Element => {
  const { coSigners, updateCoSigner, removeCoSigner, addCoSigner } = useCoSigners();
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
    <SharedWalletStepLayout
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
          {index !== 0 && SHOW_ADD_COSIGNER_BUTTON && (
            <button
              tabIndex={0}
              className={styles.remove}
              onClick={() => {
                removeCoSigner(index);
              }}
            >
              <Text.Body.Small weight="$semibold" className={styles.removeLabel}>
                {translations.removeButton}
              </Text.Body.Small>
            </button>
          )}
        </Box>
      ))}

      {coSigners.length > 1 && SHOW_ADD_COSIGNER_BUTTON && (
        <Flex w="$fill" mb="$8" justifyContent="flex-end">
          <Text.Body.Small
            weight="$bold"
            className={sx({
              color: '$text_secondary'
            })}
          >
            {coSigners.length}/{MAX_COSIGNERS}
          </Text.Body.Small>
        </Flex>
      )}
      {SHOW_ADD_COSIGNER_BUTTON && (
        <Box w="$fill" mb="$40">
          <ControlButton.Outlined
            w="$fill"
            disabled={coSigners.length === MAX_COSIGNERS}
            label={translations.addButton}
            onClick={() => addCoSigner()}
          />
        </Box>
      )}
    </SharedWalletStepLayout>
  );
};
