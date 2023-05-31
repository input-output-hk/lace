/* eslint-disable no-magic-numbers */
import React from 'react';
import cn from 'classnames';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import { TranslationsFor } from '@ui/utils/types';
import styles from './WalletSetupFinalStep.module.scss';
import { Loader } from '@lace/common';

type TranslationKeys = 'title' | 'description';
export interface WalletSetupCreationStepProps {
  translations: TranslationsFor<TranslationKeys>;
  isHardwareWallet?: boolean;
}
export const WalletSetupCreationStep = ({
  translations,
  isHardwareWallet = false
}: WalletSetupCreationStepProps): React.ReactElement => (
  <WalletSetupStepLayout
    title={translations.title}
    description={translations.description}
    currentTimelineStep={isHardwareWallet ? WalletTimelineSteps.NAME_WALLET : WalletTimelineSteps.RECOVERY_PHRASE}
    isHardwareWallet={isHardwareWallet}
  >
    <div className={cn(styles.walletSetupFinalStep, styles.walletCreationStep)} data-testid="wallet-create-loader">
      <Loader />
    </div>
  </WalletSetupStepLayout>
);
