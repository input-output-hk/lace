import { useTranslation } from '@lace-contract/i18n';
import { Column, spacing, Text } from '@lace-lib/ui-toolkit';
import React, { useCallback, useMemo, useState } from 'react';

import { splitPhraseInput } from './phrase-input';
import { PhraseField } from './PhraseField';
import { wizardText } from './wizard-styles';
import { WizardFrame } from './WizardFrame';

export interface VerifyPhraseStepProps {
  words: string[];
  stepLabel?: string;
  stepProgress?: number;
  /**
   * Starts wallet creation. Returns whether it dispatched — latching this
   * step's controls on a call that hit a guard would strand the user.
   */
  onVerified: () => boolean;
  onBack: () => void;
}

/**
 * Prove the new wallet's phrase was saved by re-entering it in full (SR-10).
 * Creation is gated on the match, so the gate cannot be skipped; the
 * comparison is local and nothing is dispatched from here.
 *
 * Full re-entry, not a sampled 3-of-24 challenge: SR-10 names the platform's
 * `RecoveryPhraseVerification`, and narrowing the gate is a security decision.
 */
export const VerifyPhraseStep = ({
  words,
  stepLabel,
  stepProgress,
  onVerified,
  onBack,
}: VerifyPhraseStepProps) => {
  const { t } = useTranslation();
  const [entered, setEntered] = useState('');
  const [shouldShowMismatch, setShouldShowMismatch] = useState(false);
  // Disable the button the moment a valid phrase is submitted, so laggy repeat
  // taps can't fire creation more than once. On success this step unmounts; if
  // creation fails and returns here, the step remounts and this resets.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enteredWords = useMemo(() => splitPhraseInput(entered), [entered]);
  const isMatch =
    enteredWords.length === words.length &&
    enteredWords.every((word, index) => word === words[index]);

  const handleChange = useCallback((value: string) => {
    setEntered(value);
    setShouldShowMismatch(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (isSubmitting) return;
    if (!isMatch) {
      setShouldShowMismatch(true);
      return;
    }
    // Latch only on a real dispatch, and freeze both exits until the step
    // changes: rewinding and returning would remount with a fresh latch and
    // release the wizard's own, re-arming a second creation mid-flight.
    setIsSubmitting(onVerified());
  }, [isMatch, isSubmitting, onVerified]);

  return (
    <WizardFrame
      stepLabel={stepLabel}
      stepProgress={stepProgress}
      walletTag={t('migrate-wallet.tag.new-wallet')}
      title={t('migrate-wallet.verify-phrase.title')}
      primaryLabel={t('migrate-wallet.verify-phrase.submit')}
      onPrimary={handleSubmit}
      // Length only, never the match: a button that lights up on the correct
      // entry reports the answer before the user commits to it.
      primaryDisabled={enteredWords.length !== words.length || isSubmitting}
      backLabel={t('migrate-wallet.verify-phrase.back')}
      onBack={onBack}
      navigationDisabled={isSubmitting}
      testID="migrate-wallet-verify-step">
      <Column gap={spacing.L}>
        <Text.M style={wizardText.bodyLine}>
          {t('migrate-wallet.verify-phrase.description')}
        </Text.M>
        <PhraseField
          label={t('migrate-wallet.verify-phrase.label', {
            wordCount: `${words.length}`,
          })}
          value={entered}
          words={enteredWords}
          onChangeText={handleChange}
          // Whole-phrase verdict, on submit only. Never per-position: filling
          // all 24 slots with one candidate tests it against every position at
          // once, cutting recovery from 2048^24 guesses to 2048 submissions.
          errorMessage={
            shouldShowMismatch
              ? t('migrate-wallet.verify-phrase.error')
              : undefined
          }
          // Safe: a checksum over the user's own input says nothing about the
          // expected phrase.
          showChecksumHint
          testID="migrate-wallet-verify-phrase"
        />
      </Column>
    </WizardFrame>
  );
};
