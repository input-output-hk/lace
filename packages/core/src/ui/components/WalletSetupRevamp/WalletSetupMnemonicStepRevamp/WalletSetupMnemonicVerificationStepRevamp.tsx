/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-array-for-each */
/* eslint-disable unicorn/no-new-array */
import React, { useCallback } from 'react';
import { WalletSetupStepLayoutRevamp } from '../WalletSetupStepLayoutRevamp';
import { MnemonicWordsConfirmInputRevamp } from './MnemonicWordsConfirmInputRevamp';
import styles from './WalletSetupMnemonicVerificationStepRevamp.module.scss';
import './WalletSetupMnemonicRevampCommon.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { Segmented, Button, Tooltip } from 'antd';
import { readMnemonicFromClipboard } from './wallet-utils';
import { WalletTimelineSteps } from '@ui/components/WalletSetup';
import { ReactComponent as PasteIcon } from '../../../assets/icons/purple-paste.component.svg';
import { useKeyboardShortcut } from '@lace/common';

export const hasEmptyString = (arr: string[]): boolean => arr.includes('');
const MNEMONIC_LENGTHS = [12, 15, 24] as const;
export type RecoveryPhraseLength = typeof MNEMONIC_LENGTHS[number];

export interface WalletSetupMnemonicVerificationStepProps {
  mnemonic: string[];
  onChange: (words: string[]) => void;
  onSubmit: (event?: Readonly<React.MouseEvent<HTMLButtonElement>>) => void;
  isSubmitEnabled: boolean;
  mnemonicWordsInStep?: number;
  translations: TranslationsFor<{
    jsxElementKey: 'copyPasteTooltipText';
    stringKey: 'enterPassphrase' | 'passphraseError' | 'enterPassphraseLength' | 'pasteFromClipboard';
  }>;
  onCancel?: () => void;
  suggestionList?: Array<string>;
  defaultMnemonicLength?: number;
  onSetMnemonicLength?: (length: RecoveryPhraseLength) => void;
  onPasteFromClipboard?: () => void;
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
  suggestionList,
  onPasteFromClipboard
}: WalletSetupMnemonicVerificationStepProps): React.ReactElement => {
  const description = (
    <>
      {translations.enterPassphraseLength}
      <Segmented
        options={MNEMONIC_LENGTHS.map((value) => ({
          label: <span data-testid={`recovery-phrase-${value}`}>{value}</span>,
          value
        }))}
        defaultValue={defaultMnemonicLength}
        onChange={onSetMnemonicLength}
      />
    </>
  );

  const pasteRecoveryPhrase = useCallback(
    async (offset = 0) => {
      const copiedWords = await readMnemonicFromClipboard(mnemonic.length);

      if (copiedWords.length === 0) return;

      const newMnemonic = [...mnemonic];

      copiedWords.forEach((word, index) => {
        const newIndex = offset + index;
        if (newIndex < newMnemonic.length) {
          newMnemonic[newIndex] = word;
        }
      });

      onChange(newMnemonic);
      onPasteFromClipboard?.();
    },
    [mnemonic, onChange, onPasteFromClipboard]
  );

  useKeyboardShortcut((event) => {
    if ((!event.ctrlKey && !event.metaKey) || event.key !== 'v') return;
    void pasteRecoveryPhrase();
  });

  return (
    <WalletSetupStepLayoutRevamp
      title={translations.enterPassphrase}
      description={description}
      onBack={onCancel}
      onNext={onSubmit}
      customAction={
        <Tooltip
          placement="top"
          title={translations.copyPasteTooltipText}
          showArrow={false}
          data-testid="verification-copy-paste-tooltip"
        >
          <Button type="link" onClick={() => pasteRecoveryPhrase()} data-testid="paste-from-clipboard-button">
            <span className={styles.btnContentWrapper}>
              <PasteIcon />
              {translations.pasteFromClipboard}
            </span>
          </Button>
        </Tooltip>
      }
      currentTimelineStep={WalletTimelineSteps.RECOVERY_PHRASE}
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
