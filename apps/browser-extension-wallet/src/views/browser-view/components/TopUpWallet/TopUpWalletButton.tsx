import { tabs } from 'webextension-polyfill';
import { ReactComponent as AdaComponentTransparent } from '@lace/icons/dist/AdaComponentTransparent';
import React, { useCallback, useRef, useState } from 'react';
import { Button } from '@lace/ui';
import { TopUpWalletDialog } from './TopUpWalletDialog';
import { useTranslation } from 'react-i18next';
import { BANXA_URL } from './config';

export const TopUpWalletButton = (): React.ReactElement => {
  const dialogTriggerReference = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const url = BANXA_URL;
  const gotoBanxa = useCallback(() => tabs.create({ url }), [url]);

  return (
    <>
      <Button.CallToAction
        icon={<AdaComponentTransparent />}
        label={t('browserView.assets.topupWallet.buyButton.caption')}
        onClick={() => setOpen(true)}
        ref={dialogTriggerReference}
      />
      {open && (
        <TopUpWalletDialog
          onCancel={() => setOpen(false)}
          open={open}
          triggerRef={dialogTriggerReference}
          onConfirm={gotoBanxa}
        />
      )}
    </>
  );
};
