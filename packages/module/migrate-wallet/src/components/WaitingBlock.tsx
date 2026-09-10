import { Column, Loader, spacing, Text } from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet } from 'react-native';

import { wizardText } from './wizard-styles';

export interface WaitingBlockProps {
  /** One line per sentence, in reading order. */
  messages: string[];
  /** Applied to the first line, which is the one the tests assert on. */
  testID?: string;
}

/**
 * A spinner and the sentence explaining what is happening to the user's wallet.
 * Shared by every wait in the flow so none of them can drift into a bare
 * "please wait".
 */
export const WaitingBlock = ({ messages, testID }: WaitingBlockProps) => (
  <Column gap={spacing.M} style={styles.centred}>
    <Loader />
    {messages.map((message, index) => (
      <Text.S
        key={message}
        variant="tertiary"
        align="center"
        style={wizardText.smallLine}
        testID={index === 0 ? testID : undefined}>
        {message}
      </Text.S>
    ))}
  </Column>
);

const styles = StyleSheet.create({
  centred: {
    alignItems: 'center',
    paddingVertical: spacing.XL,
  },
});
