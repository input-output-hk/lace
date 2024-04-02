import React, { useState } from 'react';
import { Box, Checkbox, Dialog, ScrollArea, Text } from '@lace/ui';
import styles from './TopUpWallet.module.scss';

interface TopUpWalletDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  triggerRef: React.RefObject<HTMLElement>;
}
export const TopUpWalletDialog = ({
  open,
  onCancel,
  onConfirm,
  triggerRef
}: TopUpWalletDialogProps): React.ReactElement => {
  const [agreed, setAgreed] = useState(false);
  return (
    <Dialog.Root open={open} setOpen={onCancel} zIndex={1000} onCloseAutoFocusRef={triggerRef}>
      <Dialog.Title>You’ll be redirect to a 3rd party provider (BANXA) to buy ADA</Dialog.Title>
      <Dialog.Description>
        <Box className={styles.scroll}>
          <Text.Body.Normal weight="$medium">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et
            dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex
            ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat
            nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit
            anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
            laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit
            esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa
            qui officia deserunt mollit anim id est laborum.
          </Text.Body.Normal>
        </Box>
      </Dialog.Description>
      <Checkbox
        label="I agree with the terms above and wish to continue"
        onClick={() => setAgreed(!agreed)}
        checked={agreed}
      />
      <Dialog.Actions>
        <Dialog.Action cancel label="Go Back" onClick={onCancel} />
        <Dialog.Action label="Continue" onClick={onConfirm} disabled={!agreed} />
      </Dialog.Actions>
    </Dialog.Root>
  );
};
