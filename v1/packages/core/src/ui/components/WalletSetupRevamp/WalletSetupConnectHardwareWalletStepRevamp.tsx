import { Banner, Loader } from '@lace/common';
import { TranslationsFor } from '@ui/utils/types';
import React from 'react';
import ExclamationCircleIcon from '../../assets/icons/exclamation-circle.svg';
import { WalletTimelineSteps } from '../WalletSetup';
import styles from './WalletSetupConnectHardwareWalletStepRevamp.module.scss';
import { WalletSetupStepLayoutRevamp } from './WalletSetupStepLayoutRevamp';

export interface WalletSetupConnectHardwareWalletStepProps {
  onBack: () => void;
  translations: TranslationsFor<'title' | 'subTitle' | 'errorMessage' | 'errorCta'>;
  state: 'loading' | 'error';
  onRetry?: () => void;
}

export const WalletSetupConnectHardwareWalletStepRevamp = ({
  onBack,
  translations,
  state,
  onRetry
}: WalletSetupConnectHardwareWalletStepProps): React.ReactElement => (
  <WalletSetupStepLayoutRevamp
    onBack={onBack}
    title={translations.title}
    description={translations.subTitle}
    currentTimelineStep={WalletTimelineSteps.CONNECT_WALLET}
    isHardwareWallet
    onNext={onRetry}
    nextLabel={translations.errorCta}
  >
    <div className={styles.wrapper}>
      {state === 'loading' && (
        <div className={styles.loader}>
          <Loader />
        </div>
      )}
      {state === 'error' && (
        <>
          <img
            src={ExclamationCircleIcon}
            className={styles.errorImage}
            alt="hardware wallet connection error image"
            data-testid="error-image"
          />
          <Banner message={translations.errorMessage} />
        </>
      )}
    </div>
  </WalletSetupStepLayoutRevamp>
);
