import { useAssetInfo, useRedirection } from '@hooks';
import { walletRoutePaths } from '@routes';
import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import styles from './Nfts.module.scss';
import { Button, Drawer, DrawerNavigation, useObservable } from '@lace/common';
import { useWalletStore } from '@src/stores';
import { nftDetailSelector } from '@src/views/browser-view/features/nfts/selectors';
import { NftDetail as NftDetailView } from '@lace/core';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { SendFlowTriggerPoints, useOutputInitialState } from '@src/views/browser-view/features/send-transaction';
import { DEFAULT_WALLET_BALANCE, SEND_NFT_DEFAULT_AMOUNT } from '@src/utils/constants';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { useAnalyticsContext } from '@providers';
import { buttonIds } from '@hooks/useEnterKeyPress';

export const NftDetail = (): React.ReactElement => {
  const { inMemoryWallet } = useWalletStore();
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();

  const redirectToNfts = useRedirection(walletRoutePaths.nfts);
  const redirectToSend = useRedirection<{ params: { id?: string } }>(walletRoutePaths.send);
  const { id } = useParams<{ id: string }>();
  const assetsInfo = useAssetInfo();
  const setSendInitialState = useOutputInitialState();

  const assetId = Wallet.Cardano.AssetId(id);
  const assetInfo = assetsInfo?.get(assetId);
  const assetsBalance = useObservable(inMemoryWallet.balance.utxo.total$, DEFAULT_WALLET_BALANCE.utxo.total$);
  const bigintBalance = assetsBalance?.assets?.get(assetId) || BigInt(1);

  const amount = useMemo(() => Wallet.util.calculateAssetBalance(bigintBalance, assetInfo), [assetInfo, bigintBalance]);

  const nftDetailTranslation = {
    tokenInformation: t('core.nftDetail.tokenInformation'),
    attributes: t('core.nftDetail.attributes'),
    setAsAvatar: t('core.nftDetail.setAsAvatar')
  };

  const handleOpenSend = () => {
    // eslint-disable-next-line camelcase
    analytics.sendEventToPostHog(PostHogAction.SendClick, { trigger_point: SendFlowTriggerPoints.NFTS });
    setSendInitialState(id, SEND_NFT_DEFAULT_AMOUNT);
    redirectToSend({ params: { id } });
  };

  return (
    <Drawer
      popupView
      className={styles.drawer}
      visible
      navigation={<DrawerNavigation onArrowIconClick={() => redirectToNfts()} />}
      dataTestId="nft-details-drawer"
      footer={
        <div className={styles.footer}>
          <Button id={buttonIds.nftDetailsBtnId} className={styles.sendBtn} onClick={handleOpenSend}>
            {t('core.nftDetail.sendNFT')}
          </Button>
        </div>
      }
    >
      {assetInfo && (
        <NftDetailView
          {...nftDetailSelector(assetInfo)}
          amount={amount}
          translations={nftDetailTranslation}
          title={<h2 className={styles.secondaryTitle}>{assetInfo.nftMetadata?.name ?? assetInfo.fingerprint}</h2>}
        />
      )}
    </Drawer>
  );
};
