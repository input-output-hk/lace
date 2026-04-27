import React from 'react';

import { spacing } from '../../../../../design-tokens';
import { Column, CustomTextInput, Divider, Icon } from '../../../../atoms';

import type { SendSheetProps } from '../sendSheet';

interface NoteSectionProps {
  copies: Pick<SendSheetProps['copies'], 'noteLabel'>;
  values: Pick<SendSheetProps['values'], 'noteValue'>;
  actions: Pick<SendSheetProps['actions'], 'onClearNote' | 'onNoteChange'>;
  length: number;
  testIdPrefix?: string;
}

export const NoteSection = ({
  copies,
  values,
  actions,
  length,
  testIdPrefix,
}: NoteSectionProps) => {
  const { noteLabel } = copies;
  const { noteValue } = values;
  const { onNoteChange, onClearNote } = actions;

  return (
    <Column gap={spacing.M}>
      <Divider />
      <CustomTextInput
        isWithinBottomSheet
        label={noteLabel}
        value={noteValue}
        onChangeText={onNoteChange}
        animatedLabel
        postButton={{
          icon: <Icon name="Delete" />,
          onPress: onClearNote,
          testID: `${testIdPrefix}-note-clear-button`,
        }}
        maxLength={length}
        testID={`${testIdPrefix}-note-input`}
      />
    </Column>
  );
};
