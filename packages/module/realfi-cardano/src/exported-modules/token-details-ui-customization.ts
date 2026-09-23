import {
  MAINNET_REALFI_CONFIG,
  PREPROD_REALFI_CONFIG,
  PREVIEW_REALFI_CONFIG,
} from '@lace-contract/realfi-staking';
import { createUICustomisation } from '@lace-lib/util-render';
import React from 'react';

import { TokenDetailManageStake } from '../components/TokenDetailManageStake';

import type { TokenDetailsUICustomization } from '@lace-contract/app';
import type { Token } from '@lace-contract/tokens';

// The selector runs without Redux/flag access (like the Staking Center card
// addon), so it matches USDr on every configured network; the component
// re-guards on the live active-network config before rendering.
const USDR_TOKEN_IDS = new Set<string>(
  [PREVIEW_REALFI_CONFIG, PREPROD_REALFI_CONFIG, MAINNET_REALFI_CONFIG].map(
    config => config.usdrTokenId,
  ),
);

/** True when the token is a configured network's USDr (LW-14650 entry point). */
export const isUsdrToken = (token: Token): boolean =>
  USDR_TOKEN_IDS.has(String(token.tokenId));

const ManageStakeContent = ({ token }: { token: Token }) =>
  React.createElement(TokenDetailManageStake, {
    tokenId: String(token.tokenId),
  });

const loadTokenDetailsUICustomisations = () =>
  createUICustomisation<TokenDetailsUICustomization>({
    key: 'realfi-usdr',
    uiCustomisationSelector: isUsdrToken,
    getTagConfig: () => undefined,
    // Rendered immediately above the token's activity list — the USDr Token
    // Detail's "Manage Stake" entry into the staking flow.
    RecentTransactionsContent: ManageStakeContent,
  });

export default loadTokenDetailsUICustomisations;
