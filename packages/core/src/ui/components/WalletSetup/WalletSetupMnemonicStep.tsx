import React, { useEffect, useMemo, useState } from 'react';
import { WalletSetupStepLayout, WalletTimelineSteps } from './WalletSetupStepLayout';
import { MnemonicWordsWritedown } from './MnemonicWordsWritedown';
import { MnemonicWordsConfirmInput } from './MnemonicWordsConfirmInput';
import styles from './WalletSetupOption.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { hasEmptyString } from '@ui/components/WalletSetup/WalletSetupMnemonicVerificationStep';
import { Wallet } from '@lace/cardano';
import { Button } from '@lace/common';
import { readMnemonicFromClipboard, writeMnemonicToClipboard } from './wallet-utils';

export type MnemonicStage = 'writedown' | 'input';

export interface WalletSetupMnemonicStepProps {
  mnemonic: string[];
  onReset: (mnemonicStage?: MnemonicStage) => void;
  onNext: () => void;
  onStepNext?: (currentStage: MnemonicStage, currentStep: number) => void;
  mnemonicWordsInStep?: number;
  translations: TranslationsFor<
    | 'writePassphrase'
    | 'enterPassphrase'
    | 'enterPassphraseDescription'
    | 'passphraseInfo1'
    | 'passphraseInfo2'
    | 'passphraseInfo3'
    | 'passphraseError'
    | 'enterWallet'
  >;
  suggestionList?: Array<string>;
  passphraseInfoLink?: string;
}

export const WalletSetupMnemonicStep = ({
  mnemonic,
  onReset,
  onNext,
  translations,
  suggestionList,
  passphraseInfoLink
}: WalletSetupMnemonicStepProps): React.ReactElement => {
  const initialMnemonicWordsConfirm = useMemo(() => mnemonic.map(() => ''), [mnemonic]);

  const [mnemonicStage, setMnemonicStage] = useState<MnemonicStage>('writedown');
  const [mnemonicConfirm, setMnemonicWordsConfirm] = useState(initialMnemonicWordsConfirm);

  // const [isWriting, setIsWriting] = useState(false);

  // reset the state on mnemonic change
  useEffect(() => {
    setMnemonicStage('writedown');
    setMnemonicWordsConfirm(initialMnemonicWordsConfirm);
  }, [initialMnemonicWordsConfirm, mnemonic]);

  const handleBack = () => {
    onReset(mnemonicStage);
  };

  const pasteRecoveryPhrase = async () => {
    const stepWords = await readMnemonicFromClipboard(mnemonic.length);

    if (stepWords.length === -1) return;
    // eslint-disable-next-line unicorn/no-new-array
    const newMnemonic: string[] = new Array(mnemonic.length).fill('');
    // eslint-disable-next-line unicorn/no-array-for-each
    stepWords.forEach((word, index) => {
      newMnemonic[index] = word;
    });

    setMnemonicWordsConfirm(newMnemonic);
  };

  const handleNext = () => {
    if (mnemonicStage === 'writedown') {
      setMnemonicStage('input');
      return;
    }

    onNext();
  };

  const isSubmitEnabled =
    mnemonicStage === 'writedown' ||
    Wallet.KeyManagement.util.validateMnemonic(Wallet.KeyManagement.util.joinMnemonicWords(mnemonicConfirm));

  const title = mnemonicStage === 'writedown' ? translations.writePassphrase : translations.enterPassphrase;
  const subtitle =
    mnemonicStage === 'writedown' ? (
      <>
        {translations.passphraseInfo1}
        <br />
        <b>{translations.passphraseInfo2}</b>
        <a href={passphraseInfoLink} target="_blank" className={styles.link} data-testid="find-out-more-link">
          {` ${translations.passphraseInfo3}`}
        </a>
      </>
    ) : (
      translations.enterPassphraseDescription
    );

  // const currentStageWords = mnemonicStage === 'writedown' ? mnemonic : mnemonicConfirm;
  // const currentStepWords = useMemo(
  //   () => currentStageWords.slice(currentStepFirstWordIndex, currentStepLastWordIndex),
  //   [currentStageWords, currentStepFirstWordIndex, currentStepLastWordIndex]
  // );

  return (
    <>
      <WalletSetupStepLayout
        title={title}
        description={subtitle}
        onBack={handleBack}
        onNext={handleNext}
        customAction={
          mnemonicStage === 'writedown' ? (
            <Button color="gradient-secondary" onClick={async () => await writeMnemonicToClipboard(mnemonic)}>
              Copy to clipboard
            </Button>
          ) : (
            <Button color="gradient-secondary" onClick={pasteRecoveryPhrase}>
              Paste from clipboard
            </Button>
          )
        }
        currentTimelineStep={WalletTimelineSteps.RECOVERY_PHRASE}
        nextLabel={translations.enterWallet}
        isNextEnabled={isSubmitEnabled}
      >
        {mnemonicStage === 'writedown' ? (
          <MnemonicWordsWritedown words={mnemonic} />
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
              // onDropdownVisibleChange={(open) => setIsWriting(open)}
              suggestionList={suggestionList}
            />
            {!isSubmitEnabled && !hasEmptyString(mnemonicConfirm) && (
              <div className={styles.errorMessage}>
                <span data-testid="passphrase-error">{translations.passphraseError}</span>
              </div>
            )}
          </div>
        )}
      </WalletSetupStepLayout>
    </>
  );
};
