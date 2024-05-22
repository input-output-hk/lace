import { Button } from '@lace/ui';
import { TranslationsFor } from '@ui/utils/types';
import { urls } from '@ui/utils/constants';
import React, { ReactElement, useRef, useState } from 'react';
import styles from './MnemonicVideoPopupContent.module.scss';

type MnemonicVideoPopupContentProps = {
  onClose: () => void;
  translations: TranslationsFor<'title' | 'description' | 'linkText' | 'closeButton'>;
  videoSrc: string;
};

export const MnemonicVideoPopupContent = ({
  onClose,
  translations,
  videoSrc
}: MnemonicVideoPopupContentProps): ReactElement => {
  const [overlayVisible, setOverlayVisible] = useState(true);
  const videoRef = useRef<HTMLIFrameElement>();

  return (
    <div className={styles.container} data-testid="watch-video-container">
      <div className={styles.content} data-testid="wallet-setup-step-header">
        <h1 className={styles.title} data-testid="watch-video-title">
          {translations.title}
        </h1>
        <p className={styles.description} data-testid="watch-video-description">
          {translations.description}{' '}
          <a href={urls.faq.secretPassphrase} target="_blank" data-testid="read-more-link">
            {translations.linkText}
          </a>
        </p>
        <div
          className={styles.videoContainer}
          onClick={() => {
            setOverlayVisible(false);
            videoRef.current.src += '&autoplay=1';
          }}
        >
          {overlayVisible && <div className={styles.overlay} />}
          <iframe
            ref={videoRef}
            className={styles.video}
            src={videoSrc}
            title="YouTube video player"
            allow="accelerometer; fullscreen; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            data-testid="mnemonic-intro-yt-video-frame"
          />
        </div>
      </div>
      <Button.CallToAction label={translations.closeButton} onClick={onClose} data-testid="watch-video-got-it-button" />
    </div>
  );
};
