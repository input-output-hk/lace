import { Loader } from '@lace/common';
import { TranslationsFor } from '@ui/utils/types';
import React from 'react';
import { WalletTimelineSteps } from '../WalletSetup';
import styles from './WalletSetupHWCreationStep.module.scss';
import { WalletSetupStepLayoutRevamp } from './WalletSetupStepLayoutRevamp';

type WalletSetupCreationStepProps = {
  translations: TranslationsFor<'title' | 'description'>;
};

export const WalletSetupHWCreationStep = ({ translations }: WalletSetupCreationStepProps): React.ReactElement => (
  <WalletSetupStepLayoutRevamp
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
  </WalletSetupStepLayoutRevamp>
);
