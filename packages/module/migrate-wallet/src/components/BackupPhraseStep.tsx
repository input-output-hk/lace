import { useTranslation } from '@lace-contract/i18n';
import {
  Button,
  Column,
  RecoveryPhrase,
  spacing,
  Text,
} from '@lace-lib/ui-toolkit';
import { ByteArray } from '@lace-lib/util';
import React, { useMemo, useState } from 'react';

import { NoteItem } from './NoteItem';
import { wizardText } from './wizard-styles';
import { WizardFrame } from './WizardFrame';

export interface BackupPhraseStepProps {
  words: string[];
  stepLabel?: string;
  stepProgress?: number;
  onContinue: () => void;
  onBack?: () => void;
  onCancel: () => void;
}

/**
 * Back up the new wallet's generated phrase. Shown before the wallet exists —
 * the phrase lives only in the wizard — so no decryption or password re-prompt
 * is needed, unlike the standalone RecoveryPhraseVerification sheet.
 */
export const BackupPhraseStep = ({
  words,
  stepLabel,
  stepProgress,
  onContinue,
  onBack,
  onCancel,
}: BackupPhraseStepProps) => {
  const { t } = useTranslation();
  const [isBlurred, setIsBlurred] = useState(true);

  const wordBytes = useMemo(() => words.map(ByteArray.fromUTF8), [words]);

  return (
    <WizardFrame
      stepLabel={stepLabel}
      stepProgress={stepProgress}
      walletTag={t('migrate-wallet.tag.new-wallet')}
      title={t('migrate-wallet.backup-phrase.title')}
      primaryLabel={t('migrate-wallet.backup-phrase.saved')}
      onPrimary={onContinue}
      primaryDisabled={isBlurred}
      backLabel={onBack ? t('migrate-wallet.nav.back') : undefined}
      onBack={onBack}
      secondaryLabel={t('app.cancel')}
      onSecondary={onCancel}
      // Both exits discard a phrase the user may already have written down:
      // back returns to the destination choice, which orphans it, and coming
      // forward again generates a different one.
      confirmBack
      confirmSecondary
      testID="migrate-wallet-backup-step">
      <Column gap={spacing.L}>
        <Text.M style={wizardText.bodyLine}>
          {t('migrate-wallet.backup-phrase.description')}
        </Text.M>
        <Button.Secondary
          label={t(
            isBlurred
              ? 'migrate-wallet.backup-phrase.show'
              : 'migrate-wallet.backup-phrase.hide',
          )}
          preIconName={isBlurred ? 'View' : 'ViewOff'}
          onPress={() => {
            setIsBlurred(blurred => !blurred);
          }}
          fullWidth
          testID="migrate-wallet-backup-toggle"
        />
        <RecoveryPhrase
          words={wordBytes}
          isBlurred={isBlurred}
          testID="migrate-wallet-backup-words"
        />
        <NoteItem text={t('migrate-wallet.backup-phrase.warning')} />
      </Column>
    </WizardFrame>
  );
};
