import React, { RefObject } from 'react';
import { Dialog } from '@lace/ui';

interface Props {
  open: boolean;
  translations: {
    title: string;
    description: string;
    cancelButton: string;
    confirmButton: string;
  };
  events: {
    onCancel: () => void;
    onConfirm: () => void;
    onOpenChanged: (open: boolean) => void;
  };
  zIndex?: number;
  closeAutoFocusRef?: RefObject<HTMLElement>;
}

export const StartOverDialog = ({ open, zIndex, closeAutoFocusRef, translations, events }: Props): JSX.Element => (
  <Dialog.Root open={open} setOpen={events.onOpenChanged} zIndex={zIndex} onCloseAutoFocusRef={closeAutoFocusRef}>
    <Dialog.Title>{translations.title}</Dialog.Title>
    <Dialog.Description>{translations.description}</Dialog.Description>
    <Dialog.Actions>
      <Dialog.Action cancel label={translations.cancelButton} onClick={events.onCancel} />
      <Dialog.Action label={translations.confirmButton} onClick={events.onConfirm} />
    </Dialog.Actions>
  </Dialog.Root>
);
