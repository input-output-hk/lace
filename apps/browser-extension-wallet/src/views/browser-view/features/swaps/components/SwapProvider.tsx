/* eslint-disable max-statements */
/* eslint-disable unicorn/no-null */
/* eslint-disable no-console */
/* eslint-disable no-magic-numbers */
import React, { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import { PostHogAction, toast, useObservable } from '@lace/common';
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
import { ESTIMATE_VALIDITY_INTERVAL, INITIAL_SLIPPAGE, MAX_SLIPPAGE_PERCENTAGE, SLIPPAGE_PERCENTAGES } from '../const';
import { SwapsContainer } from './SwapContainer';
import { DropdownList } from './drawers';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { storage } from 'webextension-polyfill';
import { SWAPS_TARGET_SLIPPAGE } from '@lib/scripts/types/storage';

// TODO: remove as soon as the lace steelswap proxy is correctly configured
export const createSteelswapApiHeaders = (): HeadersInit => ({
  Accept: 'application/json, text/plain, */*',
  token: process.env.STEELSWAP_TOKEN,
  'Content-Type': 'application/json'
});

const convertAdaQuantityToLovelace = (quantity: string): string => Wallet.util.adaToLovelacesString(quantity);

export const getDexList = async (t: TFunction): Promise<string[]> => {
  // https://apidev.steelswap.io/docs#/dex/available_dexs_dex_list__get
  const response = await window.fetch(`${process.env.STEELSWAP_API_URL}/dex/list/`, { method: 'GET' });
  if (!response.ok) {
    toast.notify({ duration: 3, text: t('swaps.error.unableToFetchDexList') });
    throw new Error('Unable to fetch dex list');
  }
  return (await response.json()) as string[];
};

export const getSwappableTokensList = async (): Promise<TokenListFetchResponse[]> => {
  // https://apidev.steelswap.io/docs#/tokens/get_tokens_tokens_list__get
  const response = await window.fetch(`${process.env.STEELSWAP_API_URL}/tokens/list/`, { method: 'GET' });

  if (!response.ok) {
    throw new Error('Unable to fetch token list');
  }

  return (await response.json()) as TokenListFetchResponse[];
};

export const createSwapRequestBody = ({
  tokenA,
  tokenB,
  quantity,
  ignoredDexs,
  address,
  targetSlippage,
  collateral,
  utxos
}: CreateSwapRequestBodySwaps): BuildSwapProps | BaseEstimate => {
  // Estimate
  const baseBody = {
    tokenA,
    tokenB,
    quantity: Number(tokenA === 'lovelace' ? convertAdaQuantityToLovelace(quantity) : quantity),
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
      ttl: 900
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

  // swaps interface
  const [tokenA, setTokenA] = useState<DropdownList>();
  const [tokenB, setTokenB] = useState<TokenListFetchResponse>();
  const [quantity, setQuantity] = useState<string>('');
  const [dexTokenList, setDexTokenList] = useState<TokenListFetchResponse[]>([]);
  const [stage, setStage] = useState<SwapStage>(SwapStage.Initial);

  // settings
  const [dexList, setDexList] = useState([]);
  const [excludedDexs, setExcludedDexs] = useState<string[]>([]);
  const [targetSlippage, setTargetSlippage] = useState<number>(INITIAL_SLIPPAGE);
  const [slippagePercentages, setSlippagePercentages] = useState<number[]>(SLIPPAGE_PERCENTAGES);
  const [maxSlippagePercentage, setMaxSlippagePercentage] = useState<number>(MAX_SLIPPAGE_PERCENTAGE);

  // Track if slippage has been initialized to prevent feature flag from overwriting user settings
  const slippageInitializedRef = useRef(false);

  // estimate swap
  const [estimate, setEstimate] = useState<SwapEstimateResponse | null>();

  // Build swap
  const [unsignedTx, setBuildResponse] = useState<BuildSwapResponse | null>();

  // Feature Flag data
  const posthog = usePostHogClientContext();
  const isSwapsEnabled = posthog?.isFeatureFlagEnabled('swap-center');
  const swapCenterFeatureFlagPayload = posthog?.getFeatureFlagPayload('swap-center');

  // Load persisted slippage setting on mount
  useEffect(() => {
    const loadPersistedSlippage = async () => {
      try {
        const data = await storage.local.get(SWAPS_TARGET_SLIPPAGE);
        const persistedValue = data[SWAPS_TARGET_SLIPPAGE];
        // Validate that the stored value is a valid number
        if (persistedValue !== undefined && typeof persistedValue === 'number' && !Number.isNaN(persistedValue)) {
          setTargetSlippage(persistedValue);
          slippageInitializedRef.current = true;
        }
      } catch (error) {
        // If storage fails, continue with default
        console.error('Failed to load persisted slippage:', error);
      }
    };

    loadPersistedSlippage();
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
    if (unsignedTx) return;
    // https://apidev.steelswap.io/docs#/swap/steel_swap_swap_estimate__post

    const postBody = JSON.stringify(
      createSwapRequestBody({
        tokenA: tokenA.id,
        tokenB: tokenB.policyId + tokenB.policyName,
        quantity,
        ignoredDexs: excludedDexs
      })
    );
    if (tokenA && tokenB && quantity) {
      const response = await window.fetch(`${process.env.STEELSWAP_API_URL}/swap/estimate/`, {
        method: 'POST',
        headers: createSteelswapApiHeaders(),
        body: postBody
      });
      if (!response.ok) {
        toast.notify({ duration: 3, text: t('swaps.error.unableToRetrieveQuote') });
        throw new Error('Unexpected response');
      }
      posthog.sendEvent(PostHogAction.SwapsFetchEstimate, {
        tokenIn: tokenB.name,
        tokenOut: tokenA.name,
        amount: quantity,
        excludedDexs
      });
      const parsedResponse = (await response.json()) as SwapEstimateResponse;
      setEstimate(parsedResponse);
    }
  }, [tokenA, tokenB, quantity, excludedDexs, unsignedTx, t, posthog]);

  useEffect(() => {
    let id: NodeJS.Timeout;
    if (estimate) {
      id = setInterval(() => {
        fetchEstimate();
      }, ESTIMATE_VALIDITY_INTERVAL);
    }
    return () => clearInterval(id);
  }, [estimate, fetchEstimate]);

  useEffect(() => {
    if (!quantity || !tokenA || !tokenB) {
      setEstimate(null);
    } else {
      fetchEstimate();
    }
  }, [tokenA, tokenB, quantity, fetchEstimate, setEstimate, excludedDexs]);

  const fetchDexList = () => {
    getDexList(t)
      .then((response) => {
        setDexList(response);
      })
      .catch((error) => {
        throw new Error(error);
      });
  };

  const fetchSwappableTokensList = () => {
    getSwappableTokensList()
      .then((response) => {
        setDexTokenList(response);
      })
      .catch((error) => {
        throw new Error(error);
      });
  };

  useEffect(() => {
    fetchSwappableTokensList();
    fetchDexList();
  }, []);

  const buildSwap = useCallback(
    async (cb?: () => void) => {
      // https://apidev.steelswap.io/docs#/swap/build_swap_swap_build__post
      const postBody = JSON.stringify(
        createSwapRequestBody({
          tokenA: tokenA.id,
          tokenB: tokenB.policyId + tokenB.policyName,
          quantity,
          ignoredDexs: excludedDexs,
          address: addresses?.[0]?.address,
          targetSlippage,
          collateral,
          utxos
        })
      );

      const response = await window.fetch(`${process.env.STEELSWAP_API_URL}/swap/build/`, {
        method: 'POST',
        headers: createSteelswapApiHeaders(),
        body: postBody
      });
      if (!response.ok) {
        try {
          const { detail } = await response.json();
          if (response.status === 406) {
            toast.notify({ duration: 3, text: detail });
            return;
          }
        } catch {
          toast.notify({ duration: 3, text: t('swaps.error.unableToBuild') });
          throw new Error('Unable to build swap');
        }
      } else {
        posthog.sendEvent(PostHogAction.SwapsBuildQuote, {
          tokenIn: tokenB.name,
          tokenOut: tokenA.name,
          amount: quantity,
          excludedDexs
        });
        const parsedResponse = (await response.json()) as BuildSwapResponse;
        setBuildResponse(parsedResponse);
        cb();
      }
    },
    [addresses, tokenA, tokenB, quantity, targetSlippage, collateral, excludedDexs, utxos, t, posthog]
  );

  const signAndSubmitSwapRequest = useCallback(async () => {
    if (!unsignedTx) {
      toast.notify({ duration: 3, text: t('swaps.error.unableToSign') });
      posthog.sendEvent(PostHogAction.SwapsSignFailure);
      setStage(SwapStage.Failure);
      return;
    }
    try {
      const finalTx = await inMemoryWallet.finalizeTx({ tx: unsignedTx.tx });
      const unsignedTxFromCbor = Serialization.Transaction.fromCbor(unsignedTx.tx);
      unsignedTxFromCbor.setWitnessSet(Serialization.TransactionWitnessSet.fromCore(finalTx.witness));
      await inMemoryWallet.submitTx(unsignedTxFromCbor.toCbor());
      posthog.sendEvent(PostHogAction.SwapsSignSuccess);
    } catch {
      toast.notify({ duration: 3, text: t('swaps.error.unableToSign') });
      posthog.sendEvent(PostHogAction.SwapsSignFailure);
      setStage(SwapStage.Failure);
    }
  }, [unsignedTx, inMemoryWallet, setStage, t, posthog]);

  // Wrapper for setTargetSlippage that persists to storage
  const setTargetSlippagePersisted = useCallback((value: number | ((prev: number) => number)) => {
    setTargetSlippage((prev) => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      // Persist to storage
      storage.local.set({ [SWAPS_TARGET_SLIPPAGE]: newValue }).catch((error) => {
        console.error('Failed to persist slippage setting:', error);
      });
      slippageInitializedRef.current = true;
      return newValue;
    });
  }, []);

  const contextValue: SwapProvider = {
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
    setBuildResponse,
    buildSwap,
    targetSlippage,
    setTargetSlippage: setTargetSlippagePersisted,
    signAndSubmitSwapRequest,
    excludedDexs,
    setExcludedDexs,
    stage,
    setStage,
    collateral,
    slippagePercentages,
    maxSlippagePercentage
  };

  return (
    <SwapsContext.Provider value={contextValue}>
      <SwapsContainer />
    </SwapsContext.Provider>
  );
};
