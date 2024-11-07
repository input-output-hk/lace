/* eslint-disable no-magic-numbers */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable consistent-return */
/* eslint-disable unicorn/no-null */
import { i18n } from '@lace/translation';
import React, { useEffect, useState, useMemo } from 'react';
import { useRestoreWallet } from '../context';
import { WalletSetupStepLayoutRevamp, WalletTimelineSteps } from '@lace/core';
import {
  Flex,
  Text,
  TextLink,
  Tooltip,
  WalletComponent as WalletIcon,
  Copy,
  ControlButton
} from '@input-output-hk/lace-ui-toolkit';
import { Wallet } from '@lace/cardano';
import { compactNumberWithUnit } from '@src/utils/format-number';
import { PortfolioBalance } from '@src/views/browser-view/components';
import { addEllipsis, WarningBanner, toast } from '@lace/common';
import { getProviders } from '@src/stores/slices';
import { CARDANO_COIN_SYMBOL, COINGECKO_URL } from '@src/utils/constants';
import BigNumber from 'bignumber.js';
import styles from './WalletOverview.module.scss';
import { useAnalyticsContext } from '@providers';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { useFetchCoinPrice } from '@hooks';

const TOAST_DEFAULT_DURATION = 3;

const handleOpenCoingeckoLink = () => {
  window.open(COINGECKO_URL, '_blank', 'noopener,noreferrer');
};

export const WalletOverview = (): JSX.Element => {
  const coinPricing = useFetchCoinPrice();
  const { postHogActions } = useWalletOnboarding();
  const analytics = useAnalyticsContext();
  const { back, next, walletMetadata } = useRestoreWallet();
  const [walletBalances, setWalletBalances] = useState<{
    ada: BigNumber | null;
    otherItems: Set<Wallet.Cardano.AssetId> | null;
    usdPortfolioBalance: BigNumber | null;
    fetched: boolean;
  }>({
    ada: null,
    otherItems: null,
    usdPortfolioBalance: null,
    fetched: false
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void analytics.sendEventToPostHog(postHogActions.restore.WALLET_SETUP_PAGEVIEW);
  }, [analytics, postHogActions.restore.WALLET_SETUP_PAGEVIEW]);

  useEffect(() => {
    const getData = async () => {
      if (!walletMetadata || !coinPricing.priceResult.cardano.price) return;
      try {
        const { utxoProvider } = getProviders();
        const utxos: Wallet.Cardano.Utxo[] = await utxoProvider.utxoByAddresses({
          addresses: [walletMetadata.address]
        });

        if (!utxos) return;
        const summedBalances = utxos.reduce(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          (acc, [_, output]) => {
            let assetUsdValue = new BigNumber(acc.usdPortfolioBalance);
            const additionalOtherItems = new Set(acc.otherItems);
            if (coinPricing.priceResult?.tokens) {
              output.value.assets?.forEach((value, assetId) => {
                const tokenPrice = coinPricing.priceResult?.tokens?.get(assetId);
                if (tokenPrice)
                  assetUsdValue = assetUsdValue.plus(new BigNumber(tokenPrice.priceInAda).times(value.toString()));

                if (!acc.otherItems.has(assetId)) {
                  additionalOtherItems.add(assetId);
                }
              });
            }

            if (output.value.coins > 0) {
              assetUsdValue = assetUsdValue.plus(
                new BigNumber(Wallet.util.lovelacesToAdaString(output.value.coins.toString())).times(
                  new BigNumber(coinPricing.priceResult.cardano.price)
                )
              );
            }
            return {
              ada: acc.ada.plus(new BigNumber(output.value.coins.toString())),
              otherItems: additionalOtherItems,
              usdPortfolioBalance: assetUsdValue
            };
          },
          {
            ada: new BigNumber(0),
            otherItems: new Set<Wallet.Cardano.AssetId>(),
            usdPortfolioBalance: new BigNumber(0)
          }
        );
        setWalletBalances({ ...summedBalances, fetched: true });
      } finally {
        setIsLoading(false);
      }
    };

    getData();
    return () => {
      setWalletBalances({
        ada: new BigNumber(0),
        otherItems: new Set(),
        usdPortfolioBalance: new BigNumber(0),
        fetched: false
      });
      setIsLoading(true);
    };
  }, [walletMetadata, setIsLoading, setWalletBalances, coinPricing]);

  const handleNext = () => {
    void analytics.sendEventToPostHog(postHogActions.restore.WALLET_OVERVIEW_NEXT_CLICK);
    next();
  };

  const balanceSubtitle = useMemo(() => {
    // Ignore subtitle if loading, or if data could not be fetched
    if (isLoading || (!isLoading && !walletBalances.fetched) || !walletBalances.ada) return '';
    /**
     * Ada symbol shown in overview is based on the chain supplied in the QR code, not the one from the background wallet current chain
     **/
    const networkType =
      walletMetadata.chain === 'Mainnet' ? Wallet.Cardano.NetworkId.Mainnet : Wallet.Cardano.NetworkId.Testnet;
    const adaSymbol = CARDANO_COIN_SYMBOL[networkType];

    let subtitle = `${Wallet.util.lovelacesToAdaString(walletBalances.ada.toString())} ${adaSymbol}`;
    if (walletBalances.otherItems.size > 0) {
      subtitle += ` +${walletBalances.otherItems.size} other asset(s)`;
    }
    return subtitle;
  }, [walletBalances.ada, walletBalances.otherItems, walletMetadata.chain, walletBalances.fetched, isLoading]);

  return (
    <WalletSetupStepLayoutRevamp
      title={i18n.t('paperWallet.walletOverview.title')}
      description={i18n.t('paperWallet.walletOverview.description')}
      onBack={back}
      onNext={handleNext}
      nextLabel={i18n.t('general.button.continue')}
      currentTimelineStep={WalletTimelineSteps.RECOVERY_DETAILS}
    >
      <Flex
        justifyContent="space-between"
        alignItems="stretch"
        w="$fill"
        h="$fill"
        flexDirection="column"
        px="$24"
        pt="$24"
        pb="$16"
        className={styles.overviewContainer}
      >
        <Flex gap="$8" alignItems="center">
          <Flex className={styles.walletIconContainer}>
            <WalletIcon />
          </Flex>
          <Flex flexDirection="column">
            <Text.Label color="secondary">{i18n.t('paperWallet.chooseRestoreMethod.option.paper')}</Text.Label>
            <Text.Body.Small>{i18n.t('paperWallet.WalletOverview.accountZero')}</Text.Body.Small>
          </Flex>
        </Flex>
        <Flex flexDirection="column">
          <Text.Body.Normal weight="$bold" color="secondary">
            {i18n.t('qrInfo.walletAddress')}
          </Text.Body.Normal>
          <Flex alignItems="center" justifyContent="space-between" className={styles.fullWidth}>
            <Tooltip align="center" side="bottom" label={walletMetadata.address}>
              <Text.Body.Large>{addEllipsis(walletMetadata.address, 24, 24)}</Text.Body.Large>
            </Tooltip>
            <ControlButton.Icon
              icon={<Copy height={24} width={24} />}
              onClick={() => {
                navigator.clipboard.writeText(walletMetadata.address);
                toast.notify({ duration: TOAST_DEFAULT_DURATION, text: i18n.t('general.clipboard.copiedToClipboard') });
              }}
              size="small"
            />
          </Flex>
        </Flex>
        <Flex flexDirection="column">
          {walletBalances.fetched && (
            <PortfolioBalance
              textSize="medium"
              loading={isLoading}
              balance={compactNumberWithUnit(walletBalances.usdPortfolioBalance.toString())}
              showInfoTooltip
              currencyCode={
                'USD' // TODO: add support for other currencies
              }
              label={i18n.t('paperWallet.WalletOverview.balanceTitle')}
              balanceSubtitle={{
                value: balanceSubtitle,
                isPercentage: false
              }}
            />
          )}
          {!walletBalances.fetched && !isLoading && (
            <WarningBanner message={i18n.t('general.warnings.cannotFetchPrice')} />
          )}
        </Flex>
        {!isLoading && walletBalances.fetched && (
          <Flex alignItems="center" className={styles.credit}>
            <Text.Label className={styles.creditLink}>{i18n.t('general.credit.poweredBy')}</Text.Label>
            <TextLink
              label={i18n.t('general.credit.coinGecko')}
              onClick={handleOpenCoingeckoLink}
              testId="coingecko-link"
            />
          </Flex>
        )}
      </Flex>
    </WalletSetupStepLayoutRevamp>
  );
};
