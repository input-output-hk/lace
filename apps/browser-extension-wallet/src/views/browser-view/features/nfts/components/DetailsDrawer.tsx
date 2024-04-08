/* eslint-disable unicorn/no-nested-ternary */
import React, { ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NftDetail } from '@lace/core';
import { Wallet } from '@lace/cardano';
import isNil from 'lodash/isNil';
import { Button, Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { buttonIds } from '@hooks/useEnterKeyPress';
import { NFT } from '@src/utils/get-token-list';
import { nftDetailSelector, nftNameSelector } from '../selectors';
import styles from './DetailsDrawer.module.scss';
import { useWalletStore } from '@stores';

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
  const { environmentName } = useWalletStore();
  const assetInfo = useMemo(
    () => (isNil(assetsInfo) ? undefined : assetsInfo.get(selectedNft?.assetId)),
    [selectedNft, assetsInfo]
  );

  return (
    <Drawer
      visible={!!selectedNft}
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
          <NftDetail {...nftDetailSelector(assetInfo)} amount={selectedNft.amount} />
        </div>
      )}
    </Drawer>
  );
};
