import React, { useCallback, useEffect, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { WalletTimelineSteps } from '../../WalletSetup';
import { MnemonicWordsWritedownRevamp } from './MnemonicWordsWritedownRevamp';
import { WalletSetupStepLayoutRevamp } from '../WalletSetupStepLayoutRevamp';
import styles from './WalletSetupMnemonicStepRevamp.module.scss';
import './WalletSetupMnemonicRevampCommon.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { hasEmptyString } from './WalletSetupMnemonicVerificationStepRevamp';
import { Dialog } from '@input-output-hk/lace-ui-toolkit';
import { MnemonicWordsConfirmInputRevamp } from './MnemonicWordsConfirmInputRevamp';
import { Wallet } from '@lace/cardano';
import { readMnemonicFromClipboard, writeMnemonicToClipboard } from './wallet-utils';
import isEqual from 'lodash/isEqual';
import { ReactComponent as CopyIcon } from '../../../assets/icons/purple-copy.component.svg';
import { ReactComponent as PasteIcon } from '../../../assets/icons/purple-paste.component.svg';
import { useKeyboardShortcut } from '@lace/common';

export type WalletSetupMnemonicStage = 'recoverymethod' | 'writedown' | 'input';

export interface WalletSetupMnemonicStepProps {
  mnemonic: string[];
  mnemonicStage: WalletSetupMnemonicStage;
  onBack: () => void;
  onNext: () => void;
  onStageChange: (currentStage: WalletSetupMnemonicStage) => void;
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
  const [mnemonicConfirm, setMnemonicConfirm] = useState<string[]>([]);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  useEffect(() => {
    const mnemonicConfirmWasAlreadyInitialized = mnemonicConfirm.length > 0;
    if (mnemonicConfirmWasAlreadyInitialized) return;
    setMnemonicConfirm(mnemonicStage === 'writedown' ? mnemonic.map(() => '') : mnemonic);
  }, [mnemonic, mnemonicConfirm.length, mnemonicStage]);

  const copyRecoveryPhrase = useCallback(async () => {
    await writeMnemonicToClipboard(mnemonic);
    onCopyToClipboard?.();
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

      setMnemonicConfirm(newMnemonic);
      onPasteFromClipboard?.();
    },
    [mnemonic.length, mnemonicConfirm, onPasteFromClipboard]
  );

  useKeyboardShortcut((event) => {
    if (!event.ctrlKey && !event.metaKey) return;

    if (event.key === 'c' && mnemonicStage === 'writedown') {
      void copyRecoveryPhrase();
    }
    if (event.key === 'v' && mnemonicStage === 'input') {
      void pasteRecoveryPhrase();
    }
  });

  const handleBack = () => {
    if (mnemonicStage === 'writedown') {
      onBack();
      return;
    }
    onStageChange('writedown');
  };

  const handleNext = () => {
    if (mnemonicStage === 'input') {
      onNext();
      return;
    }
    setMnemonicConfirm(mnemonic.map(() => ''));
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
        <Dialog.Root open={videoModalOpen} setOpen={setVideoModalOpen} zIndex={1001}>
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
        currentTimelineStep={WalletTimelineSteps.RECOVERY_DETAILS}
        customAction={
          <Tooltip
            placement="top"
            title={<span data-testid="mnemonic-copy-paste-tooltip">{translations.copyPasteTooltipText}</span>}
            showArrow={false}
            overlayClassName={styles.copyPasteTooltip}
          >
            {mnemonicStage === 'writedown' ? (
              <Button type="link" onClick={copyRecoveryPhrase} data-testid="copy-to-clipboard-button">
                <span className={styles.btnContentWrapper}>
                  <CopyIcon />
                  {translations.copyToClipboard}
                </span>
              </Button>
            ) : (
              <Button type="link" onClick={() => pasteRecoveryPhrase()} data-testid="paste-from-clipboard-button">
                <span className={styles.btnContentWrapper}>
                  <PasteIcon />
                  {translations.pasteFromClipboard}
                </span>
              </Button>
            )}
          </Tooltip>
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

                setMnemonicConfirm(newMnemonicWordsConfirm);
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
