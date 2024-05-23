import React from 'react';

import * as AlertDialog from '@radix-ui/react-alert-dialog';

import * as Button from '../buttons';

export interface DialogActionProps {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  cancel?: boolean;
  autoFocus?: boolean;
  testId?: string;
}

export const Action = ({
  onClick,
  label,
  disabled,
  cancel = false,
  autoFocus = false,
  testId,
}: Readonly<DialogActionProps>): JSX.Element => {
  const Wrapper = cancel ? AlertDialog.Cancel : AlertDialog.Action;
  const ActionButton = cancel ? Button.Secondary : Button.CallToAction;

  return (
    <Wrapper asChild onClick={onClick}>
      <ActionButton
        w="$fill"
        label={label}
        disabled={disabled}
        autoFocus={autoFocus}
        data-testid={testId ?? 'action-button'}
      />
    </Wrapper>
  );
};
