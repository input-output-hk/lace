import { combineLatest, distinctUntilChanged, filter, map } from 'rxjs';

import { cardanoNetworkMagicToNetworkType } from '../../cardano-network-id-to-network-type';
import { LOVELACE_TOKEN_ID } from '../../const';
import { getAdaTokenTickerByNetwork } from '../../get-ada-token-ticker-by-network';

import type { SideEffect } from '../../contract';

/**
 * Keeps stored lovelace metadata ticker aligned with the active Cardano chain.
 *
 * {@link trackTokenMetadata} only fetches metadata once per token id; lovelace is shared across
 * networks, so a testnet session can persist `tADA` while the user is on mainnet (or vice versa).
 */
export const syncLovelaceTokenTickerWithChain: SideEffect = (
  _,
  { cardanoContext: { selectChainId$ }, tokens: { selectTokensMetadata$ } },
  { actions },
) =>
  combineLatest([
    selectChainId$.pipe(
      filter(Boolean),
      distinctUntilChanged(
        (previous, next) => previous.networkMagic === next.networkMagic,
      ),
    ),
    selectTokensMetadata$,
  ]).pipe(
    map(([chainId, byTokenId]) => {
      const lovelaceMeta = byTokenId[LOVELACE_TOKEN_ID];
      if (!lovelaceMeta) return null;

      const ticker = getAdaTokenTickerByNetwork(
        cardanoNetworkMagicToNetworkType(chainId.networkMagic),
      );
      if (lovelaceMeta.ticker === ticker) return null;

      return actions.tokens.upsertTokenMetadata({
        ...lovelaceMeta,
        ticker,
      });
    }),
    filter((action): action is NonNullable<typeof action> => action !== null),
  );
