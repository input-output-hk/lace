import { PREVIEW_REALFI_CONFIG } from '@lace-contract/realfi-staking';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

// The real `@realfi-co/realfi-partner-sdk` + `@sundaeswap/core` ESM builds use
// node-ESM-incompatible directory imports (e.g. `@sundaeswap/core/dist/esm/@types`),
// so importing the provider transitively loads code node/vitest can't resolve
// (webpack bundles it fine — the SW build packs it). Mock the build seam so the
// provider's read-only stub methods stay unit-testable without loading the SDK.
vi.mock('../src/realfi-stake-tx', () => ({
  buildStakeUnsignedTx: vi.fn(async () => ({
    unsignedTxCbor: 'mock-unsigned-cbor',
    orderOutputIndex: 1,
    processingFeeLovelace: 1_000_000n,
  })),
  buildUnstakeUnsignedTx: vi.fn(async () => ({
    unsignedTxCbor: 'mock-unsigned-cbor',
    processingFeeLovelace: 1_000_000n,
  })),
  quoteSwapToUsdr: vi.fn(async () => ({
    usdrOut: 4_000_000n,
    priceImpact: 0.0011,
    poolFeeFraction: 0.003,
    venue: 'SundaeSwap V4',
  })),
  fetchOrderFeesBps: vi.fn(async () => ({ mintBps: 10, redeemBps: 10 })),
  txFeeLovelace: vi.fn(() => 185_000n),
  fetchBuildableStakeInputs: vi.fn(async () => [
    'ada.lovelace',
    'deadbeef.55534443',
  ]),
}));

// The partner-config read is a plain fetch (no SDK) — mocked so the stake-input
// tests are deterministic without stubbing global fetch.
vi.mock('../src/realfi-partner-config', () => ({
  fetchSwapCounterpartAssets: vi.fn(async () => undefined),
}));

// The cancel builder is the module's dedicated Blaze consumer and transitively
// loads the same ESM-incompatible SDK builds — mock the seam so the provider
// stays unit-testable without loading `@realfi-co`/`@sundaeswap`/`@blaze-cardano`.
vi.mock('../src/realfi-cancel-tx', () => ({
  buildCancelUnsignedTx: vi.fn(async () => 'mock-unsigned-cbor'),
}));

// The off-chain read helpers load the same ESM-incompatible SDK — mock the seam
// so the provider stays unit-testable without loading `@realfi-co`/`@sundaeswap`.
vi.mock('../src/realfi-stake-activities', () => ({
  getStakeActivities: vi.fn(async () => []),
  fetchWithdrawableUnstakes: vi.fn(async () => []),
  fetchCoolingDownUnstakes: vi.fn(async () => []),
}));

// The attribution claim is the module's other Blaze/SDK consumer — same seam
// treatment so the provider stays unit-testable.
vi.mock('../src/realfi-attribution', () => ({
  claimOrderAttribution: vi.fn(async () => ({ status: 'accepted' })),
}));

// The R-Points read loads the SDK root too (launch season, LW-15495).
vi.mock('../src/realfi-points', () => ({
  fetchRPoints: vi.fn(async () => ({ totalPoints: 0, fetchedAt: 0 })),
}));

// Stub the live vault-ratio yield feed so the provider maps a known value
// without a real GraphQL request.
// The diffusion-aware rate read loads the SDK root — mock the seam with a
// known scaled ratio (1e6-scaled USDr per sUSDr).
vi.mock('../src/realfi-exchange-rate', () => ({
  fetchVaultRatioScaled: vi.fn(async () => 1_133_700n),
}));

vi.mock('../src/realfi-yield', () => ({
  fetchStakingYield: vi.fn(async () => ({ apy: 0.083, usdrPerSusdr: 1.1337 })),
  fetchVaultRate: vi.fn(async () => 1.1337),
}));

import { claimOrderAttribution } from '../src/realfi-attribution';
import { fetchVaultRatioScaled } from '../src/realfi-exchange-rate';
import { fetchSwapCounterpartAssets } from '../src/realfi-partner-config';
import { createRealFiProvider } from '../src/realfi-provider';
import {
  buildStakeUnsignedTx,
  buildUnstakeUnsignedTx,
  fetchBuildableStakeInputs,
} from '../src/realfi-stake-tx';
import { fetchStakingYield, fetchVaultRate } from '../src/realfi-yield';

import type {
  RealFiBuildRequest,
  RealFiSorQuote,
} from '@lace-contract/realfi-staking';

// Lace's proxy-shaped client config (no projectId — key injected server-side).
const PROXY_BLOCKFROST = {
  baseUrl: 'https://proxy.example/extension/preview',
  apiVersion: 'v0',
};

const baseQuote: RealFiSorQuote = {
  quoteId: 'quote-1',
  kind: 'stake',
  inputAmount: '1000000',
  estimatedOutput: '900000',
  route: [],
  priceImpact: 0 as never,
  exchangeRate: 1,
  networkFee: '0',
  processingFee: '1000000',
  serviceFee: '0',
  serviceFeeTokenId: 'lovelace',
  quoteExpiresAt: 0 as never,
};

const baseRequest: RealFiBuildRequest = {
  config: PREVIEW_REALFI_CONFIG,
  quote: baseQuote,
  userAddress: 'addr_test1staker...',
  inputTokenId: 'lovelace',
  utxos: ['utxo-cbor-1', 'utxo-cbor-2'],
  collateralUtxos: [],
  protocolParameters: { coinsPerUtxoByte: 4310 } as never,
  ttl: 123_456,
};

describe('createRealFiProvider', () => {
  const provider = createRealFiProvider({
    resolveBlockfrostClientConfig: () => PROXY_BLOCKFROST,
  });

  it('getStakeInputAssets returns the discovery-verified list (curated falls back to compiled)', async () => {
    const result = await firstValueFrom(
      provider.getStakeInputAssets({ config: PREVIEW_REALFI_CONFIG }),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(['ada.lovelace', 'deadbeef.55534443']);
    }
    // The compiled copy was used: the live partner-config read returned undefined.
    expect(vi.mocked(fetchBuildableStakeInputs)).toHaveBeenCalledWith(
      PREVIEW_REALFI_CONFIG,
      PREVIEW_REALFI_CONFIG.swapCounterpartAssets,
    );
  });

  it('getStakeInputAssets falls back to the curated list alone when discovery is down', async () => {
    vi.mocked(fetchBuildableStakeInputs).mockRejectedValueOnce(
      new Error('sundae down'),
    );
    const result = await firstValueFrom(
      provider.getStakeInputAssets({ config: PREVIEW_REALFI_CONFIG }),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(PREVIEW_REALFI_CONFIG.swapCounterpartAssets);
    }
  });

  it('getStakeInputAssets rethrows a pipeline failure so retryBackoff can retry it (ADR-15)', async () => {
    vi.mocked(fetchSwapCounterpartAssets).mockRejectedValueOnce(
      new Error('boom'),
    );
    await expect(
      firstValueFrom(
        provider.getStakeInputAssets({ config: PREVIEW_REALFI_CONFIG }),
      ),
    ).rejects.toThrow('boom');
  });

  it('getExchangeRateAndApy maps the live APY + diffusion-aware vault rate', async () => {
    // The flag-resolved config carries the endpoint the live feeds consult.
    const result = await firstValueFrom(
      provider.getExchangeRateAndApy({ config: PREVIEW_REALFI_CONFIG }),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.apy).toBe(0.083);
      expect(result.value.exchangeRate).toBe(1.1337);
    }
  });

  it('getExchangeRateAndApy reports an absent APY (never 0) when only the annualization feed fails', async () => {
    vi.mocked(fetchStakingYield).mockResolvedValueOnce(undefined);
    const result = await firstValueFrom(
      provider.getExchangeRateAndApy({ config: PREVIEW_REALFI_CONFIG }),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.apy).toBeUndefined();
      expect(result.value.exchangeRate).toBe(1.1337);
    }
  });

  it('getExchangeRateAndApy errors when the vault-rate read fails (no fabricated rate)', async () => {
    vi.mocked(fetchVaultRate).mockResolvedValueOnce(undefined);
    const result = await firstValueFrom(
      provider.getExchangeRateAndApy({ config: PREVIEW_REALFI_CONFIG }),
    );
    expect(result.isOk()).toBe(false);
    if (!result.isOk()) {
      expect(result.error.code).toBe('PROVIDER_UNAVAILABLE');
    }
  });

  it('provider observables are cold — a resubscription re-invokes the fetch so retryBackoff is not inert (NEW-3)', async () => {
    // A settled promise wrapped in bare from() would replay the same rejection
    // on resubscribe, making the side-effect's retryBackoff a no-op. defer()
    // builds a fresh promise per subscription, so a retry actually re-fetches.
    const before = vi.mocked(fetchVaultRate).mock.calls.length;
    vi.mocked(fetchVaultRate).mockRejectedValueOnce(new Error('transient'));

    const rateAndApy$ = provider.getExchangeRateAndApy({
      config: PREVIEW_REALFI_CONFIG,
    });

    await expect(firstValueFrom(rateAndApy$)).rejects.toThrow('transient');
    const retried = await firstValueFrom(rateAndApy$);

    expect(retried.isOk()).toBe(true);
    expect(vi.mocked(fetchVaultRate).mock.calls.length - before).toBe(2);
  });

  const stakeQuoteRequest = {
    config: PREVIEW_REALFI_CONFIG,
    accountId: 'acc-1' as never,
    userAddress: 'addr1...',
    kind: 'stake' as const,
    inputTokenId: 'lovelace',
    inputAmount: '1000000',
    utxos: ['utxo-cbor-1'],
    protocolParameters: { coinsPerUtxoByte: 4310 } as never,
    ttl: 900,
  };

  it('getSorQuote prices from the live reads: dry-run network fee, pool + RealFi order fees, vault-rate output', async () => {
    const result = await firstValueFrom(
      provider.getSorQuote(stakeQuoteRequest),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // Dry-run build fee (txFeeLovelace mock).
      expect(result.value.networkFee).toBe('185000');
      // RealFi's processing fee reported by the dry-run build, kept apart
      // from the ledger fee.
      expect(result.value.processingFee).toBe('1000000');
      // The swap leg names the route the build will use.
      expect(result.value.route[0]?.venue).toBe('SundaeSwap V4');
      // Pool fee 1_000_000 × 0.003 + RealFi mint fee 1_000_000 × 10bps.
      expect(result.value.serviceFee).toBe('4000');
      // The service fee is denominated in the swap-input token, not summed
      // with the lovelace network fee.
      expect(result.value.serviceFeeTokenId).toBe('lovelace');
      // Swapped USDr (4 USDr) at the 1.1337 vault rate → sUSDr out.
      expect(result.value.estimatedOutput).toBe(
        ((4_000_000n * 1_000_000n) / 1_133_700n).toString(),
      );
      expect(result.value.priceImpact).toBe(0.0011);
    }
  });

  it('getSorQuote errors instead of falling back when the vault-rate feed is down', async () => {
    vi.mocked(fetchVaultRatioScaled).mockResolvedValueOnce(undefined);
    // A down feed is transport-grade: rethrown so the quote side-effect's
    // retryBackoff can retry it (ADR-15) — never a fabricated fallback quote.
    await expect(
      firstValueFrom(provider.getSorQuote(stakeQuoteRequest)),
    ).rejects.toThrow('vault rate unavailable');
  });

  it('getSorQuote reports unavailable for a stake quote without a Blockfrost credential (version detection needs it)', async () => {
    const providerNoKey = createRealFiProvider({
      resolveBlockfrostClientConfig: () => undefined,
    });
    const result = await firstValueFrom(
      providerNoKey.getSorQuote(stakeQuoteRequest),
    );
    expect(result.isOk()).toBe(false);
    if (!result.isOk()) {
      expect(result.error.code).toBe('PROVIDER_UNAVAILABLE');
    }
  });

  it('getSorQuote reports unavailable for an unstake quote without a Blockfrost credential (version detection needs it)', async () => {
    const providerNoKey = createRealFiProvider({
      resolveBlockfrostClientConfig: () => undefined,
    });
    const result = await firstValueFrom(
      providerNoKey.getSorQuote({
        ...stakeQuoteRequest,
        kind: 'unstake' as const,
        inputTokenId: 'susdr',
        outputTokenId: PREVIEW_REALFI_CONFIG.usdrTokenId,
      }),
    );
    expect(result.isOk()).toBe(false);
    if (!result.isOk()) {
      expect(result.error.code).toBe('PROVIDER_UNAVAILABLE');
    }
  });

  it('buildBundledTx wires a stake request into buildStakeUnsignedTx with the Blockfrost project id', async () => {
    const request: RealFiBuildRequest = {
      ...baseRequest,
      quote: {
        ...baseQuote,
        kind: 'stake',
        route: [
          {
            venue: 'SundaeSwap V3',
            fromTokenId: 'ada',
            toTokenId: 'usdr',
          },
        ],
      },
    };
    const result = await firstValueFrom(provider.buildBundledTx(request));
    expect(result.isOk()).toBe(true);
    // No slippage in the request: the builder owns the swap-leg tolerance and
    // the partner SDK owns the RealFi-leg min_received default.
    expect(buildStakeUnsignedTx).toHaveBeenCalledWith({
      config: PREVIEW_REALFI_CONFIG,
      changeAddressBech32: request.userAddress,
      utxos: request.utxos,
      protocolParameters: request.protocolParameters,
      ttlSeconds: request.ttl,
      inputTokenId: request.inputTokenId,
      inputAmount: BigInt(request.quote.inputAmount),
      blockfrost: PROXY_BLOCKFROST,
    });
  });

  it('buildBundledTx carries the order output index the attribution claim needs', async () => {
    const result = await firstValueFrom(
      provider.buildBundledTx({
        ...baseRequest,
        quote: { ...baseQuote, kind: 'stake' },
      }),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // Exactly the serializable pair: the builder's bigint processing fee is
      // quote-only and must not reach the store.
      expect(result.value).toEqual({
        unsignedTxCbor: 'mock-unsigned-cbor',
        orderOutputIndex: 1,
      });
    }
  });

  it('buildBundledTx reports no order output index for an unstake (nothing to attribute)', async () => {
    const result = await firstValueFrom(
      provider.buildBundledTx({
        ...baseRequest,
        inputTokenId: 'susdr',
        outputTokenId: PREVIEW_REALFI_CONFIG.usdrTokenId,
        quote: { ...baseQuote, kind: 'unstake' },
      }),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.orderOutputIndex).toBeUndefined();
    }
  });

  it('claimOrderAttribution passes the tx and order index to the SDK-backed claim', async () => {
    const result = await firstValueFrom(
      provider.claimOrderAttribution({
        config: PREVIEW_REALFI_CONFIG,
        userAddress: baseRequest.userAddress,
        serializedTx: 'signed-cbor',
        orderOutputIndex: 1,
      }),
    );
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual({ status: 'accepted' });
    }
    expect(claimOrderAttribution).toHaveBeenCalledWith({
      config: PREVIEW_REALFI_CONFIG,
      blockfrost: PROXY_BLOCKFROST,
      changeAddressBech32: baseRequest.userAddress,
      serializedTx: 'signed-cbor',
      orderOutputIndex: 1,
    });
  });

  it('claimOrderAttribution reports unavailable without Blockfrost access', async () => {
    const providerNoKey = createRealFiProvider({
      resolveBlockfrostClientConfig: () => undefined,
    });
    const result = await firstValueFrom(
      providerNoKey.claimOrderAttribution({
        config: PREVIEW_REALFI_CONFIG,
        userAddress: baseRequest.userAddress,
        serializedTx: 'signed-cbor',
        orderOutputIndex: 0,
      }),
    );
    expect(result.isOk()).toBe(false);
    if (!result.isOk()) {
      expect(result.error.code).toBe('PROVIDER_UNAVAILABLE');
    }
  });

  it('buildBundledTx classifies compliance-gate failures by state and correlation id', async () => {
    const request: RealFiBuildRequest = {
      ...baseRequest,
      quote: { ...baseQuote, kind: 'stake' },
    };
    const gateError = (state: string, correlationId?: string) =>
      Object.assign(new Error(`Compliance handshake ${state}`), {
        name: 'ComplianceGateError',
        state,
        correlationId,
      });
    const cases: [Error, string][] = [
      [gateError('pending_review', 'corr-1'), 'COMPLIANCE_PENDING_REVIEW'],
      // A refusal always carries a correlation id...
      [gateError('not_authorized', 'corr-2'), 'COMPLIANCE_NOT_AUTHORIZED'],
      // ...an id-less refusal (or the SDK's upcoming `unavailable` state)
      // means the screening service itself could not be reached.
      [gateError('not_authorized'), 'COMPLIANCE_UNAVAILABLE'],
      [gateError('unavailable'), 'COMPLIANCE_UNAVAILABLE'],
    ];
    for (const [error, code] of cases) {
      vi.mocked(buildStakeUnsignedTx).mockRejectedValueOnce(error);
      const result = await firstValueFrom(provider.buildBundledTx(request));
      expect(result.isOk()).toBe(false);
      if (!result.isOk()) expect(result.error.code).toBe(code);
    }
    // A non-compliance throw is rethrown for the side-effect's retryBackoff
    // (ADR-15) instead of being parked on the success channel as Err.
    vi.mocked(buildStakeUnsignedTx).mockRejectedValueOnce(new Error('boom'));
    await expect(
      firstValueFrom(provider.buildBundledTx(request)),
    ).rejects.toThrow('boom');
  });

  it('buildBundledTx reports unavailable for a stake build without a Blockfrost credential', async () => {
    const providerNoKey = createRealFiProvider({
      resolveBlockfrostClientConfig: () => undefined,
    });
    const request: RealFiBuildRequest = {
      ...baseRequest,
      quote: { ...baseQuote, kind: 'stake' },
    };
    const result = await firstValueFrom(providerNoKey.buildBundledTx(request));
    expect(result.isOk()).toBe(false);
    if (!result.isOk()) {
      expect(result.error.code).toBe('PROVIDER_UNAVAILABLE');
    }
  });

  it('buildBundledTx wires an unstake request into buildUnstakeUnsignedTx (USDr-only output)', async () => {
    const request: RealFiBuildRequest = {
      ...baseRequest,
      outputTokenId: undefined,
      quote: {
        ...baseQuote,
        kind: 'unstake',
        route: [
          {
            venue: 'RealFi',
            fromTokenId: 'susdr',
            toTokenId: 'usdr',
          },
          {
            venue: 'SundaeSwap V3',
            fromTokenId: 'usdr',
            toTokenId: 'output',
          },
        ],
      },
    };
    const result = await firstValueFrom(provider.buildBundledTx(request));
    expect(result.isOk()).toBe(true);
    expect(buildUnstakeUnsignedTx).toHaveBeenCalledWith({
      config: PREVIEW_REALFI_CONFIG,
      changeAddressBech32: request.userAddress,
      utxos: request.utxos,
      protocolParameters: request.protocolParameters,
      ttlSeconds: request.ttl,
      susdrAmount: BigInt(request.quote.inputAmount),
      blockfrost: PROXY_BLOCKFROST,
    });
  });

  it('buildBundledTx rejects an unstake whose output is not USDr (unstake is locked to USDr)', async () => {
    vi.mocked(buildUnstakeUnsignedTx).mockClear();
    const request: RealFiBuildRequest = {
      ...baseRequest,
      outputTokenId: 'lovelace',
      quote: { ...baseQuote, kind: 'unstake' },
    };
    const result = await firstValueFrom(provider.buildBundledTx(request));
    expect(result.isOk()).toBe(false);
    if (!result.isOk()) {
      expect(result.error.message).toBe('Unstake output is locked to USDr');
    }
    expect(buildUnstakeUnsignedTx).not.toHaveBeenCalled();
  });
});
