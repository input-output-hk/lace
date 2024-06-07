import React from 'react';
import { Box, Divider } from '@lace/ui';
import styles from './AddCoSigners.module.scss';
import { AddCoSignerInput } from './AddCoSignerInput';
import { CoSigner, CoSignerError } from './type';
import { SharedWalletLayout, SharedWalletTimelineSteps } from '../SharedWalletLayout/SharedWalletLayout';
import { useTranslation } from 'react-i18next';

interface Props {
  onBack: () => void;
  onNext: () => void;
  onValueChange: (coSigners: CoSigner) => void;
  coSigners: CoSigner[];
  errors: CoSignerError[];
}

export const AddCoSigners = ({ onBack, onNext, onValueChange, coSigners, errors }: Props): JSX.Element => {
  const { t } = useTranslation();
  const atLeastOneValidCoSigner = coSigners.some((c) => c.keys && c.name) && errors.length === 0;

  return (
    <SharedWalletLayout
      title={t('core.sharedWallet.addCosigners.title')}
      description={t('core.sharedWallet.addCosigners.subtitle')}
      currentTimelineStep={SharedWalletTimelineSteps.ADD_COSIGNERS}
      onBack={onBack}
      onNext={onNext}
      isNextEnabled={atLeastOneValidCoSigner}
    >
      {coSigners.map((value, index) => (
        <Box key={value.id} className={styles.coSigners}>
          {index > 0 && <Divider my="$16" />}
          <AddCoSignerInput
            value={value}
            onChange={onValueChange}
            error={errors.find((error) => error.id === value.id)}
          />
        </Box>
      ))}
    </SharedWalletLayout>
  );
};
