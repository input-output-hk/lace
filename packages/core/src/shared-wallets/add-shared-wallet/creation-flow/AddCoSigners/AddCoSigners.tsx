import { Box, Divider } from '@input-output-hk/lace-ui-toolkit';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { SharedWalletLayout } from '../../SharedWalletLayout';
import { indexOfCoSignersDataOfCurrentUser } from '../co-signers-data-structure';
import { SharedWalletCreationStep } from '../state-and-types';
import { creationTimelineSteps } from '../timelineSteps';
import { AddCoSignerInput } from './AddCoSignerInput';
import styles from './AddCoSigners.module.scss';
import { CoSigner, CoSignerDirty, CoSignerError } from './type';

if (!process.env.MIN_NUMBER_OF_COSIGNERS) {
  throw new Error('MIN_NUMBER_OF_COSIGNERS not set');
}
const MIN_NUMBER_OF_COSIGNERS = Number.parseInt(process.env.MIN_NUMBER_OF_COSIGNERS);

interface Props {
  coSigners: CoSigner[];
  coSignersDirty: CoSignerDirty[];
  errors: CoSignerError[];
  onBack: () => void;
  onNext: () => void;
  onValueChange: (coSigners: CoSigner) => void;
}

export const AddCoSigners = ({
  onBack,
  onNext,
  onValueChange,
  coSigners,
  errors,
  coSignersDirty,
}: Props): JSX.Element => {
  const { t } = useTranslation();
  const hasAtLeastMinValidCoSigners =
    coSigners.filter((c) => c.sharedWalletKey && c.name).length >= MIN_NUMBER_OF_COSIGNERS && errors.length === 0;

  return (
    <SharedWalletLayout
      title={t('sharedWallets.addSharedWallet.addCosigners.title')}
      description={t('sharedWallets.addSharedWallet.addCosigners.subtitle')}
      timelineSteps={creationTimelineSteps}
      timelineCurrentStep={SharedWalletCreationStep.CoSigners}
      onBack={onBack}
      onNext={onNext}
      isNextEnabled={hasAtLeastMinValidCoSigners}
    >
      {coSigners.map((value, index) => (
        <Box key={value.id} className={styles.coSigners}>
          {index > 0 && <Divider my="$16" />}
          <AddCoSignerInput
            value={value}
            onChange={onValueChange}
            keyFieldDisabled={index === indexOfCoSignersDataOfCurrentUser}
            labels={{
              name: t(
                `sharedWallets.addSharedWallet.addCosigners.${
                  index === indexOfCoSignersDataOfCurrentUser ? 'yourNameInputLabel' : 'coSignerNameInputLabel'
                }`,
              ),
              sharedWalletKey: t(
                `sharedWallets.addSharedWallet.addCosigners.${
                  index === indexOfCoSignersDataOfCurrentUser ? 'yourKeysInputLabel' : 'coSignerKeysInputLabel'
                }`,
              ),
            }}
            dirty={coSignersDirty.find((dirty) => dirty.id === value.id)}
            error={errors.find((error) => error.id === value.id)}
          />
        </Box>
      ))}
    </SharedWalletLayout>
  );
};
