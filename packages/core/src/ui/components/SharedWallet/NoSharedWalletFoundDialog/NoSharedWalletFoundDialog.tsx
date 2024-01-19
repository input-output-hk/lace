import React, { RefObject } from 'react';
import { Dialog } from '@lace/ui';

interface Props {
  open: boolean;
  translations: {
    title: string;
    description: string;
    confirmButton: string;
  };
  events: {
    handleOnConfirm: () => void;
    onOpenChanged: (open: boolean) => void;
  };
  zIndex?: number;
  closeAutoFocusRef?: RefObject<HTMLElement>;
}

export const NoSharedWalletFoundDialog = ({
  open,
  zIndex,
  closeAutoFocusRef,
  translations,
  events
}: Props): JSX.Element => (
  <Dialog.Root open={open} setOpen={events.onOpenChanged} zIndex={zIndex} onCloseAutoFocusRef={closeAutoFocusRef}>
    <Dialog.Title>{translations.title}</Dialog.Title>
    <Dialog.Description>{translations.description}</Dialog.Description>
    <Dialog.Actions>
      <Dialog.Action label={translations.confirmButton} onClick={events.handleOnConfirm} />
    </Dialog.Actions>
  </Dialog.Root>
);
