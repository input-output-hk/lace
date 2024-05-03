/* eslint-disable unicorn/no-nested-ternary */
import React, { ReactElement, useMemo } from 'react';
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
import { useAnalyticsContext } from '@providers';
import { APP_MODE_POPUP } from '@src/utils/constants';

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
  const { t } = useTranslation();
  const {
    environmentName,
    walletUI: { appMode }
  } = useWalletStore();
  const assetInfo = useMemo(
    () => (isNil(assetsInfo) ? undefined : assetsInfo.get(selectedNft?.assetId)),
    [selectedNft, assetsInfo]
  );
  const { setAvatar } = useWalletAvatar();
  const analytics = useAnalyticsContext();

  const nftDetailTranslation = {
    tokenInformation: t('core.nftDetail.tokenInformation'),
    attributes: t('core.nftDetail.attributes'),
    setAsAvatar: t('core.nftDetail.setAsAvatar'),
    directory: t('core.nftDetail.directory')
  };

  const handleSetAsAvatar = (image: string) => {
    setAvatar(image);
    toast.notify({ text: t('core.nftDetail.avatarUpdated') });
    void analytics.sendEventToPostHog(PostHogAction.NFTDetailSetAsAvatarClick);
  };

  return (
    <Drawer
      open={!!selectedNft}
      onClose={onClose}
      title={assetInfo ? <DrawerHeader title={nftNameSelector(assetInfo, environmentName)} /> : undefined}
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
          />
        </div>
      )}
    </Drawer>
  );
};
