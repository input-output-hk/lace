import React, { useRef, useState } from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import { TranslationsFor } from '@ui/utils/types';
import styles from './WalletSetupOption.module.scss';

export interface WalletSetupMnemonicIntroStepProps {
  onBack: () => void;
  onNext: () => void;
  onClickVideo?: () => void;
  videoSrc?: string;
  translations: TranslationsFor<'title' | 'description' | 'linkText'>;
}

export const WalletSetupMnemonicIntroStep = ({
  onBack,
  onNext,
  onClickVideo,
  videoSrc,
  translations
}: WalletSetupMnemonicIntroStepProps): React.ReactElement => {
  const [overlayVisible, setOverlayVisible] = useState(true);
  const videoRef = useRef<HTMLIFrameElement>();

  return (
    <WalletSetupStepLayout
      title={translations.title}
      description={translations.description}
      linkText={translations.linkText}
      onBack={onBack}
      onNext={onNext}
      currentTimelineStep={WalletTimelineSteps.RECOVERY_PHRASE}
    >
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
        />
      </div>
    </WalletSetupStepLayout>
  );
};
