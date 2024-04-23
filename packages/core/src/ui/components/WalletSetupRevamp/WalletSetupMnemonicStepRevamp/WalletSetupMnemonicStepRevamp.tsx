import React, { useEffect, useMemo, useState } from 'react';
import { Button, Tooltip } from 'antd';
import { WalletTimelineSteps } from '../../WalletSetup';
import { MnemonicWordsWritedownRevamp } from './MnemonicWordsWritedownRevamp';
import { WalletSetupStepLayoutRevamp } from '../WalletSetupStepLayoutRevamp';
import styles from '../../WalletSetup/WalletSetupOption.module.scss';
import './WalletSetupMnemonicRevampCommon.module.scss';
import { TranslationsForJSX } from '@ui/utils/types';
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
  onReset: (mnemonicStage?: MnemonicStage) => void;
  onNext: () => void;
  onStepNext?: (currentStage: MnemonicStage) => void;
  isBackFromNextStep?: boolean;
  translations: TranslationsForJSX<
    | 'writePassphraseTitle'
    | 'enterPassphraseDescription'
    | 'enterPassphrase'
    | 'writePassphraseSubtitle1'
    | 'writePassphraseSubtitle2'
    | 'passphraseError'
    | 'copyToClipboard'
    | 'pasteFromClipboard'
    | 'copyPasteTooltipText'
  >;
  suggestionList?: Array<string>;
  passphraseInfoLink?: string;
  onWatchVideoClick?: () => void;
  renderVideoPopupContent: (params: { onClose: () => void }) => React.ReactNode;
  onCopyToClipboard?: () => void;
  onPasteFromClipboard?: () => void;
}

export const WalletSetupMnemonicStepRevamp = ({
  mnemonic,
  onReset,
  onNext,
  onStepNext,
  translations,
  suggestionList,
  renderVideoPopupContent,
  onWatchVideoClick,
  onCopyToClipboard,
  onPasteFromClipboard,
  isBackFromNextStep = false
}: WalletSetupMnemonicStepProps): React.ReactElement => {
  const initialMnemonicWordsConfirm = useMemo(() => mnemonic.map(() => ''), [mnemonic]);
  const [mnemonicStage, setMnemonicStage] = useState<MnemonicStage>('writedown');
  const [mnemonicConfirm, setMnemonicWordsConfirm] = useState(initialMnemonicWordsConfirm);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // reset the state on mnemonic change
  useEffect(() => {
    setMnemonicStage(isBackFromNextStep ? 'input' : 'writedown');
    setMnemonicWordsConfirm(isBackFromNextStep ? mnemonic : initialMnemonicWordsConfirm);
  }, [initialMnemonicWordsConfirm, isBackFromNextStep, mnemonic]);

  const pasteRecoveryPhrase = async (offset = 0) => {
    const copiedWords = await readMnemonicFromClipboard(mnemonic.length);

    if (copiedWords.length === -1) return;

    const newMnemonic = [...mnemonicConfirm];

    copiedWords.forEach((word, index) => {
      const newIndex = offset + index;
      if (newIndex < newMnemonic.length) {
        newMnemonic[newIndex] = word;
      }
    });

    setMnemonicWordsConfirm(newMnemonic);
    onPasteFromClipboard();
  };

  const handleBack = () => {
    onReset(mnemonicStage);
  };

  const handleNext = () => {
    onStepNext && onStepNext(mnemonicStage);
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
              <Button
                type="link"
                onClick={async () => {
                  await writeMnemonicToClipboard(mnemonic);
                  onCopyToClipboard();
                }}
                data-testid="copy-to-clipboard-button"
              >
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
          <div className={styles.ContainerWordsConfirm}>
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
