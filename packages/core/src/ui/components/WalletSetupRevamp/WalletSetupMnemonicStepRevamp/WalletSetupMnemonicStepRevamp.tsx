import React, { useCallback, useEffect, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { WalletTimelineSteps } from '../../WalletSetup';
import { MnemonicWordsWritedownRevamp } from './MnemonicWordsWritedownRevamp';
import { WalletSetupStepLayoutRevamp } from '../WalletSetupStepLayoutRevamp';
import styles from './WalletSetupMnemonicStepRevamp.module.scss';
import './WalletSetupMnemonicRevampCommon.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { hasEmptyString } from './WalletSetupMnemonicVerificationStepRevamp';
import { Dialog } from '@lace/ui';
import { MnemonicWordsConfirmInputRevamp } from './MnemonicWordsConfirmInputRevamp';
import { Wallet } from '@lace/cardano';
import { readMnemonicFromClipboard, writeMnemonicToClipboard } from './wallet-utils';
import isEqual from 'lodash/isEqual';
import { ReactComponent as CopyIcon } from '../../../assets/icons/purple-copy.component.svg';
import { ReactComponent as PasteIcon } from '../../../assets/icons/purple-paste.component.svg';

export type MnemonicStage = 'writedown' | 'input';

export interface WalletSetupMnemonicStepProps {
  mnemonic: string[];
  mnemonicStage: MnemonicStage;
  onBack: () => void;
  onNext: () => void;
  onStageChange?: (currentStage: MnemonicStage) => void;
  translations: TranslationsFor<{
    jsxElementKey: 'copyPasteTooltipText';
    stringKey:
      | 'writePassphraseTitle'
      | 'enterPassphraseDescription'
      | 'enterPassphrase'
      | 'writePassphraseSubtitle1'
      | 'writePassphraseSubtitle2'
      | 'passphraseError'
      | 'copyToClipboard'
      | 'pasteFromClipboard';
  }>;
  suggestionList?: Array<string>;
  passphraseInfoLink?: string;
  onWatchVideoClick?: () => void;
  renderVideoPopupContent: (params: { onClose: () => void }) => React.ReactNode;
  onCopyToClipboard?: () => void;
  onPasteFromClipboard?: () => void;
}

export const WalletSetupMnemonicStepRevamp = ({
  mnemonic,
  mnemonicStage,
  onBack,
  onNext,
  onStageChange,
  translations,
  suggestionList,
  renderVideoPopupContent,
  onWatchVideoClick,
  onCopyToClipboard,
  onPasteFromClipboard
}: WalletSetupMnemonicStepProps): React.ReactElement => {
  const [mnemonicConfirm, setMnemonicWordsConfirm] = useState<string[]>([]);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  useEffect(() => {
    if (mnemonicConfirm.length > 0) return;
    setMnemonicWordsConfirm(mnemonicStage === 'writedown' ? mnemonic.map(() => '') : mnemonic);
  }, [mnemonic, mnemonicConfirm.length, mnemonicStage]);

  const copyRecoveryPhrase = useCallback(async () => {
    await writeMnemonicToClipboard(mnemonic);
    onCopyToClipboard();
  }, [mnemonic, onCopyToClipboard]);

  const pasteRecoveryPhrase = useCallback(
    async (offset = 0) => {
      const copiedWords = await readMnemonicFromClipboard(mnemonic.length);

      if (copiedWords.length === 0) return;

      const newMnemonic = [...mnemonicConfirm];

      copiedWords.forEach((word, index) => {
        const newIndex = offset + index;
        if (newIndex < newMnemonic.length) {
          newMnemonic[newIndex] = word;
        }
      });

      setMnemonicWordsConfirm(newMnemonic);
      onPasteFromClipboard();
    },
    [mnemonic.length, mnemonicConfirm, onPasteFromClipboard]
  );

  useEffect(() => {
    const handleEnterKeyPress = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key === 'c' && mnemonicStage === 'writedown') {
        void copyRecoveryPhrase();
      }
      if (event.key === 'v' && mnemonicStage === 'input') {
        void pasteRecoveryPhrase();
      }
    };
    document.addEventListener('keydown', handleEnterKeyPress);
    return () => {
      document.removeEventListener('keydown', handleEnterKeyPress);
    };
  }, [copyRecoveryPhrase, mnemonic, mnemonicStage, pasteRecoveryPhrase]);

  const handleBack = () => {
    if (mnemonicStage === 'writedown') {
      onBack();
    }
    setMnemonicWordsConfirm(mnemonic.map(() => ''));
    onStageChange('writedown');
  };

  const handleNext = () => {
    if (mnemonicStage === 'input') {
      onNext();
      return;
    }
    setMnemonicWordsConfirm(mnemonic.map(() => ''));
    onStageChange('input');
  };

  const title = mnemonicStage === 'writedown' ? translations.writePassphraseTitle : translations.enterPassphrase;
  const subtitle =
    mnemonicStage === 'writedown' ? (
      <>
        {translations.writePassphraseSubtitle1}{' '}
        <span
          onClick={() => {
            setVideoModalOpen(true);
            onWatchVideoClick?.();
          }}
          className={styles.link}
          data-testid="watch-video-link"
        >
          {translations.writePassphraseSubtitle2}
        </span>
        <Dialog.Root open={videoModalOpen} setOpen={setVideoModalOpen}>
          {renderVideoPopupContent({ onClose: () => setVideoModalOpen(false) })}
        </Dialog.Root>
      </>
    ) : (
      translations.enterPassphraseDescription
    );

  const isSubmitEnabled =
    mnemonicStage === 'writedown' ||
    (Wallet.KeyManagement.util.validateMnemonic(Wallet.KeyManagement.util.joinMnemonicWords(mnemonicConfirm)) &&
      isEqual(mnemonic, mnemonicConfirm));

  return (
    <>
      <WalletSetupStepLayoutRevamp
        title={title}
        description={subtitle}
        onBack={handleBack}
        onNext={handleNext}
        currentTimelineStep={WalletTimelineSteps.RECOVERY_PHRASE}
        customAction={
          mnemonicStage === 'writedown' ? (
            <Tooltip placement="top" title={translations.copyPasteTooltipText} showArrow={false}>
              <Button type="link" onClick={copyRecoveryPhrase} data-testid="copy-to-clipboard-button">
                <span className={styles.btnContentWrapper}>
                  <CopyIcon />
                  {translations.copyToClipboard}
                </span>
              </Button>
            </Tooltip>
          ) : (
            <Tooltip placement="top" title={translations.copyPasteTooltipText} showArrow={false}>
              <Button type="link" onClick={() => pasteRecoveryPhrase()} data-testid="paste-from-clipboard-button">
                <span className={styles.btnContentWrapper}>
                  <PasteIcon />
                  {translations.pasteFromClipboard}
                </span>
              </Button>
            </Tooltip>
          )
        }
        isNextEnabled={isSubmitEnabled}
      >
        {mnemonicStage === 'writedown' ? (
          <MnemonicWordsWritedownRevamp words={mnemonic} />
        ) : (
          <div className={styles.containerWordsConfirm}>
            <MnemonicWordsConfirmInputRevamp
              handlePaste={pasteRecoveryPhrase}
              words={mnemonicConfirm}
              onChange={(stepWords) => {
                const newMnemonicWordsConfirm = [...mnemonicConfirm];

                // eslint-disable-next-line unicorn/no-array-for-each
                stepWords.forEach((word, index) => {
                  newMnemonicWordsConfirm[index] = word;
                });

                setMnemonicWordsConfirm(newMnemonicWordsConfirm);
              }}
              suggestionList={suggestionList}
            />
            {!isSubmitEnabled && !hasEmptyString(mnemonicConfirm) && (
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
