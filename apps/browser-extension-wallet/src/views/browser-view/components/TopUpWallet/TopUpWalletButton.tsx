import { ReactComponent as AdaComponentTransparent } from '@lace/icons/dist/AdaComponentTransparent';
import React, { useRef, useState } from 'react';
import { Button } from '@lace/ui';
import { TopUpWalletDialog } from './TopUpWalletDialog';

export const TopUpWalletButton = (): React.ReactElement => {
  const dialogTriggerReference = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button.CallToAction
        icon={<AdaComponentTransparent />}
        label="Buy"
        onClick={() => setOpen(true)}
        ref={dialogTriggerReference}
      />
      {open && (
        <TopUpWalletDialog
          onCancel={() => setOpen(false)}
          open={open}
          triggerRef={dialogTriggerReference}
          onConfirm={() => console.debug('go to url')}
        />
      )}
    </>
  );
};
