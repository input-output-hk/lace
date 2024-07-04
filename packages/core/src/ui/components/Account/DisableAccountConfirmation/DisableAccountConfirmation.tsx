import React from 'react';
import { Dialog } from '@input-output-hk/lace-ui-toolkit';

interface Props {
  open: boolean;
  translations: {
    title: string;
    description: string;
    cancel: string;
    confirm: string;
  };
  onCancel: () => void;
  onConfirm: () => void;
  zIndex?: number;
}

export const DisableAccountConfirmation = ({
  open,
  onConfirm,
  onCancel,
  zIndex,
  translations: { title, description, cancel, confirm }
}: Props): JSX.Element => (
  <Dialog.Root open={open} setOpen={() => void 0} zIndex={zIndex}>
    <Dialog.Title>{title}</Dialog.Title>
    <Dialog.Description>{description}</Dialog.Description>
    <Dialog.Actions>
      <Dialog.Action cancel label={cancel} onClick={onCancel} />
      <Dialog.Action label={confirm} onClick={onConfirm} />
    </Dialog.Actions>
  </Dialog.Root>
);
