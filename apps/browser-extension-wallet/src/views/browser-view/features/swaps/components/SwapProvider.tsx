/* eslint-disable max-statements */
/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { PostHogAction, toast, useObservable, logger } from '@lace/common';
import { useWalletStore } from '@src/stores';
import { Serialization } from '@cardano-sdk/core';
import {
  BuildSwapProps,
  BaseEstimate,
  BuildSwapResponse,
  CreateSwapRequestBodySwaps,
  SwapEstimateResponse,
  SwapProvider,
  TokenListFetchResponse,
  SwapStage
} from '../types';
import { Wallet } from '@lace/cardano';
import {
  ESTIMATE_VALIDITY_INTERVAL,
  INITIAL_SLIPPAGE,
  MAX_SLIPPAGE_PERCENTAGE,
  SLIPPAGE_PERCENTAGES,
  SWAP_TRANSACTION_TTL
} from '../const';
import { SwapsContainer } from './SwapContainer';
import { DropdownList } from './drawers';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { storage } from 'webextension-polyfill';
import {
  SWAPS_TARGET_SLIPPAGE,
  SWAPS_EXCLUDED_LIQUIDITY_SOURCES,
  SWAPS_DISCLAIMER_ACKNOWLEDGED
} from '@lib/scripts/types/storage';
import { HttpStatusCode } from 'axios';

export const createSteelswapApiHeaders = (): HeadersInit => ({
  Accept: 'application/json, text/plain, */*',
  'Content-Type': 'application/json'
});

const convertAdaQuantityToLovelace = (quantity: string): string => Wallet.util.adaToLovelacesString(quantity);

export const getDexList = async (t: TFunction): Promise<string[]> => {
  // /docs#/dex/available_dexs_dex_list__get
  const response = await globalThis.fetch(`${process.env.STEELSWAP_API_URL}/dex/list/`, { method: 'GET' });
  if (!response.ok) {
    toast.notify({ duration: 3, text: t('swaps.error.unableToFetchDexList') });
    throw new Error('Unable to fetch dex list');
  }
  return (await response.json()) as string[];
};

export const getSwappableTokensList = async (): Promise<TokenListFetchResponse[]> => {
  // /docs#/tokens/get_tokens_tokens_list__get
  const response = await globalThis.fetch(`${process.env.STEELSWAP_API_URL}/tokens/list/`, { method: 'GET' });

  if (!response.ok) {
    throw new Error('Unable to fetch token list');
  }

  return (await response.json()) as TokenListFetchResponse[];
};

const getFormattedQuantity = (quantity: string, decimals?: number) => {
  if (decimals) {
    return Number(quantity) * Math.pow(10, decimals);
  }
  return quantity;
};

export const createSwapRequestBody = ({
  tokenA,
  tokenB,
  quantity,
  ignoredDexs,
  address,
  targetSlippage,
  collateral,
  utxos,
  decimals
}: CreateSwapRequestBodySwaps): BuildSwapProps | BaseEstimate => {
  // Estimate
  const quantityValue =
    tokenA === 'lovelace' ? convertAdaQuantityToLovelace(quantity) : getFormattedQuantity(quantity, decimals);
  const quantityNumber = Number(quantityValue);
  if (Number.isNaN(quantityNumber)) {
    throw new TypeError(`Invalid quantity value: ${quantityValue}`);
  }
  const baseBody = {
    tokenA,
    tokenB,
    quantity: quantityNumber,
    predictFromOutputAmount: false,
    ignoreDexes: ignoredDexs,
    partner: 'lace-aggregator',
    hop: true,
    da: [] as const
  };

  // Additional properties required to build a swap
  if (address && targetSlippage !== undefined && collateral && utxos) {
    return {
      ...baseBody,
      address,
      slippage: Number(targetSlippage) * 100,
      forwardAddress: '',
      // Note: feeAdust is intentionally misspelled as required by the SteelSwap API
      feeAdust: true,
      collateral: collateral.map((core) => Serialization.TransactionUnspentOutput.fromCore(core).toCbor()),
      pAddress: '$lace@steelswap',
      utxos: utxos.map((core) => Serialization.TransactionUnspentOutput.fromCore(core).toCbor()),
      ttl: SWAP_TRANSACTION_TTL
    };
  }

  return baseBody;
};

const SwapsContext = createContext<SwapProvider | null>(null);

export const useSwaps = (): SwapProvider => {
  const context = useContext(SwapsContext);
  if (context === null) throw new Error('SwapsContext not defined');
  return context;
};

export const SwapsProvider = (): React.ReactElement => {
  const { t } = useTranslation();
  // required data sources
  const { inMemoryWallet } = useWalletStore();
  const utxos = useObservable(inMemoryWallet.utxo.available$);
  const collateral = useObservable(inMemoryWallet.utxo.unspendable$);
  const addresses = useObservable(inMemoryWallet.addresses$);
  const { coinPrices } = useBackgroundServiceAPIContext();
  const tokenPrices = useObservable(coinPrices.tokenPrices$);

  // swaps interface
  const [tokenA, setTokenA] = useState<DropdownList>();
  const [tokenB, setTokenB] = useState<TokenListFetchResponse>();
  const [quantity, setQuantity] = useState<string>('0.00');
  const [dexTokenList, setDexTokenList] = useState<TokenListFetchResponse[]>([]);
  const [stage, setStage] = useState<SwapStage>(SwapStage.Initial);
  const [fetchingQuote, setFetchingQuote] = useState(false);

  // settings
  const [dexList, setDexList] = useState([]);
  const [excludedDexs, setExcludedDexs] = useState<string[]>([]);
  const [targetSlippage, setTargetSlippage] = useState<number>(INITIAL_SLIPPAGE);
  const [slippagePercentages, setSlippagePercentages] = useState<number[]>(SLIPPAGE_PERCENTAGES);
  const [maxSlippagePercentage, setMaxSlippagePercentage] = useState<number>(MAX_SLIPPAGE_PERCENTAGE);

  // Track if slippage has been initialized to prevent feature flag from overwriting user settings
  const slippageInitializedRef = useRef(false);
  // Track if excluded dexs have been initialized to prevent feature flag from overwriting user settings
  const liquiditySourcesInitializedRef = useRef(false);

  // estimate swap
  const [estimate, setEstimate] = useState<SwapEstimateResponse | null>();

  // Build swap
  const [unsignedTx, setUnsignedTx] = useState<BuildSwapResponse | null>();
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  // Legal disclaimer acceptance, one time acceptance
  const [disclaimerAcknowledged, setDisclaimerAcknowleged] = useState<boolean | null>(null);

  // Reset transaction hash when starting a new swap
  useEffect(() => {
    if (stage === SwapStage.Initial && transactionHash !== null) {
      setTransactionHash(null);
    }
  }, [stage, transactionHash]);

  // Feature Flag data
  const posthog = usePostHogClientContext();
  const isSwapsEnabled = posthog?.isFeatureFlagEnabled('swap-center');
  const swapCenterFeatureFlagPayload = posthog?.getFeatureFlagPayload('swap-center');

  // Load persisted slippage setting on mount
  useEffect(() => {
    const loadPersistedSlippageAndLiquiditySources = async () => {
      try {
        const storedSlippageData = await storage.local.get(SWAPS_TARGET_SLIPPAGE);
        const persistedSlippageValue = storedSlippageData[SWAPS_TARGET_SLIPPAGE];
        // Validate that the stored value is a valid number
        if (
          persistedSlippageValue !== undefined &&
          typeof persistedSlippageValue === 'number' &&
          !Number.isNaN(persistedSlippageValue)
        ) {
          setTargetSlippage(persistedSlippageValue);
          slippageInitializedRef.current = true;
        }
      } catch (error) {
        // If storage fails, continue with default
        logger.error('Failed to load persisted slippage:', error);
      }

      try {
        const storedLiquiditySourcesData = await storage.local.get(SWAPS_EXCLUDED_LIQUIDITY_SOURCES);
        const persistedLiquiditySourcesValue = storedLiquiditySourcesData[SWAPS_EXCLUDED_LIQUIDITY_SOURCES];

        // Validate that the stored value is a valid number
        if (
          storedLiquiditySourcesData !== undefined &&
          Array.isArray(persistedLiquiditySourcesValue) &&
          persistedLiquiditySourcesValue.length > 0
        ) {
          setExcludedDexs(persistedLiquiditySourcesValue);
          liquiditySourcesInitializedRef.current = true;
        }
      } catch (error) {
        // If storage fails, continue with default
        logger.error('Failed to load persisted excluded dexs:', error);
      }
    };

    const loadDisclaimerAcknowledgement = async () => {
      try {
        const storedAcknowledgementData = await storage.local.get(SWAPS_DISCLAIMER_ACKNOWLEDGED);
        const persistedAcknowledgementValue = storedAcknowledgementData[SWAPS_DISCLAIMER_ACKNOWLEDGED];
        setDisclaimerAcknowleged(persistedAcknowledgementValue ?? false);
      } catch (error) {
        // If storage fails, continue with default
        logger.error('Failed to load persisted swaps dislaimer:', error);
      }
    };

    loadPersistedSlippageAndLiquiditySources();
    loadDisclaimerAcknowledgement();
  }, []);

  // Initialize slippage from feature flag only if not already set by user
  // Wait for storage load to complete before applying feature flag defaults
  useEffect(() => {
    // Only apply feature flag if storage load has completed (checked via ref)
    // This prevents race condition where feature flag might overwrite user's persisted setting
    const applyFeatureFlagDefaults = async () => {
      // Small delay to allow storage load to complete first
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (isSwapsEnabled && swapCenterFeatureFlagPayload && !slippageInitializedRef.current) {
        if (swapCenterFeatureFlagPayload?.initialSlippagePercentage) {
          setTargetSlippage(swapCenterFeatureFlagPayload.initialSlippagePercentage);
          slippageInitializedRef.current = true;
        }
        if (swapCenterFeatureFlagPayload?.defaultSlippagePercentages) {
          setSlippagePercentages(swapCenterFeatureFlagPayload.defaultSlippagePercentages);
        }
        if (swapCenterFeatureFlagPayload?.maxSlippagePercentage) {
          setMaxSlippagePercentage(swapCenterFeatureFlagPayload.maxSlippagePercentage);
        }
      }
    };

    applyFeatureFlagDefaults();
  }, [swapCenterFeatureFlagPayload, isSwapsEnabled]);

  const fetchEstimate = useCallback(async () => {
    // Don't fetch new estimates if we already have a built transaction
    // User should clear the transaction first if they want updated quotes
    if (unsignedTx || Number(quantity) === 0) return;
    // /docs#/swap/steel_swap_swap_estimate__post
    setFetchingQuote(true);
    const postBody = JSON.stringify(
      createSwapRequestBody({
        tokenA: tokenA.id,
        tokenB: tokenB.policyId + tokenB.policyName,
        quantity,
        ignoredDexs: excludedDexs,
        decimals: tokenA.decimals
      })
    );
    if (tokenA && tokenB && quantity) {
      const response = await globalThis.fetch(`${process.env.STEELSWAP_API_URL}/swap/estimate/`, {
        method: 'POST',
        headers: createSteelswapApiHeaders(),
        body: postBody
      });
      if (!response.ok) {
        toast.notify({ duration: 3, text: t('swaps.error.unableToRetrieveQuote') });
        setEstimate(null);
        setFetchingQuote(false);
        throw new Error('Unexpected response');
      }
      posthog.sendEvent(PostHogAction.SwapsFetchEstimate, {
        tokenIn: tokenB.name,
        tokenOut: tokenA.name,
        amount: quantity,
        excludedDexs
      });
      const parsedResponse = (await response.json()) as SwapEstimateResponse;
      // Basic validation: ensure response has required fields
      if (
        !parsedResponse ||
        typeof parsedResponse.quantityB !== 'number' ||
        typeof parsedResponse.price !== 'number' ||
        !Array.isArray(parsedResponse.splitGroup)
      ) {
        const errorMessage = 'Invalid estimate response structure';
        logger.error(errorMessage, parsedResponse);
        toast.notify({ duration: 3, text: t('swaps.error.unableToRetrieveQuote') });
        setFetchingQuote(false);
        throw new Error(errorMessage);
      }
      setFetchingQuote(false);
      setEstimate(parsedResponse);
    }
    setFetchingQuote(false);
  }, [tokenA, tokenB, quantity, excludedDexs, unsignedTx, t, posthog, setFetchingQuote]);

  useEffect(() => {
    let id: NodeJS.Timeout | undefined;
    if (estimate) {
      id = setInterval(() => {
        fetchEstimate();
      }, ESTIMATE_VALIDITY_INTERVAL);
    }
    return () => {
      if (id !== undefined) {
        clearInterval(id);
      }
    };
  }, [estimate, fetchEstimate]);

  useEffect(() => {
    if (!quantity || Number(quantity) === 0 || !tokenA || !tokenB) {
      setEstimate(null);
    } else {
      fetchEstimate();
    }
  }, [tokenA, tokenB, quantity, fetchEstimate, setEstimate]);

  const resetSwapState = useCallback(
    (resetStage = true) => {
      setQuantity('0.00');
      setTokenA(null);
      setTokenB(null);
      resetStage && setStage(SwapStage.Initial);
      setUnsignedTx(null);
    },
    [setQuantity, setTokenA, setTokenB, setStage, setUnsignedTx]
  );

  useEffect(() => {
    // reset everything if the wallet changes
    resetSwapState();
  }, [addresses, resetSwapState]);

  const fetchDexList = useCallback(() => {
    getDexList(t)
      .then((response) => {
        setDexList(response);
      })
      .catch((error) => {
        logger.error('Failed to fetch DEX list:', error);
        // Error already shown via toast in getDexList, just log for debugging
      });
  }, [t]);

  const fetchSwappableTokensList = useCallback(() => {
    getSwappableTokensList()
      .then((response) => {
        setDexTokenList(response);
      })
      .catch((error) => {
        throw new Error(error);
      });
  }, []);

  useEffect(() => {
    fetchSwappableTokensList();
    fetchDexList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildSwap = useCallback(
    async (cb?: () => void) => {
      // /docs#/swap/build_swap_swap_build__post
      const postBody = JSON.stringify(
        createSwapRequestBody({
          tokenA: tokenA.id,
          tokenB: tokenB.policyId + tokenB.policyName,
          quantity,
          ignoredDexs: excludedDexs,
          address: addresses?.[0]?.address,
          targetSlippage,
          collateral,
          utxos,
          decimals: tokenA.decimals
        })
      );

      const response = await globalThis.fetch(`${process.env.STEELSWAP_API_URL}/swap/build/`, {
        method: 'POST',
        headers: createSteelswapApiHeaders(),
        body: postBody
      });
      const unableToBuildErrorText = t('swaps.error.unableToBuild');
      if (!response.ok) {
        try {
          const { detail } = await response.json();
          // 406 status indicates a specific error that should be shown to user
          if (response.status === HttpStatusCode.NotAcceptable) {
            toast.notify({ duration: 3, text: detail });
            return;
          }
          // For other error statuses, show generic error and log details
          logger.error('Failed to build swap:', { status: response.status, detail });
          toast.notify({ duration: 3, text: unableToBuildErrorText });
          return;
        } catch {
          logger.error('Failed to build swap: unable to parse error response');
          toast.notify({ duration: 3, text: unableToBuildErrorText });
        }
      } else {
        posthog.sendEvent(PostHogAction.SwapsBuildQuote, {
          tokenIn: tokenB.name,
          tokenOut: tokenA.name,
          amount: quantity,
          excludedDexs
        });
        const parsedResponse = (await response.json()) as BuildSwapResponse;
        // Basic validation: ensure response has required fields
        if (!parsedResponse || typeof parsedResponse.tx !== 'string' || typeof parsedResponse.p !== 'boolean') {
          const errorMessage = 'Invalid build swap response structure';
          logger.error(errorMessage, parsedResponse);
          toast.notify({ duration: 3, text: unableToBuildErrorText });
          return;
        }
        setUnsignedTx(parsedResponse);
        cb();
      }
    },
    [addresses, tokenA, tokenB, quantity, targetSlippage, collateral, excludedDexs, utxos, t, posthog]
  );

  const sendSuccessPosthogEvent = useCallback(() => {
    let totalValueTransferInAda = 0;

    // If swapping from ADA, the quantity is already in ADA
    if (tokenA.id === 'lovelace') {
      totalValueTransferInAda = Number(quantity);
    } else {
      // For other tokens, get the token price in ADA and multiply by quantity
      const tokenPrice = tokenPrices?.tokens.get(tokenA.id as Wallet.Cardano.AssetId);
      const priceInAda = tokenPrice?.price?.priceInAda || 0;
      totalValueTransferInAda = Number(quantity) * priceInAda;
    }

    posthog.sendEvent(PostHogAction.SwapsSignSuccess, {
      tokenIn: tokenB,
      tokenOut: tokenA,
      quantity,
      targetSlippage: targetSlippage.toString(),
      totalValueTransferInAda: totalValueTransferInAda.toString()
    });
  }, [tokenA, tokenB, posthog, quantity, targetSlippage, tokenPrices]);

  const signAndSubmitSwapRequest = useCallback(async () => {
    const unableToSignErrorText = t('swaps.error.unableToSign');
    if (!unsignedTx) {
      toast.notify({ duration: 3, text: unableToSignErrorText });
      posthog.sendEvent(PostHogAction.SwapsSignFailure, {
        reason: 'internal code, no unsigned tx'
      });
      setStage(SwapStage.Failure);
      return;
    }
    try {
      // Preserve the original transaction body and only update the witnesses
      // This ensures the protocol parameters view hash remains correct
      const unsignedTxFromCbor = Serialization.Transaction.fromCbor(unsignedTx.tx as unknown as Serialization.TxCBOR);
      const {
        witness: { signatures }
      } = await inMemoryWallet.finalizeTx({
        tx: unsignedTx.tx as unknown as Serialization.TxCBOR
      });
      // Update the witness set on the original transaction to preserve the body
      const witness = unsignedTxFromCbor.witnessSet();
      witness.setVkeys(Serialization.CborSet.fromCore([...signatures.entries()], Serialization.VkeyWitness.fromCore));
      unsignedTxFromCbor.setWitnessSet(witness);
      const txId = await inMemoryWallet.submitTx(unsignedTxFromCbor.toCbor());
      setTransactionHash(txId.toString());
      sendSuccessPosthogEvent();
      setStage(SwapStage.Success);
      resetSwapState(false);
    } catch (error) {
      logger.error('Failed to sign and submit swap:', error);
      toast.notify({ duration: 3, text: unableToSignErrorText });
      const standardError = new Error(error);
      posthog.sendEvent(PostHogAction.SwapsSignFailure, {
        reason: standardError.message
      });
      setStage(SwapStage.Initial);
    }
  }, [unsignedTx, inMemoryWallet, setStage, t, posthog, sendSuccessPosthogEvent, resetSwapState]);

  // Wrapper for setTargetSlippage that persists to storage
  const setTargetSlippagePersisted = useCallback((value: number | ((prev: number) => number)) => {
    setTargetSlippage((prev) => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      // Persist to storage
      storage.local.set({ [SWAPS_TARGET_SLIPPAGE]: newValue }).catch((error) => {
        logger.error('Failed to persist slippage setting:', error);
      });
      slippageInitializedRef.current = true;
      return newValue;
    });
  }, []);

  const setExcludedDexsPersisted = useCallback((value: string[] | ((prev: string[]) => string[])) => {
    setExcludedDexs((prev) => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      // Persist to storage
      storage.local.set({ [SWAPS_EXCLUDED_LIQUIDITY_SOURCES]: newValue }).catch((error) => {
        logger.error('Failed to persist excluded dex setting:', error);
      });
      liquiditySourcesInitializedRef.current = true;
      return newValue;
    });
  }, []);

  const handleAcknowledgeDisclaimer = async () => {
    await storage.local.set({
      [SWAPS_DISCLAIMER_ACKNOWLEDGED]: true
    });

    setDisclaimerAcknowleged(true);
  };

  const contextValue: SwapProvider = useMemo(
    () => ({
      tokenA,
      setTokenA,
      tokenB,
      setTokenB,
      quantity,
      setQuantity,
      dexList,
      dexTokenList,
      fetchDexList,
      fetchSwappableTokensList,
      estimate,
      unsignedTx,
      setUnsignedTx,
      buildSwap,
      targetSlippage,
      setTargetSlippage: setTargetSlippagePersisted,
      signAndSubmitSwapRequest,
      excludedDexs,
      setExcludedDexs: setExcludedDexsPersisted,
      stage,
      setStage,
      collateral,
      slippagePercentages,
      maxSlippagePercentage,
      transactionHash,
      disclaimerAcknowledged,
      handleAcknowledgeDisclaimer,
      fetchingQuote
    }),
    [
      tokenA,
      setTokenA,
      tokenB,
      setTokenB,
      quantity,
      setQuantity,
      dexList,
      dexTokenList,
      fetchDexList,
      fetchSwappableTokensList,
      estimate,
      unsignedTx,
      setUnsignedTx,
      buildSwap,
      targetSlippage,
      setTargetSlippagePersisted,
      signAndSubmitSwapRequest,
      excludedDexs,
      setExcludedDexsPersisted,
      stage,
      setStage,
      collateral,
      slippagePercentages,
      maxSlippagePercentage,
      transactionHash,
      disclaimerAcknowledged,
      fetchingQuote
    ]
  );

  return (
    <SwapsContext.Provider value={contextValue}>
      <SwapsContainer />
    </SwapsContext.Provider>
  );
};
