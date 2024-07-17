/* eslint-disable react/jsx-handler-names */
import React, { RefObject } from 'react';
import { Dialog } from '@input-output-hk/lace-ui-toolkit';

interface Props {
  open: boolean;
  translations: {
    title: string;
    description: string;
    cancel: string;
    confirm: string;
  };
  events: {
    onCancel: () => void;
    onConfirm: () => void;
    onOpenChanged: (open: boolean) => void;
  };
  zIndex?: number;
  closeAutoFocusRef?: RefObject<HTMLElement>;
}

export const StartOverDialog = ({
  open,
  zIndex,
  closeAutoFocusRef,
  translations: { title, description, cancel, confirm },
  events
}: Props): JSX.Element => (
  <Dialog.Root open={open} setOpen={events.onOpenChanged} zIndex={zIndex} onCloseAutoFocusRef={closeAutoFocusRef}>
    <Dialog.Title>{title}</Dialog.Title>
    <Dialog.Description>{description}</Dialog.Description>
    <Dialog.Actions>
      <Dialog.Action cancel label={cancel} onClick={events.onCancel} testId={'cancel-button'} />
      <Dialog.Action label={confirm} onClick={events.onConfirm} testId={'confirm-button'} />
    </Dialog.Actions>
  </Dialog.Root>
);
