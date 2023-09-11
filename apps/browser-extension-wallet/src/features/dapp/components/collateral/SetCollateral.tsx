import React from 'react';
import { useTranslation } from 'react-i18next';
import { APIErrorCode, ApiError } from '@cardano-sdk/dapp-connector';
import { Banner, Button } from '@lace/common';
import { DappInfo } from '@lace/core';

import { Layout } from '../Layout';
import { DappSetCollateralProps } from './types';
import { Wallet } from '@lace/cardano';
import { useWalletStore } from '@src/stores';
import styles from '../Connect.module.scss';
import collateralStyles from './styles.module.scss';

export const DappSetCollateral = ({
  dappInfo,
  collateralInfo,
  confirm,
  reject
}: DappSetCollateralProps): React.ReactElement => {
  const { t } = useTranslation();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();

  return (
    <Layout
      pageClassname={styles.spaceBetween}
      title={t('dapp.collateral.set.header')}
      data-testid="dapp-set-collateral-layout"
    >
      <div className={collateralStyles.container}>
        <DappInfo {...dappInfo} />
        <div className={collateralStyles.collateralDescription} data-testid="collateral-modal-description">
          {t('dapp.collateral.request', {
            dapp: dappInfo.url,
            requestedAmount: Wallet.util.lovelacesToAdaString(collateralInfo.amount.toString()),
            lockableAmount: Wallet.util.lovelacesToAdaString(collateralInfo.lockableAmount.toString()),
            symbol: cardanoCoin.symbol
          })}
        </div>
        <div className={styles.bannerContainer}>
          <Banner withIcon message={t('dapp.collateral.amountSeparated')} />
        </div>
        <div className={styles.footer}>
          <Button block data-testid="collateral-set-accept" onClick={confirm}>
            {t('browserView.settings.wallet.collateral.confirm')}
          </Button>
          <Button
            block
            data-testid="collateral-set-cancel"
            onClick={() => reject(new ApiError(APIErrorCode.Refused, 'User declined to set collateral'))}
            color="secondary"
          >
            {t('general.button.cancel')}
          </Button>
        </div>
      </div>
    </Layout>
  );
};
