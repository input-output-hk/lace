/* eslint-disable no-magic-numbers */
import { i18n } from '@lace/translation';
import React, { useEffect, useState } from 'react';
import { useRestoreWallet } from '../context';
import { WalletSetupStepLayoutRevamp, WalletTimelineSteps } from '@lace/core';
import { Flex, Text, Tooltip, WalletComponent as WalletIcon } from '@input-output-hk/lace-ui-toolkit';
import { Wallet } from '@lace/cardano';
import { compactNumberWithUnit } from '@src/utils/format-number';
import { PortfolioBalance } from '@src/views/browser-view/components';
import { addEllipsis } from '@lace/common';
import { getProviderByChain } from '@src/stores/slices';
import { COINGECKO_URL } from '@src/utils/constants';
import { getADAPriceFromBackgroundStorage } from '@lib/scripts/background/util';
import { currencyCode } from '@providers/currency/constants';
import BigNumber from 'bignumber.js';
import styles from './WalletOverview.module.scss';
import { useCurrencyStore } from '@providers';
import { useWalletStore } from '@src/stores';

const openExternalLink = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

export const WalletOverview = (): JSX.Element => {
  const { back, next, walletMetadata } = useRestoreWallet();
  const [walletAdaBalance, setWalletAdaBalance] = useState<BigNumber>(new BigNumber(0));
  const [isLoading, setIsLoading] = useState(true);
  const [adaPrice, setAdaPrice] = useState<number>(0);
  const { fiatCurrency } = useCurrencyStore();
  const {
    walletUI: { cardanoCoin }
  } = useWalletStore();

  useEffect(() => {
    const getData = async () => {
      if (!walletMetadata) return;
      const { prices } = await getADAPriceFromBackgroundStorage();
      const { utxoProvider } = getProviderByChain(walletMetadata.chain);
      const utxos: Wallet.Cardano.Utxo[] = await utxoProvider.utxoByAddresses({ addresses: [walletMetadata.address] });
      const summedBalance = utxos.reduce(
        (acc, utxo) => acc.plus(new BigNumber(utxo[1].value.coins.toString())),
        new BigNumber(0)
      );
      setWalletAdaBalance(summedBalance);
      if (!!prices && !!prices['usd' as currencyCode]) setAdaPrice(prices['usd' as currencyCode]);
      setIsLoading(false);
    };

    getData();

    return () => {
      setWalletAdaBalance(new BigNumber(0));
      setAdaPrice(0);
      setIsLoading(true);
    };
  }, [walletMetadata, setIsLoading, setWalletAdaBalance]);

  return (
    <WalletSetupStepLayoutRevamp
      title={i18n.t('paperWallet.walletOverview.title')}
      description={i18n.t('paperWallet.walletOverview.description')}
      onBack={back}
      onNext={next}
      nextLabel="Proceed"
      currentTimelineStep={WalletTimelineSteps.RECOVERY_DETAILS}
      paperWalletEnabled
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
        <Flex className={styles.walletIconContainer}>
          <WalletIcon />
        </Flex>
        <Flex flexDirection="column" gap="$8">
          <Text.Body.Normal weight="$bold" color="secondary">
            {i18n.t('qrInfo.walletAddress')}
          </Text.Body.Normal>
          <Tooltip align="bottom" side="bottom" label={walletMetadata.address}>
            <Text.Body.Large>{addEllipsis(walletMetadata.address, 28, 28)}</Text.Body.Large>
          </Tooltip>
        </Flex>
        <Flex flexDirection="column">
          <PortfolioBalance
            textSize="medium"
            loading={isLoading}
            balance={compactNumberWithUnit(Wallet.util.lovelacesToAdaString(walletAdaBalance.toString()))}
            currencyCode={cardanoCoin.symbol}
            label={i18n.t('browserView.assetDetails.assetBalance')}
            balanceSubtitle={
              !!adaPrice && {
                value: `${compactNumberWithUnit(
                  new BigNumber(Wallet.util.lovelacesToAdaString(walletAdaBalance.toString()))
                    .times(adaPrice)
                    .toString()
                )} ${fiatCurrency.code}`,
                isPercentage: false
              }
            }
          />
        </Flex>
        {!!adaPrice && (
          <Flex gap="$4" alignItems="center">
            <Text.Label className={styles.creditLink}>{i18n.t('general.credit.poweredBy')}</Text.Label>
            <a
              className={styles.creditLink}
              onClick={() => openExternalLink(COINGECKO_URL)}
              data-testid="coingecko-link"
            >
              {i18n.t('general.credit.coinGecko')}
            </a>
          </Flex>
        )}
      </Flex>
    </WalletSetupStepLayoutRevamp>
  );
};
