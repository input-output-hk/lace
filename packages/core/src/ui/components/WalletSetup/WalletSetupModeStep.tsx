import React, { useState } from 'react';
import classnames from 'classnames';
import { TranslationsFor } from '@ui/utils/types';
import { Button } from '@lace/common';

import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import styles from './WalletSetupModeStep.module.scss';

import { ReactComponent as LightIcon } from '../../assets/icons/light.component.svg';
import { ReactComponent as NodeIcon } from '../../assets/icons/node.component.svg';
import WalletMockup from '../../assets/images/wallet-placeholder.svg';

export interface WalletSetupModeStepProps {
  onBack: () => void;
  onNext: () => void;
  translations: TranslationsFor<
    | 'title'
    | 'modes'
    | 'instructions'
    | 'lightWalletOption'
    | 'fullNodeOption'
    | 'lightWalletDescription'
    | 'fullNodeWalletDescription'
  >;
}

enum Mode {
  LightWallet = 'light-wallet',
  FullNode = 'full-node'
}

export const WalletSetupModeStep = ({ onBack, onNext, translations }: WalletSetupModeStepProps): React.ReactElement => {
  const [modeSelected, setModeSelected] = useState<Mode>(Mode.LightWallet);
  const [isSelectionScreen, setIsSelectionScreen] = useState<boolean>(false);

  const onModeSelected = (mode: Mode) => setModeSelected(mode);

  const goBack = () => {
    if (isSelectionScreen) {
      setIsSelectionScreen(false);
    } else {
      onBack();
    }
  };

  const goForward = () => {
    if (isSelectionScreen) {
      onNext();
    } else {
      setIsSelectionScreen(true);
    }
  };

  return (
    <WalletSetupStepLayout
      title={isSelectionScreen ? translations.title : translations.modes}
      onBack={goBack}
      onNext={goForward}
      isNextEnabled={!isSelectionScreen || Boolean(modeSelected)}
      // TODO: review step if this gets brought back
      currentTimelineStep={WalletTimelineSteps.WALLET_SETUP}
    >
      <div
        className={classnames(styles.walletSetupModeStep, !isSelectionScreen && styles.fullHeight)}
        data-testid="wallet-setup-mode-text"
      >
        {isSelectionScreen ? (
          <>
            <p className={styles.walletSetupModeText}>{translations.instructions}</p>
            <Button
              color={modeSelected === Mode.LightWallet ? 'gradient' : 'secondary'}
              variant="outlined"
              onClick={() => onModeSelected(Mode.LightWallet)}
              className={styles.walletSetupModeOption}
            >
              <LightIcon width={40} height={40} />
              <div className={styles.walletSetupModeText}>
                <p className={styles.title}>{translations.lightWalletOption}</p>
                <p>{translations.lightWalletDescription}</p>
              </div>
            </Button>
            <Button
              color={modeSelected === Mode.FullNode ? 'gradient' : 'secondary'}
              variant="outlined"
              disabled
              onClick={() => onModeSelected(Mode.FullNode)}
              className={styles.walletSetupModeOption}
            >
              <NodeIcon width={40} height={40} />
              <div className={styles.walletSetupModeText}>
                <p className={styles.title}>{translations.fullNodeOption} (coming soon)</p>
                <p>{translations.fullNodeWalletDescription}</p>
              </div>
            </Button>
          </>
        ) : (
          <>
            <p className={styles.walletSetupModeText}>
              Augue blandit mattis turpis amet, lorem amet cum. Dui mauris fringilla risus lectus vivamus amet, lectus.
              Morbi porttitor vitae auctor proin consequat vitae donec convallis dignissim. Felis risus nibh lectus
              sapien at arcu aliquam.
            </p>
            <img src={WalletMockup} alt="choose-wallet" />
          </>
        )}
      </div>
    </WalletSetupStepLayout>
  );
};
