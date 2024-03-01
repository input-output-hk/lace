/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-array-for-each */
/* eslint-disable unicorn/no-new-array */
import React from 'react';
import { WalletSetupStepLayoutRevamp } from '../WalletSetupStepLayoutRevamp';
import { MnemonicWordsConfirmInputRevamp } from './MnemonicWordsConfirmInputRevamp';
import styles from './WalletSetupMnemonicVerificationStepRevamp.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { Segmented, Button } from 'antd';
import { readMnemonicFromClipboard } from './wallet-utils';
import { WalletTimelineSteps } from '@ui/components/WalletSetup';

export const hasEmptyString = (arr: string[]): boolean => arr.includes('');
const MNEMONIC_LENGTHS = [12, 15, 24];

export interface WalletSetupMnemonicVerificationStepProps {
  mnemonic: string[];
  onChange: (words: string[]) => void;
  onCancel: () => void;
  onSubmit: () => void;
  onStepNext?: (currentStep: number) => void;
  isSubmitEnabled: boolean;
  mnemonicWordsInStep?: number;
  translations: TranslationsFor<
    'enterPassphrase' | 'passphraseError' | 'enterPassphraseLength' | 'enterWallet' | 'pasteFromClipboard'
  >;
  suggestionList?: Array<string>;
  defaultMnemonicLength?: number;
  onSetMnemonicLength?: (length: number) => void;
}

export const WalletSetupMnemonicVerificationStepRevamp = ({
  mnemonic,
  onChange,
  onSubmit,
  onCancel,
  onSetMnemonicLength,
  defaultMnemonicLength = 24,
  isSubmitEnabled,
  translations,
  suggestionList
}: WalletSetupMnemonicVerificationStepProps): React.ReactElement => {
  const description = (
    <>
      {translations.enterPassphraseLength}
      <Segmented options={MNEMONIC_LENGTHS} defaultValue={defaultMnemonicLength} onChange={onSetMnemonicLength} />
    </>
  );

  const pasteRecoveryPhrase = async (offset = 0) => {
    const copiedWords = await readMnemonicFromClipboard(mnemonic.length);

    if (copiedWords.length === -1) return;

    const newMnemonic = [...mnemonic];

    copiedWords.forEach((word, index) => {
      const newIndex = offset + index;
      if (newIndex < newMnemonic.length) {
        newMnemonic[newIndex] = word;
      }
    });

    onChange(newMnemonic);
  };

  return (
    <WalletSetupStepLayoutRevamp
      title={translations.enterPassphrase}
      description={description}
      onBack={onCancel}
      onNext={onSubmit}
      customAction={
        <Button type="link" onClick={() => pasteRecoveryPhrase()}>
          {translations.pasteFromClipboard}
        </Button>
      }
      currentTimelineStep={WalletTimelineSteps.RECOVERY_PHRASE}
      nextLabel={translations.enterWallet}
      isNextEnabled={isSubmitEnabled}
    >
      <div className={styles.mnemonicContainer}>
        <MnemonicWordsConfirmInputRevamp
          handlePaste={pasteRecoveryPhrase}
          onChange={(stepWords) => {
            const newMnemonic = [...mnemonic];

            stepWords.forEach((word, index) => {
              newMnemonic[index] = word;
            });

            onChange(newMnemonic);
          }}
          words={mnemonic}
          suggestionList={suggestionList}
        />
      </div>
      {!isSubmitEnabled && !hasEmptyString(mnemonic) && (
        <div className={styles.errorMessage}>
          <span data-testid="passphrase-error">{translations.passphraseError}</span>
        </div>
      )}
    </WalletSetupStepLayoutRevamp>
  );
};
