/* eslint-disable no-magic-numbers */
import { i18n } from '@lace/translation';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useRestoreWallet } from '../context';
import { WalletSetupStepLayoutRevamp, WalletTimelineSteps } from '@lace/core';
import {
  Flex,
  Text,
  TextLink,
  Tooltip,
  WalletComponent as WalletIcon,
  InfoComponent as InfoIcon
} from '@input-output-hk/lace-ui-toolkit';
import { Wallet } from '@lace/cardano';
import { compactNumberWithUnit } from '@src/utils/format-number';
import { PortfolioBalance } from '@src/views/browser-view/components';
import { addEllipsis } from '@lace/common';
import { getProviderByChain } from '@src/stores/slices';
import { CARDANO_COIN_SYMBOL, COINGECKO_URL } from '@src/utils/constants';
import { getADAPriceFromBackgroundStorage } from '@lib/scripts/background/util';
import { currencyCode } from '@providers/currency/constants';
import BigNumber from 'bignumber.js';
import styles from './WalletOverview.module.scss';
import { useAnalyticsContext, useCurrencyStore } from '@providers';
import { useWalletOnboarding } from '../../walletOnboardingContext';

export const WalletOverview = (): JSX.Element => {
  const { postHogActions } = useWalletOnboarding();
  const analytics = useAnalyticsContext();
  const { back, next, walletMetadata } = useRestoreWallet();
  const [walletBalances, setWalletBalances] = useState<{ ada: BigNumber; otherItems: number }>({
    ada: new BigNumber(0),
    otherItems: 990
  });
  const [isLoading, setIsLoading] = useState(true);
  const [adaPrice, setAdaPrice] = useState<number>(0);
  const { fiatCurrency } = useCurrencyStore();

  useEffect(() => {
    const getData = async () => {
      if (!walletMetadata) return;
      const { prices } = await getADAPriceFromBackgroundStorage();
      const { utxoProvider } = getProviderByChain(walletMetadata.chain);
      const utxos: Wallet.Cardano.Utxo[] = await utxoProvider.utxoByAddresses({ addresses: [walletMetadata.address] });

      const summedBalances = utxos.reduce(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (acc, [_, output]) => ({
          ada: acc.ada.plus(new BigNumber(output.value.coins.toString())),
          otherItems: acc.otherItems + (output.value.assets?.size || 0)
        }),
        { ada: new BigNumber(0), otherItems: 0 }
      );
      setWalletBalances(summedBalances);
      if (!!prices && !!prices['usd' as currencyCode]) setAdaPrice(prices['usd' as currencyCode]);
      setIsLoading(false);
    };

    getData();

    return () => {
      setWalletBalances({ ada: new BigNumber(0), otherItems: 0 });
      setAdaPrice(0);
      setIsLoading(true);
    };
  }, [walletMetadata, setIsLoading, setWalletBalances]);

  const handleOpenCoingeckoLink = useCallback(() => {
    window.open(COINGECKO_URL, '_blank', 'noopener,noreferrer');
  }, []);

  const adaSymbol = useMemo(() => {
    /**
     * Ada symbol shown in overview is based on the chain supplied in the QR code, not the one from the background wallet current chain
     **/
    const networkType =
      walletMetadata.chain === 'Mainnet' ? Wallet.Cardano.NetworkId.Mainnet : Wallet.Cardano.NetworkId.Testnet;
    return CARDANO_COIN_SYMBOL[networkType];
  }, [walletMetadata.chain]);

  const adaBalanceInUsd = useMemo(
    () =>
      !!adaPrice && {
        value: `${compactNumberWithUnit(
          new BigNumber(Wallet.util.lovelacesToAdaString(walletBalances.ada.toString())).times(adaPrice).toString()
        )} ${fiatCurrency.code}`,
        isPercentage: false
      },
    [adaPrice, fiatCurrency.code, walletBalances.ada]
  );

  const handleNext = () => {
    void analytics.sendEventToPostHog(postHogActions.restore.WALLET_OVERVIEW_NEXT_CLICK);
    next();
  };

  return (
    <WalletSetupStepLayoutRevamp
      title={i18n.t('paperWallet.walletOverview.title')}
      description={i18n.t('paperWallet.walletOverview.description')}
      onBack={back}
      onNext={handleNext}
      nextLabel="Proceed"
      currentTimelineStep={WalletTimelineSteps.RECOVERY_DETAILS}
    >
      <Flex
        gap="$8"
        alignItems="stretch"
        w="$fill"
        h="$fill"
        flexDirection="column"
        px="$24"
        pt="$24"
        pb="$16"
        className={styles.overviewContainer}
      >
        <Flex flexDirection="column" gap="$8">
          <Flex className={styles.walletIconContainer}>
            <WalletIcon />
          </Flex>
          <Text.Body.Normal weight="$bold" color="secondary">
            {i18n.t('qrInfo.walletAddress')}
          </Text.Body.Normal>
          <Tooltip align="bottom" side="bottom" label={walletMetadata.address}>
            <Text.Body.Large>{addEllipsis(walletMetadata.address, 28, 28)}</Text.Body.Large>
          </Tooltip>
        </Flex>
        <Flex flexDirection="row" justifyContent="space-between">
          <Flex flexDirection="column" gap="$8">
            <PortfolioBalance
              textSize="medium"
              loading={isLoading}
              balance={compactNumberWithUnit(Wallet.util.lovelacesToAdaString(walletBalances.ada.toString()))}
              currencyCode={adaSymbol}
              label={i18n.t('browserView.crypto.dashboard.adaBalance')}
              balanceSubtitle={adaBalanceInUsd}
            />
            {!!adaPrice && (
              <Flex alignItems="center" className={styles.credit}>
                <Text.Label className={styles.creditLink}>{i18n.t('general.credit.poweredBy')}</Text.Label>
                <TextLink
                  label={i18n.t('general.credit.coinGecko')}
                  onClick={handleOpenCoingeckoLink}
                  data-testid="coingecko-link"
                />
              </Flex>
            )}
          </Flex>
          {walletBalances.otherItems > 0 && !isLoading && (
            <Flex justifyContent="center" gap="$8" h="$fill" alignItems="center" pb="$16">
              <Flex alignItems="baseline">
                <Text.PageHeading>{compactNumberWithUnit(walletBalances.otherItems, 0)}</Text.PageHeading>
                <Tooltip side="right" align="center" label={i18n.t('paperWallet.WalletOverview.otherItemsTooltip')}>
                  <Text.Body.Large color="secondary" weight="$bold">
                    {i18n.t('paperWallet.WalletOverview.otherItemsHeading')}
                  </Text.Body.Large>
                  <InfoIcon className={styles.infoIcon} />
                </Tooltip>
              </Flex>
            </Flex>
          )}
        </Flex>
      </Flex>
    </WalletSetupStepLayoutRevamp>
  );
};
