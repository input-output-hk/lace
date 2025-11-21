import React from 'react';
import styles from './PinCodeInput.module.scss';

export interface HiddenPinCodePreviewProps {
  length: number;
}

export const HiddenPinCodePreview = ({ length }: HiddenPinCodePreviewProps): React.ReactElement => (
  <div className={styles.pinCodeContainer}>
    {Array.from({ length }).map((_, index) => (
      <div key={index} className={styles.pinCodePartPreview}>
        <div className={styles.dot} />
      </div>
    ))}
  </div>
);
