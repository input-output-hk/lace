import type { TextStyle } from 'react-native';

import { useTranslation } from '@lace-contract/i18n';
import {
  Button,
  Clipboard,
  Column,
  Row,
  spacing,
  Text,
  TextInput,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useState } from 'react';

import {
  findUnknownWordPositions,
  hasValidWordCount,
  isValidPhrase,
} from './phrase-input';
import { wizardText } from './wizard-styles';

/**
 * Roughly six lines. A 24-word phrase wraps to three or four in the wizard's
 * reading column, so this shows a whole one without scrolling and leaves the
 * box looking like somewhere a phrase goes rather than a one-line field.
 */
const phraseInputStyle: TextStyle = {
  minHeight: 120,
  // The atom centres its input for single-line use; a phrase has to start at
  // the top or the first line floats in the middle of the box.
  textAlignVertical: 'top',
};

export interface PhraseFieldProps {
  label: string;
  placeholder?: string;
  /** Raw, un-normalised input. The parent owns it; this field never stores it. */
  value: string;
  /** Normalised words derived from `value` by the parent. */
  words: readonly string[];
  onChangeText: (raw: string) => void;
  /** Takes precedence over word-level feedback: refusals and mismatches. */
  errorMessage?: string;
  /**
   * Enables the "every word is valid but the phrase is not" hint. Leaks nothing
   * — a checksum over the user's own input — but only useful where a wrong
   * order is the likely fault.
   */
  showChecksumHint?: boolean;
  /**
   * Offers a Paste control that wipes the clipboard afterwards. Never enabled
   * on verification: that step proves the user can reproduce the phrase from
   * their backup, and a Paste button there advertises the way around it.
   */
  allowPaste?: boolean;
  testID: string;
}

/**
 * The wizard's one recovery-phrase input, shared by both seed steps so they
 * cannot drift — a hardening applied to only one is how a seed bug starts.
 * Over a bare `TextInput` it adds `autoCorrect={false}` (the atom pins every
 * other autofill flag but leaves this one, and iOS rewrites BIP39 words as you
 * type), a clipboard-wiping Paste, and a word count plus typo positions.
 */
export const PhraseField = ({
  label,
  placeholder,
  value,
  words,
  onChangeText,
  errorMessage,
  showChecksumHint = false,
  allowPaste = false,
  testID,
}: PhraseFieldProps) => {
  const { t } = useTranslation();
  // Three outcomes, not two. "Read failed" and "clipboard was empty" need
  // different advice, and the empty case is the one this control creates: the
  // wipe below means a second Paste finds nothing. Reporting that as success
  // made press two behaviourally identical to a dead button.
  const [pasteOutcome, setPasteOutcome] = useState<
    'empty' | 'failed' | 'wiped' | undefined
  >(undefined);
  const [isFocused, setIsFocused] = useState(false);

  // The word under the caret isn't a typo yet. Focus, not the trailing
  // character: a pasted phrase also ends mid-word but must be checked at once.
  const isTypingFinalWord = isFocused && value.length > 0 && !/\s$/.test(value);
  const settledWords = isTypingFinalWord ? words.slice(0, -1) : words;
  const unknownPositions = findUnknownWordPositions(settledWords);

  // All words real and the length right, so the fault is a wrong word or order
  // — invisible when proof-reading against the wordlist.
  const hasChecksumFault =
    showChecksumHint &&
    !isTypingFinalWord &&
    hasValidWordCount(words) &&
    unknownPositions.length === 0 &&
    !isValidPhrase(words);

  const handlePaste = useCallback(() => {
    void (async () => {
      let clipboardText: string;
      try {
        clipboardText = await Clipboard.getStringAsync();
      } catch {
        // Web denies clipboard reads without permission; a dead button with no
        // explanation is worse.
        setPasteOutcome('failed');
        return;
      }

      // Classified after the empty check, not before it: clearing the notice
      // first meant an empty read counted as a success and erased the reason
      // the clipboard was empty in the first place.
      if (!clipboardText) {
        setPasteOutcome('empty');
        return;
      }

      setPasteOutcome(undefined);
      onChangeText(clipboardText);

      // Announced only once it has actually happened. Writing an empty string
      // is not uniformly supported across clipboard implementations, so a
      // swallowed failure previously left the user with no idea whether their
      // clipboard still held the phrase — and the control exists precisely to
      // wipe it, which nothing on screen said.
      try {
        await Clipboard.setStringAsync('');
        setPasteOutcome('wiped');
      } catch {
        /* Wipe failed: say nothing rather than claim a clear that did not
           happen. The phrase is pasted either way. */
      }
    })();
  }, [onChangeText]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);
  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // One error at a time: parent's, then typos, then the order hint. Stacked red
  // text hides the one fault the user can act on.
  const fieldError =
    errorMessage ??
    (unknownPositions.length > 0
      ? t('migrate-wallet.phrase.unknown-words', {
          count: unknownPositions.length,
          // Separator comes from the locale file, not `', '`: Japanese
          // enumerates with 、 (U+3001), and a separator chosen here is one no
          // translator can reach from their own file.
          positions: unknownPositions.join(
            t('migrate-wallet.phrase.unknown-words-separator'),
          ),
        })
      : hasChecksumFault
      ? t('migrate-wallet.phrase.checksum-failed')
      : undefined);

  return (
    <Column gap={spacing.S}>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        multiline
        // Height via style, not `numberOfLines`: react-native-web deprecates
        // that prop in favour of `rows`, and an explicit minimum sizes the box
        // the same way on both platforms.
        style={phraseInputStyle}
        autoCapitalize="none"
        onFocus={handleFocus}
        onBlur={handleBlur}
        // See the component doc: the atom pins every other autofill and
        // spellcheck protection, but leaves this one at the platform default.
        autoCorrect={false}
        placeholder={placeholder}
        errorMessage={fieldError}
        testID={testID}
      />
      <Row justifyContent="space-between" alignItems="center" gap={spacing.S}>
        <Text.XS variant="tertiary" testID={`${testID}-word-count`}>
          {words.length > 0
            ? t('migrate-wallet.phrase.word-count', { count: words.length })
            : ''}
        </Text.XS>
        {allowPaste && (
          <Button.Tertiary
            label={t('migrate-wallet.phrase.paste')}
            preIconName="Paste"
            size="small"
            onPress={handlePaste}
            testID={`${testID}-paste`}
          />
        )}
      </Row>
      {allowPaste && pasteOutcome !== undefined && (
        <Text.XS
          variant="tertiary"
          style={wizardText.smallLine}
          testID={`${testID}-paste-failed`}>
          {pasteOutcome === 'failed'
            ? t('migrate-wallet.phrase.paste-failed')
            : pasteOutcome === 'empty'
            ? t('migrate-wallet.phrase.paste-empty')
            : t('migrate-wallet.phrase.paste-wiped')}
        </Text.XS>
      )}
    </Column>
  );
};
