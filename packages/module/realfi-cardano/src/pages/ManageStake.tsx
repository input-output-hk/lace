import { useAnalytics } from '@lace-contract/analytics';
import {
  ADA_DECIMALS,
  LOVELACE_TOKEN_ID,
  getAdaTokenTickerByNetwork,
} from '@lace-contract/cardano-context';
import { useTranslation } from '@lace-contract/i18n';
import { isLaunchSeasonActive } from '@lace-contract/realfi-staking';
import { NavigationControls, SheetRoutes } from '@lace-lib/navigation';
import {
  Button,
  Column,
  Divider,
  DropdownMenu,
  footerHeight,
  getAssetImageUrl,
  Icon,
  Logos,
  Row,
  Sheet,
  SwapInput,
  Tabs,
  Text,
  spacing,
  useTheme,
} from '@lace-lib/ui-toolkit';
import {
  formatAmountToLocale,
  formatLocaleNumber,
} from '@lace-lib/util-render';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { complianceMessagingFor } from '../compliance-messaging';
import { RPointsBonusCallout } from '../components/RPointsBonusCallout';
import { formatCooldownRemaining } from '../cooldown-remaining';
import { sanitizeErrorDetail } from '../error-detail';
import { useDispatchLaceAction, useLaceSelector } from '../hooks';
import { isUsdrTokenId } from '../realfi-config';
import { useActiveRealFiConfig } from '../use-realfi-config';
import { useReviewFeePricing } from '../use-review-fee-pricing';

import type { AccountId } from '@lace-contract/wallet-repo';
import type { SheetScreenProps } from '@lace-lib/navigation';
import type { SwapInputToken, Theme } from '@lace-lib/ui-toolkit';

// sUSDr is the fixed receive asset; its token id comes from the active network's
// RealFi config (REALFI flag payload). Decimals are a local constant (all RealFi
// stake assets use 6) pending a token-registry read.
const SUSDR_DECIMALS = 6;
const SUSDR_TICKER = 'sUSDrf';
// Held USDr is labelled from this rather than from registry metadata: a
// wallet that already fetched the token still carries the old ticker, and
// the on-chain asset-name fallback is permanently the old spelling, so both
// would disagree with the rest of the sheet (LW-15570).
const USDR_TICKER = 'USDrf';

// Matches the SwapInput token avatar (AVATAR_SIZE) so brand logos fill the frame.
const TOKEN_ICON_SIZE = 32;

// ADA the bundled order must carry beyond the picked asset — a display-side
// estimate of what the SDK-built order funds: a SundaeSwap leg carries the
// scooper fee plus this route-deposit rider; a RealFi-only leg rests on the
// order min-ADA. The builders compute the real figures at build time.
const ROUTE_DEPOSIT_LOVELACE = 3_000_000n;
const ORDER_MIN_ADA_LOVELACE = 2_000_000n;
// Headroom for the tx fee plus min-ADA on the token-carrying change output — a
// display-side estimate; the builder computes the real figures at build time.
const FEE_AND_CHANGE_HEADROOM_LOVELACE = 2_000_000n;

/**
 * Wallet token id for a SundaeSwap `policyId.assetNameHex` counterpart id
 * ("ada.lovelace" → lovelace), used to resolve the network config's
 * `swapCounterpartAssets` entries against wallet tokens.
 */
const fromSundaeCounterpartId = (counterpartId: string): string =>
  counterpartId === 'ada.lovelace'
    ? LOVELACE_TOKEN_ID
    : counterpartId.replace('.', '');

// Fallback so the picker renders without crashing when no stakeable input is
// available (e.g. before the user holds any USDr/USDCx/USDM on this network).
const EMPTY_INPUT_OPTION: InputTokenOption = {
  tokenId: '',
  name: '',
  decimals: 6,
};

// Quote re-fetch debounce while the user edits the amount.
const QUOTE_DEBOUNCE_MS = 400;

type StakeTab = 'stake' | 'unstake';

// Stable selector param (avoids a fresh object identity every render).
const CARDANO_BLOCKCHAIN_PARAM = { blockchainName: 'Cardano' } as const;

type InputTokenOption = {
  tokenId: string;
  name: string;
  decimals: number;
  /** Base units; undefined for mocked tokens (skips balance validation). */
  available?: string;
  icon?: SwapInputToken['icon'];
};

// The config's counterpart assets are all 6-decimal stablecoins; used when a
// token's registry metadata (and with it `decimals`) hasn't synced yet.
const FALLBACK_STABLECOIN_DECIMALS = 6;

/**
 * Fallback display name for a token with no registry metadata: the
 * ASCII-decoded on-chain asset name (e.g. preprod USDM has no token-registry
 * entry, so a ticker never syncs). Falls back to a token-id prefix when the
 * asset name isn't printable ASCII.
 */
// CIP-68 fungible-token asset-name label (333), e.g. preview USDM.
const CIP68_FT_LABEL_HEX = '0014df10';

const assetNameFromTokenId = (tokenId: string): string => {
  const assetNameHex = tokenId.slice(56);
  const printableHex = assetNameHex.startsWith(CIP68_FT_LABEL_HEX)
    ? assetNameHex.slice(CIP68_FT_LABEL_HEX.length)
    : assetNameHex;
  const codes = (printableHex.match(/.{2}/g) ?? []).map(byte =>
    Number.parseInt(byte, 16),
  );
  const isPrintable =
    codes.length > 0 && codes.every(code => code >= 32 && code <= 126);
  return isPrintable ? String.fromCharCode(...codes) : tokenId.slice(0, 8);
};

/**
 * Live price impact (swap leg) + its fiat value, e.g. "0.11% (-$33.51)".
 * The quote's impact value is USD-denominated; shown converted to the
 * selected currency, or as USD while no conversion rate is cached.
 */
const priceImpactLine = (
  review:
    | { priceImpact: number; quote: { priceImpactUsd?: string } }
    | undefined,
  usdToCurrencyRate: number | undefined,
  currencyTicker: string,
): string => {
  if (!review) return '—';
  const percent = `${(review.priceImpact * 100).toFixed(2)}%`;
  const impactUsd = Number(review.quote.priceImpactUsd ?? '0');
  if (impactUsd <= 0) return percent;
  const fiat =
    usdToCurrencyRate === undefined
      ? `$${formatLocaleNumber(String(impactUsd), 2)}`
      : `${currencyTicker}${formatLocaleNumber(
          String(impactUsd * usdToCurrencyRate),
          2,
        )}`;
  return `${percent} (-${fiat})`;
};

/**
 * Estimated-fee lines. No quote yet → explicit zero placeholders (per AC).
 * With a quote, one summed figure when both fees share a denomination,
 * otherwise both amounts side by side — a cross-asset sum has no single
 * honest number. Fiat = the converted legs' fiat sum — the SAME conversion
 * the Review sheet shows (never total-ADA × ADA-price, which re-converts the
 * service leg through a second rate and can disagree with the breakdown
 * rows). A quoted fee with an unpriced leg renders no fiat line (prices are
 * mainnet-only) — a 0.00 stand-in would claim a conversion we don't have.
 */
const estimatedFeeLines = (params: {
  hasReview: boolean;
  serviceFeeTokenId: string | undefined;
  usdrTokenId: string | undefined;
  serviceFeeToken:
    | { displayShortName?: string; metadata?: { ticker?: string } }
    | undefined;
  networkFee: { units: number; fiat: number | undefined };
  serviceFee: { units: number; fiat: number | undefined };
  currencyTicker: string;
  /** Network's ADA ticker — `tADA` off mainnet, as everywhere else in the app. */
  adaTicker: string;
}): { feeDisplay: string; feeFiatDisplay: string | undefined } => {
  const { networkFee, serviceFee, serviceFeeToken, currencyTicker, adaTicker } =
    params;
  if (!params.hasReview) {
    return {
      feeDisplay: `0.00 ${adaTicker}`,
      feeFiatDisplay: `0.00 ${currencyTicker}`,
    };
  }
  if (params.serviceFeeTokenId === LOVELACE_TOKEN_ID) {
    const summed = formatLocaleNumber(
      String(networkFee.units + serviceFee.units),
      2,
    );
    return {
      feeDisplay: `${summed} ${adaTicker}`,
      feeFiatDisplay: sumFeeFiat(networkFee, serviceFee, currencyTicker),
    };
  }
  const serviceFeeTicker =
    params.serviceFeeTokenId === params.usdrTokenId
      ? 'USDrf'
      : serviceFeeToken?.displayShortName ??
        serviceFeeToken?.metadata?.ticker ??
        '';
  const feeDisplay = `${formatLocaleNumber(
    String(networkFee.units),
    2,
  )} ${adaTicker}, ${formatLocaleNumber(
    String(serviceFee.units),
    2,
  )} ${serviceFeeTicker}`.trim();
  return {
    feeDisplay,
    feeFiatDisplay: sumFeeFiat(networkFee, serviceFee, currencyTicker),
  };
};

const sumFeeFiat = (
  networkFee: { fiat: number | undefined },
  serviceFee: { fiat: number | undefined },
  currencyTicker: string,
): string | undefined =>
  networkFee.fiat !== undefined && serviceFee.fiat !== undefined
    ? `${formatLocaleNumber(
        String(networkFee.fiat + serviceFee.fiat),
        2,
      )} ${currencyTicker}`
    : undefined;

/**
 * Manage Stake sheet (M3/M6). Account selector (wired to the wallet/token
 * stores) → stake/unstake toggle → swap-style pay (ADA + stablecoins) / receive
 * (sUSDr) inputs → quote-driven info rows (exchange rate, estimated
 * fee). The amount drives `prepareRequested` (the SOR-quote side-effect, stubbed
 * up to tx-building); the Stake CTA navigates to Review once a quote is ready.
 */
export const ManageStake = (
  props: SheetScreenProps<SheetRoutes.RealFiManageStake>,
) => {
  const { navigation } = props;
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const routeAccountId = props.route.params.accountId as AccountId;

  // Active-network RealFi token ids (undefined off-preview today). Used to match
  // USDr/sUSDr holdings + label the swap inputs by the current network's assets.
  const realfiConfig = useActiveRealFiConfig();
  const usdrTokenId = realfiConfig?.usdrTokenId;
  const susdrTokenId = realfiConfig?.susdrTokenId;

  const [tab, setTab] = useState<StakeTab>(props.route.params.tab ?? 'stake');

  const stakeTabs = useMemo(
    () => [
      {
        label: t('realfi.manage.stake-tab'),
        value: 'stake' as const,
        testID: 'realfi-manage-tab-stake',
      },
      {
        label: t('realfi.manage.unstake-tab'),
        value: 'unstake' as const,
        testID: 'realfi-manage-tab-unstake',
      },
    ],
    [t],
  );
  const [amount, setAmount] = useState('');
  // The user-picked stake input token (ADA default), chosen in the select-token
  // sheet and read back from the store (mirrors the swap flow). Unstake has no
  // pick: its input is fixed sUSDr and its output is locked to USDr (product
  // decision — no swap-back leg).
  const selectInputToken = useDispatchLaceAction(
    'realfiPosition.stakeInputTokenSelected',
  );
  const selectedInputTokenId =
    useLaceSelector('realfiPosition.selectSelectedStakeInputTokenId') ??
    LOVELACE_TOKEN_ID;

  // --- Account selector (store-wired) ---
  const accountsResult = useLaceSelector(
    'wallets.selectActiveNetworkAccountsByBlockchainName',
    CARDANO_BLOCKCHAIN_PARAM,
  );
  const walletsResult = useLaceSelector('wallets.selectAll');
  const accounts = useMemo(
    () => (Array.isArray(accountsResult) ? accountsResult : []),
    [accountsResult],
  );
  const wallets = useMemo(
    () => (Array.isArray(walletsResult) ? walletsResult : []),
    [walletsResult],
  );

  const [selectedAccountId, setSelectedAccountId] =
    useState<AccountId>(routeAccountId);
  // Fall back to the first available account if the route's account is absent.
  useEffect(() => {
    if (
      accounts.length > 0 &&
      !accounts.some(account => account.accountId === selectedAccountId)
    ) {
      setSelectedAccountId(accounts[0].accountId);
    }
  }, [accounts, selectedAccountId]);

  // One-time Lace acquisition bonus (LW-15495 AC4): the callout shows only
  // when THIS transaction swaps into USDr (stake tab funded by a non-USDr
  // token) and the bonus is still available to the selected account — derived
  // from RealFi's own order history + the local consumed flag (the SDK
  // exposes no bonus-used read). A stake funded from already-held USDr must
  // never show bonus messaging — the bonus attaches to the swap, not staking.
  const isBonusAvailable = useLaceSelector(
    'realfiPosition.selectIsLaceSwapBonusAvailableByAccountId',
    selectedAccountId,
  );
  const shouldShowBonusCallout =
    tab === 'stake' &&
    // Windowed: the season has its own activeFrom/activeTo, and a CMS kill
    // switch delivers `launchSeason: null`.
    isLaunchSeasonActive(realfiConfig?.launchSeason, Date.now()) &&
    isBonusAvailable &&
    usdrTokenId !== undefined &&
    !isUsdrTokenId(selectedInputTokenId, usdrTokenId);
  // Impression, once per sheet visit however often eligibility flickers while
  // the user changes tab or pay token.
  const hasTrackedBonusCallout = useRef(false);
  useEffect(() => {
    if (hasTrackedBonusCallout.current || !shouldShowBonusCallout) return;
    hasTrackedBonusCallout.current = true;
    trackEvent('realfi | bonus callout | viewed');
  }, [shouldShowBonusCallout, trackEvent]);

  const accountData = useMemo(
    () =>
      accounts.map(account => {
        const wallet = wallets.find(w => w?.walletId === account?.walletId);
        return {
          accountId: account.accountId,
          accountName: account?.metadata?.name ?? '',
          walletName: wallet?.metadata?.name ?? '',
        };
      }),
    [accounts, wallets],
  );
  const selectedAccount = accountData.find(
    account => account.accountId === selectedAccountId,
  );
  const accountDropdownItems = useMemo(
    () =>
      accountData.map(account => ({
        id: account.accountId,
        text: account.walletName,
        subText: account.accountName,
      })),
    [accountData],
  );
  const handleAccountChange = useCallback(
    (index: number) => {
      const account = accounts[index];
      if (account) setSelectedAccountId(account.accountId);
    },
    [accounts],
  );

  // --- Pay token list (ADA from store + mocked stablecoins) ---
  const accountFungibleTokens = useLaceSelector(
    'tokens.selectAggregatedFungibleTokensByAccountId',
    selectedAccountId ?? '',
  );
  const adaToken = useMemo(
    () =>
      (accountFungibleTokens ?? []).find(
        token => token.tokenId === LOVELACE_TOKEN_ID,
      ),
    [accountFungibleTokens],
  );

  // Taken from the network rather than the token store's metadata: the store's
  // lovelace ticker is corrected asynchronously after a network switch
  // (cardano-context's syncLovelaceTokenTickerWithChain), so reading it here
  // can render the previous network's ticker for a frame.
  const networkType = useLaceSelector('network.selectNetworkType');
  const adaTicker = getAdaTokenTickerByNetwork(networkType);

  const adaOption: InputTokenOption = useMemo(
    () => ({
      tokenId: LOVELACE_TOKEN_ID,
      name: adaTicker,
      decimals: adaToken?.decimals ?? ADA_DECIMALS,
      available: adaToken ? String(adaToken.available) : '0',
      icon: (() => {
        const url = getAssetImageUrl(adaToken?.metadata?.image);
        return url ? { uri: url } : undefined;
      })(),
    }),
    [adaToken, adaTicker],
  );
  // Wallet-token → picker-option mapping. Name/decimals fall back to the
  // on-chain asset name and the stablecoin default when registry metadata
  // hasn't synced (or, like preprod USDM, has no registry entry at all).
  type WalletToken = NonNullable<typeof accountFungibleTokens>[number];
  const walletTokenOption = useCallback(
    (token: WalletToken): InputTokenOption => ({
      tokenId: token.tokenId,
      name:
        usdrTokenId !== undefined && isUsdrTokenId(token.tokenId, usdrTokenId)
          ? USDR_TICKER
          : token.displayShortName ??
            token.metadata?.ticker ??
            assetNameFromTokenId(token.tokenId),
      decimals: token.decimals || FALLBACK_STABLECOIN_DECIMALS,
      available: String(token.available),
      icon: (() => {
        const url = getAssetImageUrl(token.metadata?.image);
        return url ? { uri: url } : undefined;
      })(),
    }),
    [usdrTokenId],
  );
  // The stake-input list: the live product-curated counterpart list plus ADA,
  // verified against live Sundae discovery so only assets a composable USDr
  // pool can fill are offered. Fetched by the provider (service worker) via
  // the `makeStakeInputAssets` side-effect — the partner-config read and the
  // Sundae client are network/SDK I/O that must not run in the Metro-bundled
  // page (ADR-19). The compiled counterpart copy serves until data arrives.
  const stakeInputAssetsByNetwork = useLaceSelector(
    'realfiPosition.selectStakeInputAssetsByNetwork',
  );
  const runtimeCounterparts = realfiConfig
    ? stakeInputAssetsByNetwork[realfiConfig.realfiNetwork]
    : undefined;
  const requestStakeInputAssets = useDispatchLaceAction(
    'realfiPosition.stakeInputAssetsRequested',
  );
  const realfiNetwork = realfiConfig?.realfiNetwork;
  useEffect(() => {
    if (!realfiNetwork) return;
    // Per-visit, not per-session: requesting clears the network's cached list
    // and the selection returns to ADA, so ADA availability is re-decided from
    // fresh discovery each time the sheet opens — a prior visit's fallback
    // (or pick) must not outlive its sheet.
    requestStakeInputAssets({ realfiNetwork });
    selectInputToken({ tokenId: LOVELACE_TOKEN_ID });
  }, [realfiNetwork, requestStakeInputAssets, selectInputToken]);

  // Live cooldown boundary (SDK stakeTimes read via the provider): the unlock
  // an unstake submitted now would carry, for the Cooldown Period row.
  const requestCooldownUnlockTime = useDispatchLaceAction(
    'realfiPosition.cooldownUnlockTimeRequested',
    true,
  );
  useEffect(() => {
    if (realfiConfig) requestCooldownUnlockTime();
  }, [realfiConfig, requestCooldownUnlockTime]);
  const cooldownUnlockAtMsByNetwork = useLaceSelector(
    'realfiPosition.selectCooldownUnlockAtMsByNetwork',
  );
  const cooldownUnlockAtMs = realfiConfig
    ? cooldownUnlockAtMsByNetwork[realfiConfig.realfiNetwork]
    : undefined;

  // Every RealFi-listed swap counterpart is offered — even when the wallet
  // holds none of it (available "0"), matching RealFi's own app. Wallet data
  // (name/decimals/icon/balance) is merged in for held assets; unheld ones
  // stand on the on-chain asset name + stablecoin defaults.
  const counterpartOptions = useMemo<InputTokenOption[]>(
    () =>
      (runtimeCounterparts ?? realfiConfig?.swapCounterpartAssets ?? []).map(
        counterpartId => {
          const tokenId = fromSundaeCounterpartId(counterpartId);
          if (tokenId === LOVELACE_TOKEN_ID) return adaOption;
          const held = (accountFungibleTokens ?? []).find(
            token => token.tokenId === tokenId,
          );
          return held
            ? walletTokenOption(held)
            : {
                tokenId,
                name: assetNameFromTokenId(tokenId),
                decimals: FALLBACK_STABLECOIN_DECIMALS,
                available: '0',
              };
        },
      ),
    [
      runtimeCounterparts,
      realfiConfig,
      accountFungibleTokens,
      adaOption,
      walletTokenOption,
    ],
  );
  // Stake-pathway order: ADA first, then the counterpart stablecoins, then USDr
  // (the direct, no-swap leg) last — the counterpart assets are all stablecoins,
  // so partitioning `counterpartOptions` on lovelace splits ADA from the
  // stablecoins. USDr appears last and only when held.
  const inputTokens = useMemo(() => {
    const heldUsdr = (accountFungibleTokens ?? []).find(
      token => token.tokenId === usdrTokenId,
    );
    const ada = counterpartOptions.filter(
      token => token.tokenId === LOVELACE_TOKEN_ID,
    );
    // While discovery is unresolved, ADA is offered optimistically: it is the
    // sheet's default and drops out only when a RESOLVED list proves no
    // composable ADA↔USDr pool — never merely because the compiled stablecoin
    // fallback hasn't been superseded yet (that would swap the default away
    // before discovery could confirm it, and the swap would stick).
    const adaOffered =
      ada.length > 0
        ? ada
        : runtimeCounterparts === undefined
        ? [adaOption]
        : [];
    const stablecoins = counterpartOptions.filter(
      token => token.tokenId !== LOVELACE_TOKEN_ID,
    );
    return [
      ...adaOffered,
      ...stablecoins,
      ...(heldUsdr ? [walletTokenOption(heldUsdr)] : []),
    ];
  }, [
    accountFungibleTokens,
    usdrTokenId,
    walletTokenOption,
    counterpartOptions,
    runtimeCounterparts,
    adaOption,
  ]);

  const isUnstake = tab === 'unstake';

  // sUSDr the user holds (the unstake input). Balance drives the pay side + the
  // insufficient-funds check in unstake mode.
  const susdrToken = useMemo(
    () =>
      (accountFungibleTokens ?? []).find(
        token => token.tokenId === susdrTokenId,
      ),
    [accountFungibleTokens, susdrTokenId],
  );
  const susdrOption: InputTokenOption = useMemo(
    () => ({
      tokenId: susdrTokenId ?? '',
      name: SUSDR_TICKER,
      decimals: susdrToken?.decimals ?? SUSDR_DECIMALS,
      available: susdrToken ? String(susdrToken.available) : '0',
    }),
    [susdrToken, susdrTokenId],
  );
  // The user-picked stake input token (the picker never opens on unstake).
  const pickerTokens = inputTokens;
  const pickedToken =
    pickerTokens.find(token => token.tokenId === selectedInputTokenId) ??
    pickerTokens[0] ??
    EMPTY_INPUT_OPTION;

  // Keep the selection valid when the available options change — e.g. the
  // default ADA input is filtered out on a network with no ADA↔USDr pool. Fall
  // back to the first available option so the quote runs against a stakeable
  // token instead of silently no-op'ing on a token with no route.
  useEffect(() => {
    if (
      pickerTokens.length > 0 &&
      !pickerTokens.some(token => token.tokenId === selectedInputTokenId)
    ) {
      selectInputToken({ tokenId: pickerTokens[0].tokenId });
    }
  }, [pickerTokens, selectedInputTokenId, selectInputToken]);

  const adaBalanceDisplay = formatAmountToLocale(
    adaOption.available ?? '0',
    adaOption.decimals,
  );

  // USDr / sUSDr have vector brand logos (ui-toolkit) rather than wallet raster
  // icons; ADA + stablecoins keep their wallet asset image.
  const brandLogoFor = (tokenId: string): React.ReactNode | undefined => {
    if (tokenId && tokenId === usdrTokenId)
      return <Logos.Usdr size={TOKEN_ICON_SIZE} />;
    if (tokenId && tokenId === susdrTokenId)
      return <Logos.Susdr size={TOKEN_ICON_SIZE} />;
    return undefined;
  };

  // Pay = what the user supplies (input picker for stake, fixed sUSDr for
  // unstake). Receive = what they get, fixed per tab: sUSDr for stake, USDr
  // for unstake (unstake output is locked to USDr — no swap-back).
  const payTokenOption = isUnstake ? susdrOption : pickedToken;
  const payToken: SwapInputToken = {
    name: payTokenOption.name,
    balance: formatAmountToLocale(
      payTokenOption.available ?? '0',
      payTokenOption.decimals,
    ),
    icon: payTokenOption.icon,
    iconNode: brandLogoFor(payTokenOption.tokenId),
  };
  const receiveToken: SwapInputToken = isUnstake
    ? { name: USDR_TICKER, iconNode: <Logos.Usdr size={TOKEN_ICON_SIZE} /> }
    : { name: SUSDR_TICKER, iconNode: <Logos.Susdr size={TOKEN_ICON_SIZE} /> };
  // Both receive assets (sUSDr / USDr) are 6-decimal.
  const receiveDecimals = SUSDR_DECIMALS;

  // Half/Max quick-amount buttons on the pay input (mirrors the swap center):
  // set the amount to a fraction of the pay token's available balance in display
  // units. Covers both stake (picked input token) and unstake (sUSDr).
  const payAvailable = payTokenOption.available;
  const payDecimals = payTokenOption.decimals;
  const applyQuickAmount = useCallback(
    (fraction: 0.5 | 1) => {
      if (payAvailable === undefined) return;
      // Integer math on base units, then a plain decimal string — float
      // division + String() can render "5e-7" or 17-digit artifacts into the
      // input for small/odd balances.
      const baseUnits =
        fraction === 1 ? BigInt(payAvailable) : BigInt(payAvailable) / 2n;
      const padded = baseUnits.toString().padStart(payDecimals + 1, '0');
      const whole = padded.slice(0, padded.length - payDecimals) || '0';
      const frac = payDecimals
        ? padded.slice(-payDecimals).replace(/0+$/, '')
        : '';
      setAmount(frac ? `${whole}.${frac}` : whole);
    },
    [payAvailable, payDecimals],
  );
  const payQuickActions = useMemo(
    () => [
      <Button.Secondary
        key="half"
        size="small"
        label={t('realfi.manage.half')}
        testID="realfi-manage-pay-half"
        onPress={() => {
          applyQuickAmount(0.5);
        }}
      />,
      <Button.Secondary
        key="max"
        size="small"
        label={t('realfi.manage.max')}
        testID="realfi-manage-pay-max"
        onPress={() => {
          applyQuickAmount(1);
        }}
      />,
    ],
    [t, applyQuickAmount],
  );

  // Open the token-select sheet, handing it the derived options; it records the
  // pick (read back from the store) and closes back here (mirrors the swap
  // select-token sheet).
  const openTokenSelect = useCallback(() => {
    NavigationControls.navigate(SheetRoutes.RealFiSelectStakeToken, {
      selectedTokenId: selectedInputTokenId,
      tokens: pickerTokens.map(token => ({
        tokenId: token.tokenId,
        name: token.name,
        decimals: token.decimals,
        available: token.available ?? '0',
        iconUri:
          token.icon && typeof token.icon === 'object' && 'uri' in token.icon
            ? String(token.icon.uri)
            : undefined,
      })),
    });
  }, [pickerTokens, selectedInputTokenId]);

  // --- Pricing (for the estimated-fee fiat line) ---
  const currency = useLaceSelector('tokenPricing.selectCurrencyPreference');
  const usdToCurrencyRate = useLaceSelector(
    'tokenPricing.selectUsdToCurrencyRate',
  );

  // --- Quote flow (store-wired; stubbed up to tx-building) ---
  const flowState = useLaceSelector('realfiFlow.selectFlowState');
  const prepare = useDispatchLaceAction('realfiFlow.prepareRequested');
  const resetFlow = useDispatchLaceAction('realfiFlow.reset', true);

  const review =
    flowState.status === 'ReviewingTransaction' ? flowState.review : undefined;
  const isPreparing = flowState.status === 'Preparing';

  // Verbose inline failure directly below the swap inputs (like the swap
  // center's input errors, replacing the old quote-failed toast): the flow's
  // Error state carries the provider/SDK message, shown raw only when it is
  // short human-readable text — key-like or dump-like details fall back to the
  // heading alone.
  const flowErrorDisplay = useMemo(() => {
    if (flowState.status !== 'Error') return undefined;
    // Compliance-gate failures get RealFi's state-specific copy (under review /
    // can't process / service unreachable) instead of the raw handshake text.
    const compliance = complianceMessagingFor(flowState.errorCode);
    if (compliance) {
      return `${t(compliance.titleKey)}. ${t(compliance.bodyKey)}`;
    }
    const heading = t(
      flowState.previousStatus === 'Preparing'
        ? 'realfi.manage.quote-failed'
        : 'realfi.manage.tx-failed',
    );
    const detail = sanitizeErrorDetail(flowState.errorDetail);
    return detail === undefined ? heading : `${heading}: ${detail}`;
  }, [flowState, t]);

  const inputDecimals = payTokenOption.decimals;
  const amountBaseUnits = useMemo(() => {
    const value = Number(amount);
    if (!amount || !Number.isFinite(value) || value <= 0) return undefined;
    const baseUnits = Math.round(value * 10 ** inputDecimals);
    // A sub-base-unit entry (e.g. "0.0000001" at 6 decimals) rounds to 0 —
    // treat it as no amount instead of quoting for zero (the string "0" is
    // truthy, so a truthiness gate alone would dispatch a nonsense quote).
    if (baseUnits <= 0) return undefined;
    return String(baseUnits);
  }, [amount, inputDecimals]);

  const isInsufficientFunds = useMemo(() => {
    if (payTokenOption.available === undefined || !amountBaseUnits) {
      return false;
    }
    try {
      return BigInt(amountBaseUnits) > BigInt(payTokenOption.available);
    } catch {
      return false;
    }
  }, [payTokenOption.available, amountBaseUnits]);

  // The bundled order needs ADA beyond the picked asset (swap-leg scooper fee +
  // route deposit, or the order min-ADA, plus tx-fee/change headroom). Catch a
  // too-thin ADA balance at the estimate — otherwise the build fails with
  // "Insufficient ADA" only after Confirm. The picked asset's own balance is
  // covered by isInsufficientFunds above.
  const isInsufficientAda = useMemo(() => {
    if (!amountBaseUnits || !realfiConfig) return false;
    const isPickedUsdr = pickedToken.tokenId === usdrTokenId;
    const swapRiders =
      BigInt(realfiConfig.maxScooperFeeLovelace) + ROUTE_DEPOSIT_LOVELACE;
    // Stake: swap-path orders carry the riders, direct-USDr orders the min-ADA.
    // Unstake: min-ADA only — the output is locked to USDr (no swap-back leg),
    // so charging the swap riders here would block low-ADA users from a
    // withdrawal that costs nothing but the order min-ADA. `pickedToken` is the
    // stake tab's picker and means nothing on unstake.
    const orderAda =
      isUnstake || isPickedUsdr ? ORDER_MIN_ADA_LOVELACE : swapRiders;
    const offeredAda =
      !isUnstake && pickedToken.tokenId === LOVELACE_TOKEN_ID
        ? BigInt(amountBaseUnits)
        : 0n;
    try {
      return (
        BigInt(adaOption.available ?? '0') <
        orderAda + offeredAda + FEE_AND_CHANGE_HEADROOM_LOVELACE
      );
    } catch {
      return false;
    }
  }, [
    amountBaseUnits,
    realfiConfig,
    pickedToken.tokenId,
    usdrTokenId,
    isUnstake,
    adaOption.available,
  ]);

  // Latest flow status, read through a ref so the re-quote effect can guard on it
  // WITHOUT listing it as a dependency — otherwise each quote's own status
  // transition (Preparing → Reviewing) would re-run the effect and re-quote,
  // looping the SundaeSwap pool query and flickering the UI.
  const flowStatusRef = useRef<{
    status: typeof flowState.status;
    previousStatus?: string;
  }>({ status: flowState.status });
  useEffect(() => {
    flowStatusRef.current = {
      status: flowState.status,
      previousStatus:
        flowState.status === 'Error' ? flowState.previousStatus : undefined,
    };
  }, [flowState]);
  // States the re-quote effect must never disturb: an active tx, and a tx
  // failure presented in the ERROR SHEET on top of this one — resetting
  // beneath the sheet blanks its copy and sends its Try again into Idle,
  // where `retryRequested` is ignored (it is only handled in Error). A
  // Preparing-origin (quote) error renders inline HERE, so input changes
  // must keep re-quoting it — that is the recovery path.
  const isFlowUntouchable = (current: {
    status: string;
    previousStatus?: string;
  }): boolean =>
    current.status === 'SigningTransaction' ||
    current.status === 'SubmittingTransaction' ||
    current.status === 'Queued' ||
    (current.status === 'Error' &&
      (current.previousStatus === 'SigningTransaction' ||
        current.previousStatus === 'SubmittingTransaction'));

  // Re-quote ONLY when the actual inputs change (amount/tab/account/token) —
  // one pool query per change. reset() → Idle so the machine re-enters Preparing
  // and the quote side-effect fires again.
  //
  // GUARD: once the user has moved past quoting (signing / submitting / queued,
  // or a tx error under the error sheet), do NOT reset — resetting knocks the
  // machine out of the state its consumer needs. The guard reads the ref
  // (latest status) so it doesn't itself re-trigger the effect.
  useEffect(() => {
    if (!selectedAccountId) return undefined;
    if (isFlowUntouchable(flowStatusRef.current)) {
      return undefined;
    }
    // Invalidate the standing quote NOW, not inside the timer: the CTA is
    // gated on `review`, so leaving the old review alive for the debounce
    // window lets a quote for the previous inputs through to Review/signing.
    resetFlow();
    if (!amountBaseUnits || isInsufficientFunds) {
      return undefined;
    }
    const handle = setTimeout(() => {
      // The machine may have moved while the timer was pending (e.g. a balance
      // tick re-ran this effect mid-flow) — never quote over an active tx.
      if (isFlowUntouchable(flowStatusRef.current)) {
        return;
      }
      prepare({
        kind: tab,
        accountId: selectedAccountId,
        inputAmount: amountBaseUnits,
        // Stake: input = picked token. Unstake: input = sUSDr. The output is
        // always USDr (stake routes through it; unstake is locked to it).
        inputTokenId:
          tab === 'unstake' ? susdrTokenId ?? '' : selectedInputTokenId,
        outputTokenId: usdrTokenId ?? '',
      });
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      clearTimeout(handle);
    };
  }, [
    tab,
    selectedAccountId,
    amountBaseUnits,
    isInsufficientFunds,
    selectedInputTokenId,
    prepare,
    resetFlow,
    usdrTokenId,
    susdrTokenId,
  ]);

  const estimatedOutput = review
    ? formatAmountToLocale(review.estimatedOutput, receiveDecimals)
    : '';

  // Rate unit per tab: stake quotes are input-per-sUSDr (the picked token);
  // unstake quotes are the vault's USDr-per-sUSDr rate — `pickedToken` is the
  // STAKE tab's picker and means nothing on unstake (it would label the USDr
  // rate "ADA", disagreeing with the review sheet's live vault rate,
  // LW-14681).
  const exchangeRateDisplay = review
    ? t('realfi.manage.exchange-rate-value', {
        rate: formatLocaleNumber(String(review.quote.exchangeRate), 4),
        unit: isUnstake ? USDR_TICKER : pickedToken.name,
      })
    : '—';
  const priceImpactDisplay = priceImpactLine(
    review,
    usdToCurrencyRate,
    currency.ticker,
  );
  // Estimated fee: lovelace network fee + the service fee, each shown in its
  // charged denomination (swap-input token on stake, USDr on unstake) so no
  // missing price can dash or mislabel a known amount — shared with the
  // Review sheet (useReviewFeePricing).
  const { networkFee, serviceFee, serviceFeeToken } = useReviewFeePricing({
    review,
    accountFungibleTokens,
    usdrTokenId,
  });
  const { feeDisplay, feeFiatDisplay } = estimatedFeeLines({
    hasReview: review !== undefined,
    serviceFeeTokenId: review?.serviceFeeTokenId,
    usdrTokenId,
    serviceFeeToken,
    networkFee,
    serviceFee,
    currencyTicker: currency.ticker,
    adaTicker,
  });

  // --- CTAs ---
  const onStake = useCallback(() => {
    if (!review) return;
    // The funnel's "initiated" (LW-15494): the user committed to an attempt by
    // opening Review — quoting while typing is not an attempt, so the
    // debounced prepareRequested is deliberately not the trigger.
    trackEvent(
      tab === 'unstake'
        ? 'realfi | usdr unstake | initiated'
        : 'realfi | usdr stake | initiated',
      { tx_type: tab },
    );
    NavigationControls.navigate(SheetRoutes.RealFiReviewTransaction);
  }, [review, tab, trackEvent]);

  const onCancel = useCallback(() => {
    resetFlow();
    NavigationControls.closeSheet();
  }, [resetFlow]);

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('realfi.manage.title')}
          leftIconOnPress={navigation.goBack}
        />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: t('realfi.manage.cancel'),
            onPress: onCancel,
          }}
          primaryButton={{
            label:
              tab === 'stake'
                ? t('realfi.manage.stake-tab')
                : t('realfi.manage.unstake-tab'),
            onPress: onStake,
            disabled: !review || isInsufficientFunds || isInsufficientAda,
            loading: isPreparing,
          }}
        />
      ),
    });
  }, [
    navigation,
    t,
    onStake,
    onCancel,
    review,
    isPreparing,
    isInsufficientFunds,
    isInsufficientAda,
    tab,
  ]);

  const infoRows = [
    {
      key: 'price-impact',
      label: t('realfi.manage.price-impact'),
      value: priceImpactDisplay,
    },
    {
      key: 'exchange-rate',
      label: t('realfi.manage.exchange-rate'),
      value: exchangeRateDisplay,
    },
    {
      key: 'estimated-fee',
      label: t('realfi.manage.estimated-fee'),
      value: feeDisplay,
      fiat: feeFiatDisplay,
    },
    // The 7-day unbonding cooldown applies to unstaking only.
    ...(isUnstake
      ? [
          {
            key: 'cooldown-row',
            label: t('realfi.manage.cooldown-period'),
            // Live time until the boundary this unstake's timelock would
            // carry. A boundary already passed is stale (its successor wasn't
            // fetched yet) → the static nominal copy, never a false "soon".
            value:
              cooldownUnlockAtMs !== undefined &&
              cooldownUnlockAtMs > Date.now()
                ? formatCooldownRemaining(cooldownUnlockAtMs - Date.now(), t)
                : t('realfi.manage.cooldown-value'),
          },
        ]
      : []),
  ];

  return (
    <Sheet.Scroll contentContainerStyle={styles.scrollContent}>
      <Column gap={spacing.L}>
        <DropdownMenu
          items={accountDropdownItems}
          title={selectedAccount?.walletName ?? ''}
          titleSubText={selectedAccount?.accountName ?? ''}
          actionText={`${adaBalanceDisplay} ${adaTicker}`}
          selectedItemId={selectedAccountId}
          onSelectItem={handleAccountChange}
          truncateText
          testID="realfi-manage-account-selector"
        />

        <Divider />

        <Tabs
          tabs={stakeTabs}
          value={tab}
          onChange={value => {
            setTab(value);
            setAmount('');
            // Reset the stake input pick to its ADA default (unstake has no
            // pick: sUSDr in, USDr out).
            selectInputToken({ tokenId: LOVELACE_TOKEN_ID });
          }}
        />

        <Column gap={0}>
          <SwapInput
            placeholder={t('realfi.manage.select-token')}
            token={payToken}
            label={
              isUnstake
                ? t('realfi.manage.unstake-amount')
                : t('realfi.manage.stake-amount')
            }
            balanceHint={
              isUnstake
                ? t('realfi.manage.staked-hint', { balance: payToken.balance })
                : t('realfi.manage.available-hint', {
                    balance: payToken.balance,
                  })
            }
            amount={amount}
            error={
              isInsufficientFunds
                ? t('realfi.manage.insufficient-funds')
                : undefined
            }
            // Stake: tapping the token opens the select-token sheet. Unstake:
            // pay is fixed sUSDr, no picker.
            onTokenPress={isUnstake ? undefined : openTokenSelect}
            onAmountChange={setAmount}
            // ADA is the fee token — Half/Max would leave nothing for fees, so
            // only offer them for non-ADA pay tokens (stablecoins / sUSDr).
            quickActions={
              payTokenOption.tokenId === LOVELACE_TOKEN_ID
                ? undefined
                : payQuickActions
            }
            testID="realfi-manage-pay-input"
          />

          <View style={styles.arrowContainer}>
            <View style={styles.arrow}>
              <Icon name="ArrowDown" size={16} color={theme.text.primary} />
            </View>
          </View>

          <SwapInput
            placeholder={SUSDR_TICKER}
            token={receiveToken}
            amount={estimatedOutput}
            disabled
            testID="realfi-manage-receive-input"
          />
        </Column>

        {flowErrorDisplay !== undefined && (
          <Text.XS
            weight="medium"
            style={styles.errorText}
            testID="realfi-manage-flow-error">
            {flowErrorDisplay}
          </Text.XS>
        )}

        {shouldShowBonusCallout && <RPointsBonusCallout />}

        <Column gap={spacing.L} style={styles.info}>
          {infoRows.map(row => (
            <React.Fragment key={row.key}>
              <Divider />
              <Row justifyContent="space-between" alignItems="center">
                <Text.XS variant="secondary" weight="medium">
                  {row.label}
                </Text.XS>
                <Column alignItems="flex-end">
                  <Text.XS weight="medium" testID={`realfi-manage-${row.key}`}>
                    {row.value}
                  </Text.XS>
                  {row.fiat !== undefined && (
                    <Text.XS variant="secondary">{row.fiat}</Text.XS>
                  )}
                </Column>
              </Row>
            </React.Fragment>
          ))}
          {isInsufficientAda && (
            <>
              <Divider />
              <Text.XS
                weight="medium"
                style={styles.errorText}
                testID="realfi-manage-insufficient-ada">
                {t('realfi.manage.insufficient-ada')}
              </Text.XS>
            </>
          )}
        </Column>
      </Column>
    </Sheet.Scroll>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    // Sheet.Scroll applies its own padding; add footer height at the bottom so
    // the info rows (and insufficient-ADA note) clear the pinned action footer
    // instead of being hidden behind it when the form overflows the window.
    scrollContent: {
      paddingBottom: footerHeight.horizontal,
    },
    errorText: {
      color: theme.background.negative,
    },
    arrowContainer: {
      alignItems: 'center',
      zIndex: 1,
      marginVertical: -spacing.S,
    },
    arrow: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.background.primary,
      borderWidth: 1,
      borderColor: theme.border.middle,
      justifyContent: 'center',
      alignItems: 'center',
    },
    info: {
      paddingVertical: spacing.S,
    },
  });
