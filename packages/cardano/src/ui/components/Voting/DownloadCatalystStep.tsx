import { Button, QRCode } from '@lace/common';
import React from 'react';
import styles from './Voting.module.scss';
import AppStoreImage from '../../assets/images/app-store.png';
import GooglePlayImage from '../../assets/images/google-play.png';
import { TranslationsFor } from '@wallet/util/types';

export interface DownloadCatalystStepProps {
  onCancel: () => void;
  onNext: () => void;
  googlePlayUrl: string;
  appStoreUrl: string;
  translations: TranslationsFor<'cancelButton' | 'nextButton'>;
}

export const DownloadCatalystStep = ({
  onCancel,
  onNext,
  googlePlayUrl,
  appStoreUrl,
  translations
}: DownloadCatalystStepProps): React.ReactElement => (
  <div className={styles.stepContainer}>
    <h5>Download the Catalyst app</h5>
    <div className={styles.downloadContent}>
      <div className={styles.qrCodeContainer}>
        <QRCode data={appStoreUrl} />
      </div>
      <div className={styles.qrCodeContainer}>
        <QRCode data={googlePlayUrl} />
      </div>
      <img src={AppStoreImage} className={styles.market} />
      <img src={GooglePlayImage} className={styles.market} />
    </div>
    <div className={styles.footer}>
      <Button color="secondary" onClick={onCancel}>
        {translations.cancelButton}
      </Button>
      <Button onClick={onNext}>{translations.nextButton}</Button>
    </div>
  </div>
);
