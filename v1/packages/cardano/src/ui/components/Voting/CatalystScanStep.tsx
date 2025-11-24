import React, { useEffect, useRef } from 'react';
import { Button } from '@lace/common';
import { DownloadOutlined } from '@ant-design/icons';
import QRCodeStyling from 'qr-code-styling';
import styles from './Voting.module.scss';
import { TranslationsFor } from '@wallet/util/types';

export interface CatalystScanStepProps {
  onSubmit: () => void;
  certificate: string;
  translations: TranslationsFor<'header' | 'body1' | 'body2' | 'downloadButton' | 'doneButton'>;
}

export const CatalystScanStep = ({
  onSubmit,
  certificate,
  translations
}: CatalystScanStepProps): React.ReactElement => {
  const qrCodeRef = useRef<HTMLDivElement | null>(null);
  const qrCode = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    qrCode.current = new QRCodeStyling({ data: certificate, width: 240, height: 240 });
    qrCode.current.append(qrCodeRef.current || undefined);
  }, [certificate]);

  return (
    <div className={styles.stepContainer}>
      <div className={styles.scanContent}>
        <h5>{translations.header}</h5>
        <p>{translations.body1}</p>
        <p className={styles.attention}>{translations.body2}</p>
        <div className={styles.qrCode}>
          <div ref={qrCodeRef} />
          <div>
            <Button
              onClick={() => qrCode.current?.download({ name: 'certificate', extension: 'png' })}
              color="secondary"
            >
              <DownloadOutlined /> {translations.downloadButton}
            </Button>
          </div>
        </div>
      </div>
      <div className={styles.scanFooter}>
        <Button onClick={onSubmit}>{translations.doneButton}</Button>
      </div>
    </div>
  );
};
