import { Box, Divider } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import { SharedWalletLayout, SharedWalletTimelineSteps } from '../SharedWalletLayout';
import { AddCoSignerInput } from './AddCoSignerInput';
import styles from './AddCoSigners.module.scss';
import { CoSigner, CoSignerDirty, CoSignerError } from './type';

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
  const atLeastOneValidCoSigner = coSigners.some((c) => c.keys && c.name) && errors.length === 0;

  return (
    <SharedWalletLayout
      title={t('sharedWallets.addSharedWallet.addCosigners.title')}
      description={t('sharedWallets.addSharedWallet.addCosigners.subtitle')}
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
            dirty={coSignersDirty.find((dirty) => dirty.id === value.id)}
            error={errors.find((error) => error.id === value.id)}
          />
        </Box>
      ))}
    </SharedWalletLayout>
  );
};
