import * as React from 'react';

import { Button } from '../../atoms';
import { Clipboard } from '../../util';

import { useFieldContext } from './mnemonicForm';

const PASTE_ICON_SIZE = 18;

export const MnemonicPasteButton = ({
  pasteButtonLabel,
}: {
  pasteButtonLabel: string;
}) => {
  const field = useFieldContext<string>();

  const handlePaste = async () => {
    const stringFromClipboard = await Clipboard.getStringAsync();
    if (!!stringFromClipboard) {
      field.setValue(stringFromClipboard);
      field.setMeta(previous => ({
        ...previous,
        isTouched: true,
        isBlurred: true,
      }));
      void field.validate('blur');

      // Wipe the clipboard
      void Clipboard.setStringAsync('');
    }
  };

  return (
    <Button.Secondary
      flex={1}
      iconSize={PASTE_ICON_SIZE}
      label={pasteButtonLabel}
      preIconName="Paste"
      onPress={() => void handlePaste()}
      testID="paste-button"
      size="medium"
    />
  );
};
