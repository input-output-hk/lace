/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers */
import React, { useMemo } from 'react';
import { Button, Card, Divider, Flex, Text, InfoComponent, Tooltip } from '@input-output-hk/lace-ui-toolkit';
import { Drawer, DrawerNavigation, PostHogAction } from '@lace/common';
import { useWalletStore } from '@src/stores';
import styles from '../SwapContainer.module.scss';
import { TxDetailsCBOR } from '@lace/core';
import ArrowDown from '@assets/icons/arrow-down.component.svg';
import { SwapStage } from '../../types';
import { useSwaps } from '../SwapProvider';
import { getAssetImageUrl } from '@src/utils/get-asset-image-url';
import { Cardano, Serialization } from '@cardano-sdk/core';
import { useTranslation } from 'react-i18next';
import { getSwapQuoteSources } from '../../util';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { Wallet } from '@lace/cardano';
import CardanoLogo from '../../../../../../assets/icons/browser-view/cardano-logo.svg';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';

const ITEM_STYLE = {
  borderRadius: '100%',
  borderColor: 'lightgrey',
  borderWidth: 1,
  display: 'flex',
  justifyContent: 'center'
};

export const SwapReviewDrawer = (): JSX.Element => {
  const { t } = useTranslation();
  const posthog = usePostHogClientContext();
  const { isHardwareWallet } = useWalletStore();
  const {
    tokenA,
    tokenB,
    estimate,
    quantity,
    setStage,
    stage,
    unsignedTx,
    signAndSubmitSwapRequest,
    targetSlippage,
    setUnsignedTx
  } = useSwaps();

  // unsignedTx is guaranteed to be non-null due to conditional rendering in SwapContainer,
  // but add defensive check for type safety
  const unsignedTxFromCbor = unsignedTx ? Serialization.Transaction.fromCbor(unsignedTx.tx) : null;

  const details = useMemo(() => {
    if (!unsignedTxFromCbor || !estimate) {
      return { quoteRatio: '0', networkFee: '0', serviceFee: '0' };
    }
    return {
      quoteRatio: `${Number(estimate.price.toFixed(5))} per ${tokenA.description}`,
      networkFee: Wallet.util.lovelacesToAdaString(unsignedTxFromCbor.body().fee().toString()),
      serviceFee: Wallet.util.lovelacesToAdaString(estimate.totalFee.toString())
    };
  }, [estimate, unsignedTxFromCbor, tokenA]);

  // Early return after hooks
  if (!unsignedTx || !estimate || !unsignedTxFromCbor) {
    return <></>;
  }

  return (
    <Drawer
      open={stage === SwapStage.SwapReview}
      onClose={() => {
        setStage(SwapStage.Initial);
        setUnsignedTx(null);
      }}
      navigation={
        <DrawerNavigation
          title={t('swaps.pageHeading')}
          onCloseIconClick={() => {
            setStage(SwapStage.Initial);
            setUnsignedTx(null);
          }}
        />
      }
      dataTestId="swap-summary-drawer"
      footer={
        <Button.CallToAction
          label={t('swaps.btn.proceed')}
          w="$fill"
          onClick={() => {
            posthog.sendEvent(PostHogAction.SwapsReviewQuote);
            isHardwareWallet ? withSignTxConfirmation(() => signAndSubmitSwapRequest()) : setStage(SwapStage.SignTx);
          }}
        />
      }
      maskClosable
    >
      <Flex flexDirection="column" justifyContent="space-between" alignItems="stretch" gap="$8">
        <Flex flexDirection="column" gap="$8" w="$fill">
          <Text.SubHeading>{t('swaps.reviewStage.heading')}</Text.SubHeading>
          <Text.Body.Normal>{t('swaps.reviewStage.description')}</Text.Body.Normal>
        </Flex>
        <Flex flexDirection="column" w="$fill" gap="$8" alignItems="center">
          <Card.Greyed className={styles.swapTokenCard}>
            <Flex w="$fill" justifyContent="space-between" flexDirection="row" alignItems="center">
              <Flex gap="$24" alignItems="center">
                <div style={ITEM_STYLE}>
                  <img
                    alt={tokenA.name}
                    src={tokenA.description === 'ADA' ? CardanoLogo : getAssetImageUrl(tokenA.logo)}
                    style={{ width: 48, height: 48, borderRadius: '100%' }}
                  />
                </div>
                <Flex flexDirection="column">
                  <Text.Body.Large color="primary" weight="$semibold">
                    {tokenA.name}
                  </Text.Body.Large>
                  <Text.Body.Normal color="secondary" weight="$semibold">
                    {tokenA.description}
                  </Text.Body.Normal>
                </Flex>
              </Flex>
              <Flex flexDirection="column">
                <Text.Body.Large color="primary" weight="$semibold">
                  {quantity}
                </Text.Body.Large>
              </Flex>
            </Flex>
          </Card.Greyed>
          <Card.Outlined className={styles.swapArrow}>
            <ArrowDown />
          </Card.Outlined>
          <Card.Greyed className={styles.swapTokenCard}>
            <Flex w="$fill" justifyContent="space-between" flexDirection="row" alignItems="center">
              <Flex gap={'$24'} alignItems="center">
                <div style={ITEM_STYLE}>
                  <img
                    alt={tokenB.name}
                    src={
                      tokenB.ticker === 'ADA'
                        ? CardanoLogo
                        : `${process.env.ASSET_CDN_URL}/lace/image/${Cardano.AssetFingerprint.fromParts(
                            Cardano.PolicyId(tokenB.policyId),
                            Cardano.AssetName(tokenB.policyName)
                          )}`
                    }
                    style={{ width: 48, height: 48, borderRadius: '100%' }}
                  />
                </div>
                <Flex flexDirection="column">
                  <Text.Body.Large color="primary" weight="$semibold">
                    {tokenB.name}
                  </Text.Body.Large>
                  <Text.Body.Normal color="secondary" weight="$semibold">
                    {tokenB.ticker}
                  </Text.Body.Normal>
                </Flex>
              </Flex>
              <Flex flexDirection="column">
                <Text.Body.Large color="primary" weight="$semibold">
                  {tokenB.decimals > 0
                    ? (estimate.quantityB / Math.pow(10, tokenB.decimals)).toFixed(tokenB.decimals)
                    : estimate.quantityB.toString()}
                </Text.Body.Large>
              </Flex>
            </Flex>
          </Card.Greyed>
          <Flex flexDirection="column" gap="$16" w={'$fill'}>
            <Flex alignItems="center" justifyContent="space-between" w={'$fill'}>
              <Flex gap="$8">
                <Text.Body.Normal weight="$semibold">{t('swaps.reviewStage.detail.slippage')}</Text.Body.Normal>
                <Tooltip label={t('swaps.reviewStage.tooltip.slippage')} align="start" side="bottom">
                  <InfoComponent data-testid="slippage-info" />
                </Tooltip>
              </Flex>
              <Text.Body.Normal>{targetSlippage}%</Text.Body.Normal>
            </Flex>
            <Flex alignItems="center" justifyContent="space-between" w={'$fill'}>
              <Flex gap="$8">
                <Text.Body.Normal weight="$semibold">{t('swaps.quoteSourceRoute.detail')}</Text.Body.Normal>
                <Tooltip label={t('swaps.reviewStage.tooltip.swapRoute')} align="start" side="bottom">
                  <InfoComponent data-testid="swap-route-info" />
                </Tooltip>
              </Flex>
              <Text.Body.Normal>
                SteelSwap {t('swaps.quoteSourceRoute.via', { swapRoutes: getSwapQuoteSources(estimate.splitGroup) })}
              </Text.Body.Normal>
            </Flex>
            <Flex alignItems="center" justifyContent="space-between" w={'$fill'}>
              <Text.Body.Normal weight="$semibold">{t('swaps.reviewStage.detail.quoteRatio')}</Text.Body.Normal>
              <Flex>
                <Text.Body.Normal>{details?.quoteRatio}</Text.Body.Normal>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
        <Divider />
        <Flex flexDirection="column" gap="$24">
          <Text.SubHeading weight="$bold">{t('swaps.reviewStage.transactionCosts.heading')}</Text.SubHeading>
          <Flex flexDirection="column" w={'$fill'}>
            <Flex alignItems="center" justifyContent="space-between" w={'$fill'}>
              <Flex gap="$8">
                <Text.Body.Normal weight="$semibold">
                  {t('swaps.reviewStage.transactionsCosts.networkFee')}
                </Text.Body.Normal>
                <Tooltip label={t('swaps.reviewStage.tooltip.networkFee')} align="start" side="bottom">
                  <InfoComponent data-testid="network-fee-info" />
                </Tooltip>
              </Flex>
              <Flex>
                <Text.Body.Normal>{details?.networkFee} ADA</Text.Body.Normal>
              </Flex>
            </Flex>
            <Flex alignItems="center" justifyContent="space-between" w={'$fill'}>
              <Flex gap="$8">
                <Text.Body.Normal weight="$semibold">
                  {t('swaps.reviewStage.transactionsCosts.serviceFee')}
                </Text.Body.Normal>
                <Tooltip label={t('swaps.reviewStage.tooltip.serviceFee')} align="start" side="bottom">
                  <InfoComponent data-testid="service-fee-info" />
                </Tooltip>
              </Flex>
              <Flex>
                <Text.Body.Normal>{details?.serviceFee} ADA</Text.Body.Normal>
              </Flex>
            </Flex>
          </Flex>
        </Flex>
        <Divider />
        <Flex flexDirection="column" />
        <TxDetailsCBOR cbor={unsignedTx.tx} />
      </Flex>
    </Drawer>
  );
};
