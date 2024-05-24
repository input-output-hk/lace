import { tabs } from 'webextension-polyfill';
import { ReactComponent as AdaComponentTransparent } from '@lace/icons/dist/AdaComponentTransparent';
import React, { useRef, useState } from 'react';
import { Button } from '@lace/ui';
import { TopUpWalletDialog } from './TopUpWalletDialog';
import { useTranslation } from 'react-i18next';
import { BANXA_LACE_URL } from './config';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@lace/common';

export const TopUpWalletButton = (): React.ReactElement => {
  const dialogTriggerReference = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  return (
    <>
      <Button.CallToAction
        icon={<AdaComponentTransparent />}
        label={t('browserView.assets.topupWallet.buyButton.caption')}
        onClick={() => {
          analytics.sendEventToPostHog(PostHogAction.TokenTokensTopYourWalletBuyAdaClick);
          setOpen(true);
        }}
        ref={dialogTriggerReference}
        data-testid="top-up-wallet-card-button"
      />

      <TopUpWalletDialog
        onCancel={() => {
          analytics.sendEventToPostHog(PostHogAction.TokenBuyAdaDisclaimerGoBackClick);
          setOpen(false);
        }}
        open={open}
        triggerRef={dialogTriggerReference}
        onConfirm={() => {
          analytics.sendEventToPostHog(PostHogAction.TokenBuyAdaDisclaimerContinueClick);
          tabs.create({ url: BANXA_LACE_URL });
          setOpen(false);
        }}
      />
    </>
  );
};
