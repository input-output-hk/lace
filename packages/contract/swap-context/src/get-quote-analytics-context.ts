import type { SwapQuote } from '@lace-contract/swap-provider';

/**
 * Extracts analytics fields common to every swap funnel event so PostHog
 * dashboards can segment "which provider filled the trade" and "which DEX
 * hops the router chose" without redoing the lookup at each call site.
 */
export const getQuoteAnalyticsContext = (quote: SwapQuote) => ({
  selectedProvider: quote.providerId,
  routeDexes: quote.route.map(leg => leg.dexName),
});
