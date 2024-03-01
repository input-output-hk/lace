import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import { WalletTimelineSteps } from '../../WalletSetup';
import { MnemonicWordsWritedownRevamp } from './MnemonicWordsWritedownRevamp';
import { WalletSetupStepLayoutRevamp } from '../WalletSetupStepLayoutRevamp';
import styles from '../../WalletSetup/WalletSetupOption.module.scss';
import { TranslationsFor } from '@ui/utils/types';
import { hasEmptyString } from '@ui/components/WalletSetup/WalletSetupMnemonicVerificationStep';
import { Dialog } from '@lace/ui';
import { MnemonicWordsConfirmInputRevamp } from './MnemonicWordsConfirmInputRevamp';
import { Wallet } from '@lace/cardano';
import { readMnemonicFromClipboard, writeMnemonicToClipboard } from './wallet-utils';

export type MnemonicStage = 'writedown' | 'input';

export interface WalletSetupMnemonicStepProps {
  mnemonic: string[];
  onReset: (mnemonicStage?: MnemonicStage) => void;
  onNext: () => void;
  onStepNext?: (currentStage: MnemonicStage) => void;
  mnemonicWordsInStep?: number;
  translations: TranslationsFor<
    | 'writePassphraseTitle'
    | 'enterPassphraseDescription'
    | 'enterPassphrase'
    | 'writePassphraseSubtitle1'
    | 'writePassphraseSubtitle2'
    | 'passphraseError'
    | 'enterWallet'
    | 'copyToClipboard'
    | 'pasteFromClipboard'
  >;
  suggestionList?: Array<string>;
  passphraseInfoLink?: string;
  renderVideoPopupContent: (params: { onClose: () => void }) => React.ReactNode;
}

export const WalletSetupMnemonicStepRevamp = ({
  mnemonic,
  onReset,
  onNext,
  translations,
  suggestionList,
  renderVideoPopupContent
}: WalletSetupMnemonicStepProps): React.ReactElement => {
  const initialMnemonicWordsConfirm = useMemo(() => mnemonic.map(() => ''), [mnemonic]);
  const [mnemonicStage, setMnemonicStage] = useState<MnemonicStage>('writedown');
  const [mnemonicConfirm, setMnemonicWordsConfirm] = useState(initialMnemonicWordsConfirm);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // reset the state on mnemonic change
  useEffect(() => {
    setMnemonicStage('writedown');
    setMnemonicWordsConfirm(initialMnemonicWordsConfirm);
  }, [initialMnemonicWordsConfirm, mnemonic]);

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

  const handleBack = () => {
    onReset(mnemonicStage);
  };

  const handleNext = () => {
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
      translations.enterPassphraseDescription
    );

  const isSubmitEnabled =
    mnemonicStage === 'writedown' ||
    Wallet.KeyManagement.util.validateMnemonic(Wallet.KeyManagement.util.joinMnemonicWords(mnemonicConfirm));

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
            <Button type="link" onClick={async () => await writeMnemonicToClipboard(mnemonic)}>
              {translations.copyToClipboard}
            </Button>
          ) : (
            <Button type="link" onClick={pasteRecoveryPhrase}>
              {translations.pasteFromClipboard}
            </Button>
          )
        }
        nextLabel={mnemonicStage === 'input' && translations.enterWallet}
        isNextEnabled={isSubmitEnabled}
      >
        {mnemonicStage === 'writedown' ? (
          <MnemonicWordsWritedownRevamp words={mnemonic} />
        ) : (
          <div className={styles.ContainerWordsConfirm}>
            <MnemonicWordsConfirmInputRevamp
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
