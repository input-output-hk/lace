import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Row } from '../../atoms';
import { MnemonicWord } from '../mnemonicWord/mnemonicWord';

import type { ByteArray } from '@lace-sdk/util';

export type RecoveryPhraseProps = {
  words: ByteArray[];
  isBlurred?: boolean;
  testID?: string;
};

export const RecoveryPhrase = ({
  words,
  isBlurred = true,
  testID = 'recovery-phrase',
}: RecoveryPhraseProps) => {
  const wordsToShow = useMemo(
    () =>
      Array.from({ length: words.length }, (_, index) => ({
        index: index + 1,
        word: words[index] || '',
      })),
    [words],
  );

  // Group words into rows of 2
  const rows = useMemo(() => {
    const result = [];
    for (let index = 0; index < wordsToShow.length; index += 2) {
      result.push([wordsToShow[index], wordsToShow[index + 1]]);
    }
    return result;
  }, [wordsToShow]);

  return (
    <View style={styles.container} testID={testID}>
      {rows.map((row, rowIndex) => (
        <Row key={rowIndex} style={styles.wordRow}>
          {row.map(
            item =>
              item && (
                <View key={item.index} style={styles.wordWrapper}>
                  <MnemonicWord
                    index={item.index}
                    isBlurred={isBlurred}
                    testID={`${testID}-word-${item.index}`}>
                    {Array.from(item.word).map(charCode =>
                      // String.fromCharCode does not support UTF-8,
                      // so some characters might be converted incorrectly.
                      // However, mnemonic words are english, so all their
                      // characters are covered.
                      String.fromCharCode(charCode),
                    )}
                  </MnemonicWord>
                </View>
              ),
          )}
        </Row>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.S,
  },
  wordRow: {
    gap: spacing.M,
    flex: 1,
  },
  wordWrapper: {
    flex: 1,
  },
});
