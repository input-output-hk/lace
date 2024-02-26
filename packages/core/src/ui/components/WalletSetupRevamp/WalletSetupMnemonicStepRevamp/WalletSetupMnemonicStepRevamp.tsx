import React, { useEffect, useMemo, useState } from 'react';
import { WalletTimelineSteps } from '../../WalletSetup';
import { MnemonicWordsWritedownRevamp } from './MnemonicWordsWritedownRevamp';
import { MnemonicWordsConfirmInput } from '../../WalletSetup/MnemonicWordsConfirmInput';
import { WalletSetupStepLayoutRevamp } from '../WalletSetupStepLayoutRevamp';
import styles from '../../WalletSetup/WalletSetupOption.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { hasEmptyString } from '@ui/components/WalletSetup/WalletSetupMnemonicVerificationStep';
import { Dialog } from '@lace/ui';

export type MnemonicStage = 'writedown' | 'input';

export interface WalletSetupMnemonicStepProps {
  mnemonic: string[];
  onReset: (mnemonicStage?: MnemonicStage) => void;
  onNext: () => void;
  onStepNext?: (currentStage: MnemonicStage) => void;
  mnemonicWordsInStep?: number;
  translations: TranslationsFor<
    | 'writePassphraseTitle'
    | 'body'
    | 'enterPassphrase'
    | 'writePassphraseSubtitle1'
    | 'writePassphraseSubtitle2'
    | 'passphraseError'
  >;
  suggestionList?: Array<string>;
  passphraseInfoLink?: string;
  renderVideoPopupContent: (params: { onClose: () => void }) => React.ReactNode;
}

export const WalletSetupMnemonicStepRevamp = ({
  mnemonic,
  onReset,
  onNext,
  onStepNext,
  translations,
  suggestionList,
  renderVideoPopupContent
}: WalletSetupMnemonicStepProps): React.ReactElement => {
  const initialMnemonicWordsConfirm = useMemo(() => mnemonic.map(() => ''), [mnemonic]);
  const [mnemonicStage, setMnemonicStage] = useState<MnemonicStage>('writedown');
  const [mnemonicConfirm, setMnemonicWordsConfirm] = useState(initialMnemonicWordsConfirm);
  const [isWriting, setIsWriting] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // reset the state on mnemonic change
  useEffect(() => {
    setMnemonicStage('writedown');
    setMnemonicWordsConfirm(initialMnemonicWordsConfirm);
  }, [initialMnemonicWordsConfirm, mnemonic]);

  const handleBack = () => {
    onReset(mnemonicStage);
  };

  const handleNext = () => {
    if (onStepNext) onStepNext(mnemonicStage);
    if (mnemonicStage === 'input') {
      onNext();
      return;
    }
    setMnemonicStage('input');
  };

  const title = mnemonicStage === 'writedown' ? translations.writePassphraseTitle : translations.enterPassphrase;
  const subtitle =
    mnemonicStage === 'writedown' ? (
      <>
        {translations.writePassphraseSubtitle1}{' '}
        <span onClick={() => setVideoModalOpen(true)} className={styles.link} data-testid="find-out-more-link">
          {translations.writePassphraseSubtitle2}
        </span>
        <Dialog.Root open={videoModalOpen} setOpen={setVideoModalOpen}>
          {renderVideoPopupContent({ onClose: () => setVideoModalOpen(false) })}
        </Dialog.Root>
      </>
    ) : (
      translations.body
    );

  const isNextEnabled = useMemo(() => {
    if (mnemonicStage === 'writedown') return true;
    return mnemonic.every((word, index) => mnemonicConfirm[index] === word);
  }, [mnemonic, mnemonicStage, mnemonicConfirm]);

  return (
    <>
      <WalletSetupStepLayoutRevamp
        title={title}
        description={subtitle}
        onBack={handleBack}
        onNext={handleNext}
        isNextEnabled={isNextEnabled}
        currentTimelineStep={WalletTimelineSteps.RECOVERY_PHRASE}
      >
        {mnemonicStage === 'writedown' ? (
          <MnemonicWordsWritedownRevamp words={mnemonic} />
        ) : (
          <div className={styles.ContainerWordsConfirm}>
            <MnemonicWordsConfirmInput
              words={mnemonicConfirm}
              onChange={(stepWords) => {
                const newMnemonicWordsConfirm = [...mnemonicConfirm];

                // eslint-disable-next-line unicorn/no-array-for-each
                stepWords.forEach((word, index) => {
                  newMnemonicWordsConfirm[index] = word;
                });

                setMnemonicWordsConfirm(newMnemonicWordsConfirm);
              }}
              onDropdownVisibleChange={(open) => setIsWriting(open)}
              firstWordNumber={1}
              suggestionList={suggestionList}
            />
            {!isNextEnabled && !hasEmptyString(mnemonicConfirm) && !isWriting && (
              <div className={styles.errorMessage}>
                <span data-testid="passphrase-error">{translations.passphraseError}</span>
              </div>
            )}
          </div>
        )}
      </WalletSetupStepLayoutRevamp>
    </>
  );
};
