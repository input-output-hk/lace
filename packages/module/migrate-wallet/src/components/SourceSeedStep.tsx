import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { Column, spacing, Text, Toggle } from '@lace-lib/ui-toolkit';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { matchLoadedWallet } from './match-loaded-wallet';
import { NoteItem } from './NoteItem';
import { isValidPhrase, splitPhraseInput } from './phrase-input';
import { PhraseField } from './PhraseField';
import { wizardText } from './wizard-styles';
import { WizardFrame } from './WizardFrame';

import type { WalletId } from '@lace-contract/wallet-repo';

export interface SourceSeedStepProps {
  destinationWalletId: WalletId | undefined;
  loadedWalletIds: readonly WalletId[];
  stepLabel?: string;
  stepProgress?: number;
  onCancel: () => void;
  onBack?: () => void;
  onSubmit: (recoveryPhrase: string[]) => void;
}

/**
 * Enter the old wallet's recovery phrase. No password: the source is imported
 * as an additional wallet reusing the app-lock set when the destination was
 * created. The phrase is component-local and never reaches redux (SR-2) — on
 * remount the field re-renders empty and the user re-enters it, which is a
 * cleared input rather than a stuck state.
 */
export const SourceSeedStep = ({
  destinationWalletId,
  loadedWalletIds,
  stepLabel,
  stepProgress,
  onCancel,
  onBack,
  onSubmit,
}: SourceSeedStepProps) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const [phrase, setPhrase] = useState('');
  // Without BIP39-passphrase support, the correct 24 words
  // alone would silently derive a different, wrong-looking-empty wallet —
  // ask upfront and refuse instead.
  const [hasPassphrase, setHasPassphrase] = useState(false);

  const words = useMemo(() => splitPhraseInput(phrase), [phrase]);
  const isPhraseValid = isValidPhrase(words);
  // Refuse a phrase that derives an already-loaded wallet, so the import cannot
  // dedup and then wait for a wallet that never appears. The destination and any
  // other loaded wallet are different mistakes, so they get different copy.
  const loadedMatch = isPhraseValid
    ? matchLoadedWallet(words, { destinationWalletId, loadedWalletIds })
    : undefined;
  const isAlreadyLoaded = loadedMatch !== undefined;
  const isRefused = isAlreadyLoaded || hasPassphrase;

  // Phrase-entry denials never produce a store action — the guard simply
  // blocks the submit — so they are reported from here or not at all. One
  // event per false→true transition of each cause, not per keystroke.
  const reportedMatch = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (loadedMatch === reportedMatch.current) return;
    reportedMatch.current = loadedMatch;
    if (loadedMatch === undefined) return;
    trackEvent('migrate wallet | source | refused', {
      reason:
        loadedMatch === 'destination' ? 'same-seed' : 'source-already-loaded',
    });
  }, [loadedMatch, trackEvent]);
  const reportedPassphrase = useRef(false);
  useEffect(() => {
    if (hasPassphrase && !reportedPassphrase.current) {
      trackEvent('migrate wallet | source | refused', {
        reason: 'passphrase',
      });
    }
    reportedPassphrase.current = hasPassphrase;
  }, [hasPassphrase, trackEvent]);

  const handleSubmit = useCallback(() => {
    if (!isPhraseValid || isRefused) return;
    onSubmit(words);
  }, [isPhraseValid, isRefused, onSubmit, words]);

  return (
    <WizardFrame
      stepLabel={stepLabel}
      stepProgress={stepProgress}
      walletTag={t('migrate-wallet.tag.old-wallet')}
      title={t('migrate-wallet.seed.title')}
      primaryLabel={t('migrate-wallet.source.submit')}
      onPrimary={handleSubmit}
      primaryDisabled={!isPhraseValid || isRefused}
      backLabel={onBack ? t('migrate-wallet.nav.back') : undefined}
      onBack={onBack}
      secondaryLabel={t('app.cancel')}
      onSecondary={onCancel}
      // 24 typed words are worth one confirmation before they are discarded.
      confirmSecondary
      testID="migrate-wallet-seed-step">
      <Column gap={spacing.L}>
        <Text.M style={wizardText.bodyLine}>
          {t('migrate-wallet.seed.instruction')}
        </Text.M>
        <PhraseField
          label={t('migrate-wallet.seed.phrase-label')}
          value={phrase}
          words={words}
          onChangeText={setPhrase}
          placeholder={t('onboarding.restore-wallet.input.description')}
          // No expected phrase behind this field, so a checksum verdict is a
          // statement about the user's own input and nothing else.
          showChecksumHint
          // Only here: this phrase arrives via the clipboard, so routing it
          // through a control that wipes afterwards beats the OS shortcut.
          allowPaste
          errorMessage={
            loadedMatch === 'destination'
              ? t('migrate-wallet.error.same-seed')
              : loadedMatch === 'other'
              ? t('migrate-wallet.error.source-already-loaded')
              : undefined
          }
          testID="migrate-wallet-phrase"
        />
        <Toggle
          reverse
          label={t('migrate-wallet.seed.passphrase-question')}
          value={hasPassphrase}
          onValueChange={setHasPassphrase}
          testID="migrate-wallet-seed-passphrase-toggle"
        />
        {hasPassphrase && (
          <Text.S
            variant="negative"
            style={wizardText.smallLine}
            testID="migrate-wallet-seed-passphrase-error">
            {t('migrate-wallet.error.passphrase-not-supported')}
          </Text.S>
        )}
        {/* SOQ-3. This is the one screen in the product that asks for a
            recovery phrase, and it opens as a full-screen overlay over
            whatever the user was doing — the same shape a phishing page
            imitates. Say plainly where it is legitimate to type this. */}
        <NoteItem
          text={t('migrate-wallet.seed.phishing-note')}
          testID="migrate-wallet-seed-phishing-note"
        />
      </Column>
    </WizardFrame>
  );
};
