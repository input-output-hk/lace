import { AdaComponentTransparent, Button } from '@input-output-hk/lace-ui-toolkit';
import React, { useRef, useState } from 'react';
import { TopUpWalletDialog } from './TopUpWalletDialog';
import { useTranslation } from 'react-i18next';
import { useAnalyticsContext, useExternalLinkOpener } from '@providers';
import { PostHogAction } from '@lace/common';
import { useCurrentBlockchain } from '@src/multichain';
import SvgBtcComponentTransparent from './SvgBtcComponentTransparent';
import { getBanxaUrl } from './utils';
import { useWalletStore } from '@src/stores';

export const TopUpWalletButton = (): React.ReactElement => {
  const dialogTriggerReference = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();
  const openExternalLink = useExternalLinkOpener();
  const { blockchain } = useCurrentBlockchain();
  const { walletInfo } = useWalletStore();
  const walletAddress = walletInfo ? walletInfo.addresses[0].address.toString() : '';
  const isBitcoin = blockchain === 'bitcoin';

  return (
    <>
      <Button.CallToAction
        icon={!isBitcoin ? <AdaComponentTransparent /> : <SvgBtcComponentTransparent />}
        label={
          !isBitcoin
            ? t('browserView.assets.topupWallet.buyButton.caption')
            : t('browserView.assets.topupWallet.buyButton.captionBtc')
        }
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
          openExternalLink(getBanxaUrl({ blockchain, walletAddress }));
          setOpen(false);
        }}
      />
    </>
  );
};
