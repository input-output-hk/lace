import { Loader } from '@lace/common';
import { TranslationsFor } from '@ui/utils/types';
import React from 'react';
import styles from './WalletSetupHWCreationStep.module.scss';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';

type WalletSetupCreationStepProps = {
  translations: TranslationsFor<'title' | 'description'>;
};

export const WalletSetupHWCreationStep = ({ translations }: WalletSetupCreationStepProps): React.ReactElement => (
  <WalletSetupStepLayout
    isHardwareWallet
    title={translations.title}
    description={translations.description}
    currentTimelineStep={WalletTimelineSteps.ALL_DONE}
  >
    <div className={styles.walletCreationStep} data-testid="wallet-create-loader">
      <div className={styles.loader}>
        <Loader />
      </div>
    </div>
  </WalletSetupStepLayout>
);
