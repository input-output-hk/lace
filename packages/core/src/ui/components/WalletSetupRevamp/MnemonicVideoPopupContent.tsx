import { Button } from '@lace/ui';
import { TranslationsFor } from '@ui/utils/types';
import { urls } from '@ui/utils/constants';
import React, { ReactNode, useRef, useState } from 'react';
import styles from './MnemonicVideoPopupContent.module.scss';

type MnemonicVideoPopupContentProps = {
  onClickVideo: () => void;
  onClose: () => void;
  translations: TranslationsFor<'title' | 'description' | 'linkText' | 'closeButton'>;
  videoSrc: string;
};

export const MnemonicVideoPopupContent = ({
  onClickVideo,
  onClose,
  translations,
  videoSrc
}: MnemonicVideoPopupContentProps): ReactNode => {
  const [overlayVisible, setOverlayVisible] = useState(true);
  const videoRef = useRef<HTMLIFrameElement>();

  return (
    <div className={styles.container}>
      <div className={styles.content} data-testid="wallet-setup-step-header">
        <h1 className={styles.title}>{translations.title}</h1>
        <p className={styles.description}>
          {translations.description}{' '}
          <a href={urls.faq.secretPassphrase} target="_blank" data-testid="faq-secret-passphrase-url">
            {translations.linkText}
          </a>
        </p>
        <div
          className={styles.videoContainer}
          onClick={() => {
            setOverlayVisible(false);
            videoRef.current.src += '&autoplay=1';
            onClickVideo();
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
      <Button.CallToAction label={translations.closeButton} onClick={onClose} />
    </div>
  );
};
