/* eslint-disable unicorn/no-nested-ternary */
import React, { ReactElement, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NftDetail } from '@lace/core';
import { Wallet } from '@lace/cardano';
import isNil from 'lodash/isNil';
import { Button, Drawer, DrawerHeader, DrawerNavigation, PostHogAction, toast } from '@lace/common';
import { buttonIds } from '@hooks/useEnterKeyPress';
import { NFT } from '@src/utils/get-token-list';
import { nftDetailSelector, nftNameSelector } from '../selectors';
import styles from './DetailsDrawer.module.scss';
import { useWalletStore } from '@stores';
import { useWalletAvatar } from '@hooks';
import { useAnalyticsContext, useExternalLinkOpener } from '@providers';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { NFTPrintLabDialog } from './NFTPrintLabDialog';

export const NFTPRINTLAB_URL = process.env.NFTPRINTLAB_URL;

interface GeneralSettingsDrawerProps {
  onClose: () => void;
  onSend?: () => void;
  selectedNft: NFT;
  assetsInfo: Map<Wallet.Cardano.AssetId, Wallet.Asset.AssetInfo>;
}

export const DetailsDrawer = ({
  onClose,
  selectedNft,
  assetsInfo = new Map(),
  onSend
}: GeneralSettingsDrawerProps): ReactElement => {
  const [nftPrintLabDialogOpen, setNftPrintLabDialogOpen] = useState(false);
  const { t } = useTranslation();
  const {
    walletUI: { appMode },
    currentChain
  } = useWalletStore();
  const posthog = usePostHogClientContext();
  const assetInfo = useMemo(
    () => (isNil(assetsInfo) ? undefined : assetsInfo.get(selectedNft?.assetId)),
    [selectedNft, assetsInfo]
  );
  const { setAvatar } = useWalletAvatar();
  const analytics = useAnalyticsContext();
  const openExternalLink = useExternalLinkOpener();

  const nftDetailTranslation = {
    tokenInformation: t('core.nftDetail.tokenInformation'),
    attributes: t('core.nftDetail.attributes'),
    setAsAvatar: t('core.nftDetail.setAsAvatar'),
    directory: t('core.nftDetail.directory'),
    printNft: t('core.nftDetail.printNft')
  };

  const handleSetAsAvatar = (image: string) => {
    setAvatar(image);
    toast.notify({ text: t('core.nftDetail.avatarUpdated') });
    void analytics.sendEventToPostHog(PostHogAction.NFTDetailSetAsAvatarClick);
  };

  const handleOpenTabNFTPrintLab = useCallback(() => {
    analytics.sendEventToPostHog(PostHogAction.NFTDetailPrintClick);
    setNftPrintLabDialogOpen(true);
  }, [analytics]);

  const isMainnet = currentChain?.networkMagic === Wallet.Cardano.NetworkMagics.Mainnet;
  const canPrintNft = isMainnet && posthog?.isFeatureFlagEnabled('nftprintlab');

  return (
    <>
      <Drawer
        open={!!selectedNft}
        onClose={onClose}
        title={assetInfo ? <DrawerHeader title={nftNameSelector(assetInfo)} /> : undefined}
        navigation={
          selectedNft ? <DrawerNavigation title={t('core.nftDetail.title')} onCloseIconClick={onClose} /> : undefined
        }
        dataTestId="nft-details-drawer"
        footer={
          <div>
            <Button className={styles.sendButton} onClick={onSend} id={buttonIds.nftDetailsBtnId}>
              {t('browserView.crypto.nft.send')}
            </Button>
          </div>
        }
      >
        {selectedNft && assetInfo && (
          <div className={styles.wrapper}>
            <NftDetail
              {...nftDetailSelector(assetInfo)}
              isPopup={appMode === APP_MODE_POPUP}
              amount={selectedNft.amount}
              translations={nftDetailTranslation}
              onSetAsAvatar={handleSetAsAvatar}
              onPrintNft={canPrintNft ? handleOpenTabNFTPrintLab : undefined}
            />
          </div>
        )}
      </Drawer>
      <NFTPrintLabDialog
        onCancel={() => {
          analytics.sendEventToPostHog(PostHogAction.NFTPrintLabDisclaimerCancelClick);
          setNftPrintLabDialogOpen(false);
        }}
        open={nftPrintLabDialogOpen}
        onConfirm={() => {
          analytics.sendEventToPostHog(PostHogAction.NFTPrintLabDisclaimerConfirmClick);
          openExternalLink(NFTPRINTLAB_URL);
          setNftPrintLabDialogOpen(false);
        }}
      />
    </>
  );
};
