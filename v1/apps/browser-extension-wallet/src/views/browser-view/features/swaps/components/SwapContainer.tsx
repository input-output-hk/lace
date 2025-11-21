/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable complexity */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers */
import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { Layout, SectionLayout, EducationalList, WarningModal } from '@src/views/browser-view/components';
import { useTranslation } from 'react-i18next';
import { PlusCircleOutlined } from '@ant-design/icons';
import ChevronNormal from '@assets/icons/chevron-down.component.svg';
import ArrowDown from '@assets/icons/arrow-down.component.svg';
import AdjustmentsIcon from '@assets/icons/adjustments.component.svg';
import styles from './SwapContainer.module.scss';
import { SectionTitle } from '@components/Layout/SectionTitle';
import {
  TextLink,
  Button,
  Card,
  Flex,
  Text,
  TextBox,
  IconButton,
  Tooltip,
  InfoComponent
} from '@input-output-hk/lace-ui-toolkit';
import LightBulb from '@src/assets/icons/light.svg';
import { getTokenList, NonNFTAsset } from '@src/utils/get-token-list';
import { useObservable } from '@lace/common';
import { useAssetInfo } from '@hooks';
import { useWalletStore } from '@src/stores';
import { cardanoCoin, DEFAULT_WALLET_BALANCE } from '@src/utils/constants';
import { Wallet } from '@lace/cardano';
import { Cardano } from '@cardano-sdk/core';
import { SwapStage, TokenListFetchResponse } from '../types';
import { useSwaps } from './SwapProvider';
import { LiquiditySourcesDrawer, SignTxDrawer, SwapSlippageDrawer, TokenSelectDrawer } from './drawers';
import { SwapReviewDrawer } from './drawers/SwapReview';
import { walletRoutePaths } from '@routes';
import { useHistory } from 'react-router-dom';
import { getAssetImageUrl } from '@utils/get-asset-image-url';
import { DisclaimerModal as SwapsDisclaimerModal } from './DisclaimerModal/DisclaimerModal';
import { getSwapQuoteSources } from '../util';
import CardanoLogo from '../../../../../assets/icons/browser-view/cardano-logo.svg';
import { validateNumericValue } from '@lace/core';

const CARDANO_ASSET_ID = '537c34d1695c4303e293d7a5b19813f0d51c3c71259842e773b0b4e6';

const mapSwappableTokens = (dexTokenList: TokenListFetchResponse[], swappableTokens: NonNFTAsset[]) => {
  const swappableAssetIds = new Set();
  dexTokenList.forEach((token) => {
    swappableAssetIds.add(`${token.policyId}${token.policyName}`);
  });

  swappableAssetIds.add(CARDANO_ASSET_ID); // Add cardano as default

  return swappableTokens
    .map((token) => ({
      ...token,
      disabled: !swappableAssetIds.has(token.assetId)
    }))
    .sort((a, b) => {
      if (!a.disabled && b.disabled) return -1;
      if (a.disabled && !b.disabled) return 1;
      return 0;
    });
};

export const SwapsContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const history = useHistory();
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    tokenA,
    setTokenA,
    tokenB,
    setTokenB,
    buildSwap,
    estimate,
    dexTokenList,
    collateral,
    quantity,
    setQuantity,
    setStage,
    stage,
    unsignedTx,
    targetSlippage,
    disclaimerAcknowledged,
    fetchingQuote
  } = useSwaps();
  const { inMemoryWallet } = useWalletStore();
  const assetsInfo = useAssetInfo();

  const assetsBalance = useObservable(inMemoryWallet.balance.utxo.total$, DEFAULT_WALLET_BALANCE.utxo.total$);
  const { tokenList: swappableTokens } = getTokenList({
    assetsInfo,
    balance: assetsBalance?.assets,
    fiatCurrency: null
  });

  const mappedSwappableTokens = useMemo(() => {
    const CardanoCoin: NonNFTAsset = {
      assetId: 'lovelace',
      amount: Wallet.util.lovelacesToAdaString(assetsBalance?.coins.toString()) || '0',
      fiat: '-',
      name: cardanoCoin.name,
      description: cardanoCoin.symbol,
      logo: CardanoLogo,
      defaultLogo: CardanoLogo,
      decimals: 6
    } as NonNFTAsset;
    return mapSwappableTokens(dexTokenList, [CardanoCoin, ...swappableTokens]);
  }, [swappableTokens, dexTokenList, assetsBalance?.coins]);

  const receivedAmount = useMemo(() => {
    if (!tokenB || !estimate) return '0.00';
    if (tokenB.decimals > 0) {
      return (estimate.quantityB / Math.pow(10, tokenB.decimals)).toFixed(tokenB.decimals);
    }
    return estimate.quantityB.toString();
  }, [tokenB, estimate]);

  const FooterButton: React.ReactElement = useMemo((): React.ReactElement => {
    if (estimate) {
      return (
        <Button.CallToAction
          label={t('swaps.btn.proceed')}
          w="$fill"
          onClick={() => {
            buildSwap(() => setStage(SwapStage.SwapReview));
          }}
        />
      );
    }
    if (fetchingQuote) {
      return <Button.CallToAction icon label={t('swaps.btn.fetchingEstimate')} w="$fill" disabled />;
    }
    return (
      <Button.CallToAction
        label={t('swaps.btn.selectTokens')}
        w="$fill"
        onClick={() => {
          if (!tokenA) {
            setStage(SwapStage.SelectTokenOut);
          } else {
            setStage(SwapStage.SelectTokenIn);
          }
        }}
      />
    );
  }, [estimate, tokenA, setStage, buildSwap, t, fetchingQuote]);

  const sidePanel = useMemo(() => {
    const titles = {
      faq: t('educationalBanners.title.faq')
    };

    const educationalItems = [
      {
        title: titles.faq,
        subtitle: t('swaps.educationalContent.whatAreSwaps'),
        src: LightBulb,
        link: `${process.env.WEBSITE_URL}/faq?question=what-is-a-token-swap`
      },
      {
        title: titles.faq,
        subtitle: t('swaps.educationalContent.howToPerformSwap'),
        src: LightBulb,
        link: `${process.env.WEBSITE_URL}/faq?question=how-do-i-perform-a-swap-in-lace`
      },
      {
        title: titles.faq,
        subtitle: t('swaps.educationalContent.doINeedTokensToSwap'),
        src: LightBulb,
        link: `${process.env.WEBSITE_URL}/faq?question=do-i-need-tokens-in-my-wallet-to-swap`
      },
      {
        title: titles.faq,
        subtitle: t('swaps.educationalContent.whatIsSlippage'),
        src: LightBulb,
        link: `${process.env.WEBSITE_URL}/faq?question=what-is-slippage-tolerance-and-why-does-it-matter`
      }
    ];

    return (
      <Flex flexDirection="column" alignItems="stretch" gap="$32" mb="$112">
        <EducationalList items={educationalItems} title={t('swaps.educationalContent.heading')} />
      </Flex>
    );
  }, [t]);

  const navigateToCollateralSetting = useCallback(
    () => history.push(`${walletRoutePaths.settings}?activeDrawer=collateral`),
    [history]
  );

  // Attach blur handler directly to the input element since TextBox doesn't forward onBlur
  useEffect(() => {
    const containerElement = inputRef.current;
    const inputElement = containerElement?.querySelector('input');

    const handleBlur = () => {
      if (!quantity) {
        setQuantity('0.00');
      }
    };

    const handleFocus = () => {
      if (quantity === '0.00') {
        setQuantity('');
      }
    };

    if (inputElement) {
      inputElement.addEventListener('blur', handleBlur);
      inputElement.addEventListener('focus', handleFocus);
    }

    return () => {
      if (inputElement) {
        inputElement.removeEventListener('blur', handleBlur);
        inputElement.removeEventListener('focus', handleFocus);
      }
    };
  }, [quantity, setQuantity]);

  return (
    <Layout>
      <SectionLayout sidePanelContent={sidePanel}>
        <SectionTitle title={t('swaps.pageHeading')} />
        <Card.Outlined className={styles.swapContainer}>
          <Flex flexDirection="column" gap="$24" w="$fill" alignItems="center">
            <Flex flexDirection="column" w="$fill" gap="$8" alignItems="center">
              <Card.Greyed className={styles.swapTokenCard}>
                <Flex w="$fill" justifyContent="space-between" flexDirection="row" alignItems="flex-start">
                  <Flex flexDirection="column" w="$fill">
                    <Text.Body.Normal weight="$semibold" color="secondary">
                      {t('swaps.label.youSell')}
                    </Text.Body.Normal>
                    <div ref={inputRef}>
                      <TextBox
                        label=""
                        value={quantity}
                        defaultValue="0.00"
                        id="swap-token-input"
                        onChange={(e) => {
                          const changedValue = e.target.value;
                          if (!changedValue) setQuantity('');
                          if (
                            validateNumericValue(changedValue, {
                              isFloat: !!tokenA?.decimals || true,
                              ...(!!tokenA?.decimals && { maxDecimals: tokenA.decimals.toString() })
                            })
                          ) {
                            setQuantity(changedValue);
                          }
                        }}
                        containerClassName={styles.swapTokenATextbox}
                      />
                    </div>
                  </Flex>
                  <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$8">
                    <Card.Outlined
                      className={styles.swapTokenSelectTrigger}
                      onClick={() => setStage(SwapStage.SelectTokenOut)}
                    >
                      <Flex
                        flexDirection="row"
                        gap="$8"
                        p="$8"
                        mr="$8"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Flex gap="$8" alignItems="center">
                          <div className={styles.swapTokenIcon}>
                            {tokenA ? (
                              <img
                                alt={tokenA.name}
                                src={tokenA.description === 'ADA' ? CardanoLogo : getAssetImageUrl(tokenA.logo)}
                                style={{ width: 24, height: 24, borderRadius: '100%' }}
                              />
                            ) : (
                              <PlusCircleOutlined />
                            )}
                          </div>
                          <Text.Button>{tokenA ? tokenA.description : t('swaps.label.selectToken')}</Text.Button>
                        </Flex>
                        <ChevronNormal />
                      </Flex>
                    </Card.Outlined>
                    <Flex gap="$16">
                      {!!tokenA?.id && tokenA.description !== 'ADA' && tokenA.id && (
                        <>
                          <TextLink
                            onClick={() => {
                              const assetBalance = assetsBalance?.assets?.get(tokenA?.id);
                              if (assetBalance !== undefined) {
                                if (tokenA.decimals !== undefined) {
                                  const formattedBalance = Number(assetBalance) / Math.pow(10, tokenA.decimals);
                                  setQuantity(formattedBalance.toFixed(tokenA.decimals).toString());
                                } else {
                                  setQuantity(assetBalance.toString());
                                }
                              }
                            }}
                            label={t('swaps.label.selectMaxTokens')}
                          />
                          <TextLink
                            onClick={() => {
                              const assetBalance = assetsBalance?.assets?.get(tokenA?.id);
                              if (assetBalance !== undefined) {
                                if (tokenA.decimals !== undefined) {
                                  const formattedBalance = Number(assetBalance) / Math.pow(10, tokenA.decimals) / 2;
                                  setQuantity(formattedBalance.toFixed(tokenA.decimals).toString());
                                } else {
                                  setQuantity((assetBalance / BigInt(2)).toString());
                                }
                              }
                            }}
                            label={t('swaps.label.selectHalfTokens')}
                          />
                        </>
                      )}
                      {!!tokenA?.description && (
                        <Text.Body.Normal color="secondary">
                          {t('swaps.quote.balance', {
                            assetBalance: (() => {
                              if (tokenA?.description === 'ADA') {
                                return Wallet.util.lovelacesToAdaString(assetsBalance?.coins?.toString());
                              }
                              const rawBalance = assetsBalance?.assets?.get(tokenA?.id);
                              if (rawBalance !== undefined) {
                                return Wallet.util.calculateAssetBalance(rawBalance.toString(), {
                                  tokenMetadata: { decimals: tokenA?.decimals }
                                } as Wallet.Asset.AssetInfo);
                              }
                              return '0';
                            })()
                          })}
                        </Text.Body.Normal>
                      )}
                    </Flex>
                  </Flex>
                </Flex>
              </Card.Greyed>
              <Card.Outlined className={styles.swapArrow}>
                <ArrowDown />
              </Card.Outlined>
              <Card.Greyed className={styles.swapTokenCard}>
                <Flex w={'$fill'} justifyContent="space-between" flexDirection={'row'} alignItems="flex-start">
                  <Flex flexDirection={'column'}>
                    <Text.Body.Normal weight="$semibold" color="secondary">
                      {t('swaps.label.youReceive')}
                    </Text.Body.Normal>
                    <Text.SubHeading weight="$bold">{receivedAmount}</Text.SubHeading>
                  </Flex>
                  <Flex flexDirection="column">
                    <Flex flexDirection="column" w="$fill" alignItems="flex-end" gap="$8">
                      <Card.Outlined
                        className={styles.swapTokenSelectTrigger}
                        onClick={() => setStage(SwapStage.SelectTokenIn)}
                      >
                        <Flex
                          flexDirection="row"
                          gap="$8"
                          p="$8"
                          justifyContent="space-between"
                          alignItems="center"
                          mr="$8"
                        >
                          <Flex gap="$8" alignItems="center">
                            <div className={styles.swapTokenIcon}>
                              {tokenB ? (
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
                                  style={{ width: 24, height: 24, borderRadius: '100%' }}
                                />
                              ) : (
                                <PlusCircleOutlined />
                              )}
                            </div>
                            <Text.Button>{tokenB ? tokenB.ticker : t('swaps.label.selectToken')}</Text.Button>
                          </Flex>
                          <ChevronNormal />
                        </Flex>
                      </Card.Outlined>
                      <Flex gap="$16">
                        {!!tokenB && (
                          <Text.Body.Normal color="secondary">
                            {t('swaps.quote.balance', {
                              assetBalance: (() => {
                                if (tokenB.ticker === 'ADA') {
                                  return Wallet.util.lovelacesToAdaString(assetsBalance?.coins.toString());
                                }
                                const rawBalance = assetsBalance?.assets?.get(
                                  `${tokenB?.policyId}${tokenB.policyName}`
                                );
                                if (rawBalance !== undefined) {
                                  return Wallet.util.calculateAssetBalance(rawBalance.toString(), {
                                    tokenMetadata: { decimals: tokenB.decimals }
                                  } as Wallet.Asset.AssetInfo);
                                }
                                return '0';
                              })()
                            })}
                          </Text.Body.Normal>
                        )}
                      </Flex>
                    </Flex>
                  </Flex>
                </Flex>
              </Card.Greyed>
            </Flex>
            {!!estimate && (
              <Flex flexDirection={'column'} w="$fill" gap={'$16'}>
                <Flex justifyContent={'space-between'}>
                  <Text.Body.Normal color="secondary" weight="$semibold">
                    {t('swaps.quote.bestOffer')}
                  </Text.Body.Normal>
                </Flex>
                <Card.Greyed style={{ width: '100%' }}>
                  <Flex
                    flexDirection={'column'}
                    p="$16"
                    w={'$fill'}
                    justifyContent={'space-between'}
                    alignItems="center"
                  >
                    <Flex flexDirection={'row'} w="$fill" justifyContent={'space-between'} alignItems="center">
                      <Flex flexDirection="column">
                        <Text.Body.Large weight="$bold">SteelSwap</Text.Body.Large>
                        <Text.Body.Normal color="secondary">
                          {t('swaps.quoteSourceRoute.via', { swapRoutes: getSwapQuoteSources(estimate.splitGroup) })}
                        </Text.Body.Normal>
                      </Flex>
                      <Flex gap={'$16'} alignItems="center">
                        <Text.Body.Normal weight="$semibold">
                          {Number(estimate.price).toFixed(5)} per {tokenA?.description}
                        </Text.Body.Normal>
                        <IconButton.Secondary
                          icon={<AdjustmentsIcon />}
                          onClick={() => setStage(SwapStage.SelectLiquiditySources)}
                        />
                      </Flex>
                    </Flex>
                    <Flex flexDirection={'row'} w="$fill" justifyContent={'space-between'} alignItems="center">
                      <Text.Body.Normal weight="$semibold">{t('swaps.reviewStage.detail.slippage')}</Text.Body.Normal>
                      <Flex gap={'$16'} alignItems="center">
                        <Text.Body.Normal weight="$semibold">{targetSlippage}%</Text.Body.Normal>
                        <IconButton.Secondary
                          icon={<AdjustmentsIcon />}
                          onClick={() => setStage(SwapStage.AdjustSlippage)}
                        />
                      </Flex>
                    </Flex>
                  </Flex>
                </Card.Greyed>
                <Flex flexDirection={'row'} w="$fill" justifyContent="space-between">
                  <Flex gap="$8">
                    <Text.Body.Normal color="secondary" weight="$semibold">
                      {t('swaps.reviewStage.transactionsCosts.serviceFee')}
                    </Text.Body.Normal>
                    <Tooltip label={t('swaps.reviewStage.tooltip.serviceFee')} align="start" side="bottom">
                      <InfoComponent data-testid="service-fee-info" />
                    </Tooltip>
                  </Flex>
                  <Text.Body.Normal weight="$semibold">
                    {Wallet.util.lovelacesToAdaString(estimate.totalFee.toString())} ADA
                  </Text.Body.Normal>
                </Flex>
              </Flex>
            )}
            {FooterButton}
          </Flex>
        </Card.Outlined>
        {stage === SwapStage.SelectTokenOut && (
          <TokenSelectDrawer
            tokens={mappedSwappableTokens.map((token) => ({
              ...token,
              id: token.assetId,
              ...(tokenB && { disabled: token.assetId === `${tokenB.policyId}${tokenB.policyName}` })
            }))}
            selectionType="out"
            doesWalletHaveTokens={mappedSwappableTokens?.length > 0}
            onTokenSelect={(token) => {
              setTokenA(token);
              setQuantity('0.00');
            }}
            selectedToken={tokenA?.id}
            searchTokens={(item, value) =>
              item.name.toLowerCase().includes(value) || item.description.toLowerCase().includes(value)
            }
          />
        )}
        {stage === SwapStage.SelectTokenIn && (
          <TokenSelectDrawer
            tokens={dexTokenList.map((token) => {
              let logoUrl: string | undefined;
              try {
                // adjust if it's cardano URL
                const assetFingerprint = Cardano.AssetFingerprint.fromParts(
                  Cardano.PolicyId(token.policyId),
                  Cardano.AssetName(token.policyName)
                );
                logoUrl = `${process.env.ASSET_CDN_URL}/lace/image/${assetFingerprint}?size=64`;
              } catch {
                // Fall back to not setting a logo - will use default
                logoUrl = token.ticker === 'ADA' ? CardanoLogo : undefined;
              }

              const rawBalance = assetsBalance?.assets?.get(token.policyId + token.policyName);
              let formattedAmount = '-';

              if (token.ticker === 'ADA') {
                formattedAmount = Wallet.util.lovelacesToAdaString(assetsBalance?.coins.toString());
              } else if (rawBalance !== undefined) {
                formattedAmount = Wallet.util.calculateAssetBalance(rawBalance.toString(), {
                  tokenMetadata: { decimals: token.decimals }
                } as Wallet.Asset.AssetInfo);
              }

              return {
                amount: formattedAmount,
                name: token.name,
                description: token.ticker,
                decimals: token.decimals,
                id: token.policyId + token.policyName,
                logo: logoUrl,
                ...(tokenA && { disabled: token.policyId + token.policyName === tokenA.id })
              };
            })}
            doesWalletHaveTokens={dexTokenList?.length > 0}
            selectedToken={tokenB ? `${tokenB.policyId}${tokenB.policyName}` : undefined}
            selectionType="in"
            onTokenSelect={(token) => {
              const matchedToken = dexTokenList.find(
                (dexToken) => token?.id === `${dexToken.policyId}${dexToken.policyName}`
              );
              setTokenB(matchedToken);
            }}
            searchTokens={(item, value) =>
              item.name.toLowerCase().includes(value) || item.description.toLowerCase().includes(value)
            }
          />
        )}
        {stage === SwapStage.SelectLiquiditySources && <LiquiditySourcesDrawer />}
        {stage === SwapStage.SwapReview && unsignedTx && <SwapReviewDrawer />}
        {(stage === SwapStage.SignTx || stage === SwapStage.Success) && <SignTxDrawer />}
        {stage === SwapStage.AdjustSlippage && <SwapSlippageDrawer />}
        <WarningModal
          content={t('browserView.settings.wallet.collateral.amountDescription')}
          header={t('swaps.warningModal.collateral.header')}
          visible={collateral?.length === 0 && typeof disclaimerAcknowledged === 'boolean' && disclaimerAcknowledged}
          onConfirm={navigateToCollateralSetting}
          confirmLabel={t('announcement.cta')}
        />
        <SwapsDisclaimerModal />
      </SectionLayout>
    </Layout>
  );
};
