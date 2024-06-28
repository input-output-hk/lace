import React, { RefObject } from 'react';
import { Dialog } from '@input-output-hk/lace-ui-toolkit';

interface Props {
  open: boolean;
  translations: {
    title: string;
    description: string;
    confirm: string;
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
  translations: { title, description, confirm },
  events
}: Props): JSX.Element => (
  <Dialog.Root open={open} setOpen={events.onOpenChanged} zIndex={zIndex} onCloseAutoFocusRef={closeAutoFocusRef}>
    <Dialog.Title>{title}</Dialog.Title>
    <Dialog.Description>{description}</Dialog.Description>
    <Dialog.Actions>
      <Dialog.Action label={confirm} onClick={events.handleOnConfirm} />
    </Dialog.Actions>
  </Dialog.Root>
);
