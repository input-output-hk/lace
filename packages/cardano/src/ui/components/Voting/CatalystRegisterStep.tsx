import { Button } from '@lace/common';
import React from 'react';
import styles from './Voting.module.scss';
import RegistrationImage from '../../assets/images/catalyst-app-registration.png';
import { TranslationsFor } from '@wallet/util/types';

export interface CatalystRegisterStepProps {
  onCancel: () => void;
  onNext: () => void;
  translations: TranslationsFor<'registerNow' | 'cancelButton' | 'nextButton'>;
}

export const CatalystRegisterStep = ({
  onCancel,
  onNext,
  translations
}: CatalystRegisterStepProps): React.ReactElement => (
  <div className={styles.stepContainer}>
    <h5>{translations.registerNow}</h5>
    <img className={styles.registrationImage} src={RegistrationImage} />
    <div className={styles.footer}>
      <Button color="secondary" onClick={onCancel}>
        {translations.cancelButton}
      </Button>
      <Button onClick={onNext}>{translations.nextButton}</Button>
    </div>
  </div>
);
