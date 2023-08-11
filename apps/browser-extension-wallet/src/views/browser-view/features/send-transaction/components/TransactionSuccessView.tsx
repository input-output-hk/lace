/* eslint-disable no-lonely-if */
import { ResultMessage } from '@components/ResultMessage';
import { TransactionHashBox } from '@components/TransactionHashBox';
import { useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import {
  useBuiltTxState,
  useAnalyticsSendFlowTriggerPoint,
  useOutputs,
  OutputList
} from '@views/browser/features/send-transaction';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './TransactionSuccessView.module.scss';
import { useWalletStore } from '@src/stores';
import { useObservable } from '@lace/common';
import BigNumber from 'bignumber.js';
import { Wallet } from '@lace/cardano';
import { isNFT } from '@src/utils/is-nft';
import flatMapDeep from 'lodash/flatMapDeep';

interface TokenAnalyticsProperties {
  id: string;
  name?: string;
  ticker?: string;
  amount: string;
}

const getCardanoCoinAnalyticsProperties = (cardanoCoin: Wallet.CoinId, amount: string) => ({
  id: cardanoCoin.id,
  name: cardanoCoin.name,
  ticker: cardanoCoin.symbol,
  amount
});

const getAssetAnalyticsProperties = (assetsMap: Wallet.Assets, id: string, amount: string) => {
  const info = assetsMap.get(Wallet.Cardano.AssetId(id));
  const name = isNFT(info) ? info?.nftMetadata?.name : info?.tokenMetadata?.name;
  const ticker = info?.tokenMetadata?.ticker;
  return { id: info?.fingerprint, amount, name, ticker };
};

const getTokensProperty = (outputs: OutputList, assetsMap: Wallet.Assets, cardanoCoin: Wallet.CoinId) => {
  const tokensAnalyticsPropertyMap = new Map<string, TokenAnalyticsProperties>();
  // gets an array of assets sent in each tx output
  const sentAssets = Object.values(outputs).map(({ assets }) => assets);
  // flat the array
  const flattedSentAssets = flatMapDeep(sentAssets);

  for (const { id: key, value } of flattedSentAssets) {
    const tokensAnalyticsProperty = tokensAnalyticsPropertyMap.get(key);

    if (tokensAnalyticsProperty) {
      // if the token exists in the property map, add the amount to the current amount in the map
      const amount = new BigNumber(tokensAnalyticsProperty.amount).plus(value).toString();
      tokensAnalyticsPropertyMap.set(key, { ...tokensAnalyticsProperty, amount });
    } else {
      // if the token don't exists in the property map, get the properties
      const properties =
        key === cardanoCoin.id
          ? getCardanoCoinAnalyticsProperties(cardanoCoin, value)
          : getAssetAnalyticsProperties(assetsMap, key, value);

      tokensAnalyticsPropertyMap.set(key, properties);
    }
  }
  return [...tokensAnalyticsPropertyMap.values()];
};

export const TransactionSuccessView = ({ footerSlot }: { footerSlot?: React.ReactElement }): React.ReactElement => {
  const { t } = useTranslation();
  const { builtTxData: { uiTx: { hash } = {} } = {} } = useBuiltTxState();
  const { uiOutputs } = useOutputs();
  const { triggerPoint } = useAnalyticsSendFlowTriggerPoint();
  const analytics = useAnalyticsContext();
  const {
    inMemoryWallet,
    walletUI: { cardanoCoin }
  } = useWalletStore();
  const assets = useObservable(inMemoryWallet.assetInfo$);
  const [customAnalyticsProperties, setCustomAnalyticsProperties] = useState<TokenAnalyticsProperties[]>();

  useEffect(() => {
    // run this only when assets value was emitted and customAnalyticsProperties is undefined
    if (assets && !customAnalyticsProperties) {
      setCustomAnalyticsProperties(getTokensProperty(uiOutputs, assets, cardanoCoin));
    }
  }, [assets, cardanoCoin, customAnalyticsProperties, uiOutputs]);

  useEffect(() => {
    // send analytics event after customAnalyticsProperties was set
    if (customAnalyticsProperties) {
      analytics.sendEventToPostHog(PostHogAction.SendAllDoneView, {
        // eslint-disable-next-line camelcase
        trigger_point: triggerPoint,
        tokens: customAnalyticsProperties
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customAnalyticsProperties]);

  return (
    <>
      <div className={styles.successTxContainer} data-testid="transaction-success-container">
        <ResultMessage
          title={<div>{t('browserView.transaction.success.youCanSafelyCloseThisPanel')}</div>}
          description={<div>{t('browserView.transaction.success.thisMayTakeAFewMinutes')}</div>}
        />
        <TransactionHashBox hash={hash?.toString()} />
      </div>
      {footerSlot}
    </>
  );
};
